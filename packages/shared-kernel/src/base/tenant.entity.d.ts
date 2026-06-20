import { AggregateRoot } from '../ddd/aggregate-root';
export declare abstract class TenantEntity extends AggregateRoot<string> {
    name: string;
    slug: string;
    createdAt: Date;
}
