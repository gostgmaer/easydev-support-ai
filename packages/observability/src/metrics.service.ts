import { Injectable, Logger } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // Core HTTP metrics
  private readonly httpRequestCounter: promClient.Counter<string>;
  private readonly httpRequestDuration: promClient.Histogram<string>;

  // Queue and Workers metrics
  private readonly queueBacklogGauge: promClient.Gauge<string>;
  private readonly queueThroughputCounter: promClient.Counter<string>;
  private readonly queueFailureCounter: promClient.Counter<string>;

  // Database metrics
  private readonly dbQueryDuration: promClient.Histogram<string>;

  // Cache metrics
  private readonly cacheHitCounter: promClient.Counter<string>;
  private readonly cacheMissCounter: promClient.Counter<string>;

  // AI & Token costs metrics
  private readonly aiCostCounter: promClient.Counter<string>;
  private readonly aiFailureCounter: promClient.Counter<string>;

  // Connector metrics
  private readonly connectorFailureCounter: promClient.Counter<string>;
  private readonly connectorExecutionDuration: promClient.Histogram<string>;

  // WebSocket connections metric
  private readonly websocketActiveConnections: promClient.Gauge<string>;

  // System resource utilization
  private readonly cpuUsageGauge: promClient.Gauge<string>;
  private readonly memoryUsageGauge: promClient.Gauge<string>;

  constructor() {
    // Enable default metrics collection (CPU, Memory, Event Loop)
    promClient.collectDefaultMetrics({ register: promClient.register });

    this.httpRequestCounter = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests processed',
      labelNames: ['method', 'route', 'status_code', 'tenant_id'],
    });

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code', 'tenant_id'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    });

    this.queueBacklogGauge = new promClient.Gauge({
      name: 'queue_backlog_total',
      help: 'Number of jobs currently waiting or delayed in BullMQ',
      labelNames: ['queue_name'],
    });

    this.queueThroughputCounter = new promClient.Counter({
      name: 'queue_throughput_total',
      help: 'Total processed BullMQ jobs count',
      labelNames: ['queue_name', 'job_name', 'status'],
    });

    this.queueFailureCounter = new promClient.Counter({
      name: 'queue_failures_total',
      help: 'Total failed BullMQ jobs count',
      labelNames: ['queue_name', 'job_name'],
    });

    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query execution time in seconds',
      labelNames: ['table_name', 'operation_type'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    });

    this.cacheHitCounter = new promClient.Counter({
      name: 'cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['tenant_id', 'namespace'],
    });

    this.cacheMissCounter = new promClient.Counter({
      name: 'cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['tenant_id', 'namespace'],
    });

    this.aiCostCounter = new promClient.Counter({
      name: 'ai_cost_dollars_total',
      help: 'Estimated accumulative cost of AI requests in dollars',
      labelNames: ['tenant_id', 'model_name'],
    });

    this.aiFailureCounter = new promClient.Counter({
      name: 'ai_failures_total',
      help: 'Total AI Platform execution failures',
      labelNames: ['tenant_id', 'model_name', 'error_type'],
    });

    this.connectorFailureCounter = new promClient.Counter({
      name: 'connector_failures_total',
      help: 'Total connector webhook delivery failures',
      labelNames: ['tenant_id', 'connector_type'],
    });

    this.connectorExecutionDuration = new promClient.Histogram({
      name: 'connector_execution_duration_seconds',
      help: 'Connector webhook execute time in seconds',
      labelNames: ['tenant_id', 'connector_type'],
      buckets: [0.1, 0.5, 1, 3, 5, 10],
    });

    this.websocketActiveConnections = new promClient.Gauge({
      name: 'websocket_connections_active',
      help: 'Number of concurrent websocket connections',
      labelNames: ['tenant_id', 'namespace'],
    });

    this.cpuUsageGauge = new promClient.Gauge({
      name: 'system_cpu_usage_percentage',
      help: 'Host machine CPU utilization percentage',
    });

    this.memoryUsageGauge = new promClient.Gauge({
      name: 'system_memory_usage_bytes',
      help: 'Host machine Memory utilization bytes',
    });

    // Populate system stats periodically. CPU is a real delta-sampled
    // percentage (process.cpuUsage() between ticks), not the placeholder
    // `Math.random() * 100` this used to report - the HighCpuUsage alert in
    // alert-rules.yml was firing/not-firing on random noise, never real load.
    let lastCpuUsage = process.cpuUsage();
    let lastSampleAt = Date.now();
    const SAMPLE_INTERVAL_MS = 15000;
    setInterval(() => {
      const memory = process.memoryUsage();
      this.memoryUsageGauge.set(memory.heapUsed);

      const currentCpuUsage = process.cpuUsage();
      const now = Date.now();
      const elapsedMs = now - lastSampleAt;
      const cpuTimeUsedMicros =
        currentCpuUsage.user -
        lastCpuUsage.user +
        (currentCpuUsage.system - lastCpuUsage.system);
      // cpuTimeUsedMicros is split across all CPU cores under load; clamp to
      // 100% per-core-normalized rather than letting a multi-core busy process
      // report >100%, which would otherwise be a confusing gauge value.
      const cpuPercent =
        elapsedMs > 0
          ? Math.min(100, (cpuTimeUsedMicros / 1000 / elapsedMs) * 100)
          : 0;
      this.cpuUsageGauge.set(cpuPercent);

      lastCpuUsage = currentCpuUsage;
      lastSampleAt = now;
    }, SAMPLE_INTERVAL_MS);
  }

  // --- API request tracking ---
  recordHttpRequest(
    tenantId: string,
    method: string,
    route: string,
    statusCode: string,
    durationSeconds: number,
  ) {
    this.httpRequestCounter.labels(method, route, statusCode, tenantId).inc();
    this.httpRequestDuration
      .labels(method, route, statusCode, tenantId)
      .observe(durationSeconds);
  }

  // --- Queue backlog monitoring ---
  setQueueBacklog(queueName: string, backlogCount: number) {
    this.queueBacklogGauge.labels(queueName).set(backlogCount);
  }

  recordQueueJob(
    queueName: string,
    jobName: string,
    status: 'completed' | 'failed',
  ) {
    this.queueThroughputCounter.labels(queueName, jobName, status).inc();
    if (status === 'failed') {
      this.queueFailureCounter.labels(queueName, jobName).inc();
    }
  }

  // --- Database query latency tracking ---
  recordDbQuery(
    tableName: string,
    operationType: string,
    durationSeconds: number,
  ) {
    this.dbQueryDuration
      .labels(tableName, operationType)
      .observe(durationSeconds);
  }

  // --- Cache operations ---
  recordCacheHit(tenantId: string, namespace: string) {
    this.cacheHitCounter.labels(tenantId, namespace).inc();
  }

  recordCacheMiss(tenantId: string, namespace: string) {
    this.cacheMissCounter.labels(tenantId, namespace).inc();
  }

  // --- Cost controls & AI ---
  recordAiCall(
    tenantId: string,
    modelName: string,
    cost: number,
    success: boolean,
    errorType?: string,
  ) {
    if (success) {
      this.aiCostCounter.labels(tenantId, modelName).inc(cost);
    } else {
      this.aiFailureCounter
        .labels(tenantId, modelName, errorType || 'unknown')
        .inc();
    }
  }

  // --- Webhook / Connector metrics ---
  recordConnectorExecution(
    tenantId: string,
    connectorType: string,
    durationSeconds: number,
    success: boolean,
  ) {
    this.connectorExecutionDuration
      .labels(tenantId, connectorType)
      .observe(durationSeconds);
    if (!success) {
      this.connectorFailureCounter.labels(tenantId, connectorType).inc();
    }
  }

  // --- WebSockets presence ---
  incrementWebsocketConnection(tenantId: string, namespace: string) {
    this.websocketActiveConnections.labels(tenantId, namespace).inc();
  }

  decrementWebsocketConnection(tenantId: string, namespace: string) {
    this.websocketActiveConnections.labels(tenantId, namespace).dec();
  }

  // Expose metrics endpoint payload
  async getMetrics(): Promise<string> {
    return promClient.register.metrics();
  }
}
