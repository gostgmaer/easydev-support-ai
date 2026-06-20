"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantEntity = void 0;
const aggregate_root_1 = require("../ddd/aggregate-root");
class TenantEntity extends aggregate_root_1.AggregateRoot {
    name;
    slug;
    createdAt = new Date();
}
exports.TenantEntity = TenantEntity;
