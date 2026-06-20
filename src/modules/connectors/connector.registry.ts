import { Injectable, Logger } from '@nestjs/common';

export interface IConnector {
  executeAction(capability: string, payload: any): Promise<any>;
}

@Injectable()
export class ConnectorRegistry {
  private connectors = new Map<string, IConnector>();
  private readonly logger = new Logger(ConnectorRegistry.name);

  registerConnector(type: string, connector: IConnector) {
    this.logger.log(`Registering Connector: ${type}`);
    this.connectors.set(type, connector);
  }

  async execute(
    tenantId: string,
    type: string,
    capability: string,
    payload: any,
  ) {
    const connector = this.connectors.get(type);
    if (!connector) throw new Error(`Connector ${type} not found`);

    // In reality, fetch tenant's credentials from DB, pass them to connector
    return await connector.executeAction(capability, payload);
  }
}
