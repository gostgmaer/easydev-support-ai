import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectorRegistry } from './connector.registry';
import { Connector } from './entities/connector.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Connector])],
  providers: [ConnectorRegistry],
  exports: [ConnectorRegistry],
})
export class ConnectorsModule {}
