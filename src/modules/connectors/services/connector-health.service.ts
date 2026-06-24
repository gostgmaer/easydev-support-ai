import { Injectable, Inject, Logger } from '@nestjs/common';
import axios from 'axios';
import * as dns from 'dns';
import * as net from 'net';
import type { IConnectorRepository } from '../repositories/connector-repository.interface';
import { Connector } from '../domain/connector.aggregate';
import { ConnectorEventPublisher } from './connector-event.publisher';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
]);

// IPv4 ranges that must never be reachable from a tenant-supplied connector
// URL: loopback, RFC1918 private space, link-local (this also covers the
// 169.254.169.254 cloud-metadata endpoint on AWS/GCP/Azure - the single
// highest-value SSRF target), CGNAT, and other IANA-reserved blocks.
const BLOCKED_IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function ipv4ToInt(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

function isBlockedIpv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  return BLOCKED_IPV4_RANGES.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (-1 << (32 - prefix)) >>> 0;
    return (ipInt & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:') || normalized.startsWith('fe8')) return true; // link-local
  if (/^fc[0-9a-f]{2}:|^fd[0-9a-f]{2}:/.test(normalized)) return true; // unique local fc00::/7
  // IPv4-mapped (::ffff:a.b.c.d) - unwrap and check the embedded IPv4.
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

@Injectable()
export class ConnectorHealthService {
  private readonly logger = new Logger(ConnectorHealthService.name);

  constructor(
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
    private readonly eventPublisher: ConnectorEventPublisher,
  ) {}

  public async checkHealth(
    tenantId: string,
    connectorId: string,
  ): Promise<boolean> {
    this.logger.log(
      `Checking health for connector ${connectorId} under tenant ${tenantId}`,
    );

    const connector = await this.repository.findById(connectorId, tenantId);
    if (!connector) {
      this.logger.warn(
        `Connector ${connectorId} not found during health check`,
      );
      return false;
    }

    const isHealthy = await this.probeConnector(connector);

    if (isHealthy) {
      connector.recordHealthy();
      this.logger.debug(`Connector ${connector.name} is HEALTHY`);
    } else {
      connector.recordUnhealthy(
        'Ping check failed: Connection refused or timeout',
      );
      this.logger.warn(`Connector ${connector.name} is UNHEALTHY`);
    }

    await this.repository.save(connector, tenantId);
    await this.eventPublisher.publishAll(connector.domainEvents);
    connector.clearEvents();

    return isHealthy;
  }

  public async runHealthSweep(limit = 20): Promise<void> {
    this.logger.log(
      `Running periodic connector health sweep (limit: ${limit})`,
    );

    // Pass undefined tenantId to find active connectors across all tenants
    const connectors = await this.repository.findActiveForHealthSweep(
      undefined,
      limit,
    );

    for (const connector of connectors) {
      try {
        await this.checkHealth(connector.tenantId, connector.id);
      } catch (err: any) {
        this.logger.error(
          `Error during health check sweep for connector ${connector.id}: ${err.message}`,
        );
      }
    }
  }

  /**
   * SSRF guard: a tenant-supplied connector.baseUrl is fetched by this
   * server's own network position on every health sweep, across all
   * tenants. Resolves the hostname and rejects loopback/private/link-local
   * targets (including the cloud-metadata endpoint at 169.254.169.254)
   * before the probe request is allowed to fire.
   */
  private async assertSafeProbeTarget(rawUrl: string): Promise<void> {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Blocked probe: unsupported protocol ${parsed.protocol}`);
    }

    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      throw new Error(`Blocked probe: disallowed hostname ${hostname}`);
    }

    if (net.isIP(hostname)) {
      const blocked = net.isIP(hostname) === 6 ? isBlockedIpv6(hostname) : isBlockedIpv4(hostname);
      if (blocked) {
        throw new Error(`Blocked probe: target IP ${hostname} is in a reserved/private range`);
      }
      return;
    }

    const addresses = await dns.promises.lookup(hostname, { all: true });
    for (const { address, family } of addresses) {
      const blocked = family === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address);
      if (blocked) {
        throw new Error(
          `Blocked probe: ${hostname} resolves to reserved/private address ${address}`,
        );
      }
    }
  }

  private async probeConnector(connector: Connector): Promise<boolean> {
    if (!connector.baseUrl) {
      return true; // Webhook-only or no base URL configured is healthy by default
    }

    try {
      await this.assertSafeProbeTarget(connector.baseUrl);
    } catch (err: any) {
      this.logger.warn(
        `Refusing to probe connector ${connector.id} base url ${connector.baseUrl}: ${err.message}`,
      );
      return false;
    }

    // Attempt to ping the base URL
    try {
      await axios.get(connector.baseUrl, {
        timeout: 5000,
        headers: { 'User-Agent': 'EasyDev-Support-AI-HealthProbe' },
        validateStatus: () => true, // Accept any status code (since 401/403/404 means the server responded)
        maxRedirects: 0, // A redirect to an internal target must not be followed automatically.
      });
      return true;
    } catch (err: any) {
      this.logger.debug(
        `Probe failed for connector base url ${connector.baseUrl}: ${err.message}`,
      );
      return false;
    }
  }
}
