import { Injectable, Logger } from '@nestjs/common';

export interface IConnectorHandler {
  executeAction(capability: string, payload: any): Promise<any>;
}

@Injectable()
export class ConnectorRegistry {
  private readonly logger = new Logger(ConnectorRegistry.name);
  private handlers = new Map<string, IConnectorHandler>();

  public register(connectorType: string, handler: IConnectorHandler): void {
    this.logger.log(`Registering custom connector handler for type: ${connectorType}`);
    this.handlers.set(connectorType, handler);
  }

  public getHandler(connectorType: string): IConnectorHandler | undefined {
    return this.handlers.get(connectorType);
  }

  public hasHandler(connectorType: string): boolean {
    return this.handlers.has(connectorType);
  }
}
