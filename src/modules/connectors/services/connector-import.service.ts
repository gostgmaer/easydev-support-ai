import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import type { IConnectorRepository } from '../repositories/connector-repository.interface';
import { ConnectorService } from './connector.service';
import { Connector } from '../domain/connector.aggregate';
import { ImportOpenApiDto } from '../dtos/connector.dto';
import { CapabilityTypeEnum, AuthTypeEnum } from '../domain/value-objects';

@Injectable()
export class ConnectorImportService {
  constructor(
    private readonly connectorService: ConnectorService,
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
  ) {}

  public async importOpenApi(
    tenantId: string,
    dto: ImportOpenApiDto,
  ): Promise<Connector> {
    const spec = dto.spec;
    if (!spec || (!spec.openapi && !spec.swagger)) {
      throw new BadRequestException('Invalid OpenAPI or Swagger spec format');
    }

    // 1. Discover baseUrl
    let baseUrl = '';
    if (spec.servers && spec.servers.length > 0) {
      baseUrl = spec.servers[0].url;
    } else if (spec.schemes && spec.host) {
      const scheme = spec.schemes[0] || 'https';
      const basePath = spec.basePath || '';
      baseUrl = `${scheme}://${spec.host}${basePath}`;
    }

    // 2. Discover Authentication Type
    let authType = AuthTypeEnum.NONE;
    const securitySchemes = spec.components?.securitySchemes || spec.securityDefinitions || {};
    
    for (const [key, value] of Object.entries<any>(securitySchemes)) {
      const type = value.type?.toLowerCase();
      const scheme = value.scheme?.toLowerCase();
      
      if (type === 'http' && scheme === 'bearer') {
        authType = AuthTypeEnum.BEARER;
        break;
      } else if (type === 'http' && scheme === 'basic') {
        authType = AuthTypeEnum.BASIC;
        break;
      } else if (type === 'apikey') {
        authType = AuthTypeEnum.API_KEY;
        break;
      } else if (type === 'oauth2') {
        authType = AuthTypeEnum.OAUTH2;
        break;
      }
    }

    // 3. Install the connector
    const connector = await this.connectorService.installConnector(tenantId, {
      name: dto.name,
      slug: dto.slug,
      connectorType: dto.connectorType,
      baseUrl,
      authType,
      description: spec.info?.description || spec.info?.title || 'Imported Connector',
      config: { openapi: { version: spec.openapi || spec.swagger } },
    });

    // 4. Discover Endpoints and Map Capabilities
    const mappedCapabilities: any[] = [];
    const paths = spec.paths || {};

    for (const [path, pathItem] of Object.entries<any>(paths)) {
      for (const [method, operation] of Object.entries<any>(pathItem)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          continue;
        }

        const summary = operation.summary || '';
        const description = operation.description || '';
        const operationId = operation.operationId || '';

        // Auto Map Capability Type
        const capabilityType = this.mapToCapabilityType(path, method, summary, operationId);

        // Discovery Request and Response Schemas
        const inputSchema = this.extractInputSchema(operation);
        const outputSchema = this.extractOutputSchema(operation);

        mappedCapabilities.push({
          capabilityType,
          name: operation.summary || operationId || `${method.toUpperCase()} ${path}`,
          description: operation.description || `Endpoint ${method.toUpperCase()} ${path}`,
          method: method.toUpperCase() as any,
          path,
          inputSchema,
          outputSchema,
        });
      }
    }

    // Map capabilities and save
    await this.connectorService.mapCapabilities(tenantId, connector.id, {
      capabilities: mappedCapabilities,
    });

    // Re-fetch with loaded capabilities
    return this.connectorService.getConnector(tenantId, connector.id);
  }

  private mapToCapabilityType(
    path: string,
    method: string,
    summary: string,
    operationId: string,
  ): CapabilityTypeEnum {
    const searchStr = `${path} ${summary} ${operationId}`.toLowerCase();

    if (searchStr.includes('track') || (searchStr.includes('order') && (searchStr.includes('status') || searchStr.includes('find')))) {
      return CapabilityTypeEnum.ORDER_TRACKING;
    }
    if (searchStr.includes('inventory') || searchStr.includes('stock') || searchStr.includes('warehouse')) {
      return CapabilityTypeEnum.INVENTORY_LOOKUP;
    }
    if (searchStr.includes('refund')) {
      return CapabilityTypeEnum.REFUND_REQUEST;
    }
    if (searchStr.includes('return')) {
      return CapabilityTypeEnum.RETURN_REQUEST;
    }
    if (searchStr.includes('product') && (searchStr.includes('search') || searchStr.includes('query') || searchStr.includes('list'))) {
      return CapabilityTypeEnum.PRODUCT_SEARCH;
    }
    if (searchStr.includes('product') && (searchStr.includes('detail') || searchStr.includes('get') || searchStr.includes('find'))) {
      return CapabilityTypeEnum.PRODUCT_DETAILS;
    }
    if (searchStr.includes('customer') || searchStr.includes('contact') || searchStr.includes('profile')) {
      return CapabilityTypeEnum.CUSTOMER_LOOKUP;
    }
    if (searchStr.includes('invoice') || searchStr.includes('billing')) {
      return CapabilityTypeEnum.INVOICE_LOOKUP;
    }
    if (searchStr.includes('payment') || searchStr.includes('charge') || searchStr.includes('transaction')) {
      return CapabilityTypeEnum.PAYMENT_LOOKUP;
    }
    if (searchStr.includes('appointment') || searchStr.includes('booking') || searchStr.includes('schedule')) {
      return CapabilityTypeEnum.APPOINTMENT_BOOKING;
    }
    if (searchStr.includes('lead') || searchStr.includes('deal') || searchStr.includes('opportunity')) {
      return CapabilityTypeEnum.LEAD_CREATION;
    }
    if (searchStr.includes('subscription') || searchStr.includes('membership')) {
      return CapabilityTypeEnum.SUBSCRIPTION_LOOKUP;
    }
    if (searchStr.includes('ticket') || searchStr.includes('case') || searchStr.includes('support')) {
      return CapabilityTypeEnum.TICKET_CREATION;
    }
    if (searchStr.includes('crm')) {
      return CapabilityTypeEnum.CRM_LOOKUP;
    }

    return CapabilityTypeEnum.CUSTOM_ACTION;
  }

  private extractInputSchema(operation: any): Record<string, any> {
    const schema: Record<string, any> = { type: 'object', properties: {} };

    // Extract path and query params
    if (operation.parameters) {
      for (const p of operation.parameters) {
        schema.properties[p.name] = {
          type: p.schema?.type || 'string',
          description: p.description || '',
          in: p.in,
        };
      }
    }

    // Extract request body schema (OpenAPI 3)
    const reqBodyContent = operation.requestBody?.content;
    if (reqBodyContent) {
      const jsonContent = reqBodyContent['application/json'];
      if (jsonContent?.schema) {
        schema.properties['body'] = jsonContent.schema;
      }
    }

    return schema;
  }

  private extractOutputSchema(operation: any): Record<string, any> {
    const successResponse = operation.responses?.['200'] || operation.responses?.['201'];
    if (successResponse?.content?.['application/json']?.schema) {
      return successResponse.content['application/json'].schema;
    }
    return { type: 'object' };
  }
}
