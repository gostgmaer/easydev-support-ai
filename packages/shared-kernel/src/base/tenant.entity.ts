import { AggregateRoot } from '../ddd/aggregate-root';

export abstract class TenantEntity extends AggregateRoot<string> {
  public name!: string;
  public slug!: string;
  public createdAt: Date = new Date();
}
