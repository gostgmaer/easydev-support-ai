import { AggregateRoot } from '../ddd/aggregate-root';
export declare abstract class BaseEntity extends AggregateRoot<string> {
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    deletedAt: Date | null;
    version: number;
    constructor(id: string, tenantId: string);
}
