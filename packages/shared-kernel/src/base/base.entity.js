"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEntity = void 0;
const aggregate_root_1 = require("../ddd/aggregate-root");
class BaseEntity extends aggregate_root_1.AggregateRoot {
    tenantId;
    createdAt;
    updatedAt;
    createdBy;
    updatedBy;
    deletedAt;
    version;
    constructor(id, tenantId) {
        super(id);
        this.tenantId = tenantId;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.deletedAt = null;
        this.version = 1;
    }
}
exports.BaseEntity = BaseEntity;
