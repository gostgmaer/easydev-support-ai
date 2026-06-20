import { Connector } from '../domain/connector.aggregate';
import { ConnectorCapability } from '../domain/connector-capability.entity';
import { ConnectorInstance } from '../domain/connector-instance.entity';
import {
  ConnectorType,
  ConnectorTypeEnum,
  ConnectorStatus,
  ConnectorStatusEnum,
  AuthTypeEnum,
  CapabilityType,
  CapabilityTypeEnum,
  HealthStatusEnum,
} from '../domain/value-objects';
import { CircuitBreaker, CircuitState } from '../domain/circuit-breaker';

describe('Connector Domain Model', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const connectorId = '22222222-2222-2222-2222-222222222222';

  describe('Value Objects', () => {
    it('should create valid ConnectorType', () => {
      const type = ConnectorType.create(ConnectorTypeEnum.SHOPIFY);
      expect(type.value).toBe(ConnectorTypeEnum.SHOPIFY);
    });

    it('should throw on invalid ConnectorType', () => {
      expect(() => ConnectorType.create('INVALID' as any)).toThrow();
    });

    it('should create valid CapabilityType', () => {
      const type = CapabilityType.create(CapabilityTypeEnum.ORDER_TRACKING);
      expect(type.value).toBe(CapabilityTypeEnum.ORDER_TRACKING);
    });
  });

  describe('Connector Aggregate', () => {
    it('should instantiate and publish create event', () => {
      const connector = Connector.create(connectorId, {
        tenantId,
        name: 'Shopify Integration',
        slug: 'shopify-int',
        connectorType: ConnectorType.create(ConnectorTypeEnum.SHOPIFY),
        authType: AuthTypeEnum.OAUTH2,
        status: ConnectorStatus.create(ConnectorStatusEnum.DRAFT),
      });

      expect(connector.id).toBe(connectorId);
      expect(connector.status.value).toBe(ConnectorStatusEnum.DRAFT);
      expect(connector.domainEvents.length).toBe(1);
      expect(connector.domainEvents[0].constructor.name).toBe(
        'ConnectorCreatedEvent',
      );
    });

    it('should handle activation and status transitions', () => {
      const connector = Connector.create(connectorId, {
        tenantId,
        name: 'Shopify Integration',
        slug: 'shopify-int',
        connectorType: ConnectorType.create(ConnectorTypeEnum.SHOPIFY),
        authType: AuthTypeEnum.OAUTH2,
        status: ConnectorStatus.create(ConnectorStatusEnum.DRAFT),
      });

      connector.activate();
      expect(connector.status.value).toBe(ConnectorStatusEnum.ACTIVE);

      connector.pause();
      expect(connector.status.value).toBe(ConnectorStatusEnum.PAUSED);

      connector.disable();
      expect(connector.status.value).toBe(ConnectorStatusEnum.DISABLED);
    });

    it('should add capabilities correctly', () => {
      const connector = Connector.create(connectorId, {
        tenantId,
        name: 'Shopify Integration',
        slug: 'shopify-int',
        connectorType: ConnectorType.create(ConnectorTypeEnum.SHOPIFY),
        authType: AuthTypeEnum.OAUTH2,
        status: ConnectorStatus.create(ConnectorStatusEnum.DRAFT),
      });

      const capability = new ConnectorCapability('cap-id-1', {
        tenantId,
        connectorId,
        capabilityType: CapabilityType.create(
          CapabilityTypeEnum.ORDER_TRACKING,
        ),
        name: 'Track Order',
        method: 'GET',
        path: '/orders/{id}',
      });

      connector.addCapability(capability);
      expect(connector.capabilities.length).toBe(1);
      expect(connector.capabilities[0].name).toBe('Track Order');
    });
  });

  describe('Circuit Breaker', () => {
    it('should transition state on failures', () => {
      const cb = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 1,
        resetTimeoutMs: 1000,
      });

      expect(cb.currentState).toBe(CircuitState.CLOSED);
      expect(cb.canRequest()).toBe(true);

      cb.recordFailure();
      expect(cb.currentState).toBe(CircuitState.CLOSED);

      cb.recordFailure();
      expect(cb.currentState).toBe(CircuitState.OPEN);
      expect(cb.canRequest()).toBe(false);
    });
  });
});
