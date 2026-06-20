import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ConnectorRegistryService } from './connector-registry.service';

@Injectable()
export class ConnectorExecutorService {
  private readonly logger = new Logger(ConnectorExecutorService.name);

  constructor(private readonly registry: ConnectorRegistryService) {}

  async executeCapability(tenantId: string, capabilityName: string, params: Record<string, any>) {
    this.logger.log(`Executing Connector Capability ${capabilityName} for Tenant ${tenantId}`);

    const config = await this.registry.getCapabilityEndpoint(tenantId, capabilityName);
    
    if (!config) {
      throw new HttpException('Connector Capability not configured', HttpStatus.BAD_REQUEST);
    }

    try {
      // 1. Prepare Request (Handle URL parameter substitution, e.g., {id} -> ORD-123)
      let resolvedEndpoint = config.endpoint;
      for (const [key, value] of Object.entries(params)) {
        resolvedEndpoint = resolvedEndpoint.replace(`{${key}}`, String(value));
      }

      // 2. Prepare Auth Headers
      const headers = this.buildHeaders(config.credentials);

      // 3. Execute HTTP Call
      const response = await axios.get(resolvedEndpoint, { headers, timeout: 5000 });

      this.logger.debug(`Connector ${capabilityName} executed successfully`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Connector Execution Failed: ${error.message}`);
      
      // We return the error rather than throwing, so the AI can decide how to handle the failure gracefully
      return { error: 'External API execution failed', details: error.response?.data || error.message };
    }
  }

  private buildHeaders(credentials: any): Record<string, string> {
    if (credentials.authType === 'Bearer') {
      return { 'Authorization': `Bearer ${credentials.token}` };
    }
    if (credentials.authType === 'Basic') {
      const b64 = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
      return { 'Authorization': `Basic ${b64}` };
    }
    if (credentials.authType === 'ApiKey') {
      return { [credentials.headerName]: credentials.apiKeyValue };
    }
    return {};
  }
}
