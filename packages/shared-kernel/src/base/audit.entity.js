'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AuditEntity = void 0;
const base_entity_1 = require('./base.entity');
class AuditEntity extends base_entity_1.BaseEntity {
  action;
  details;
  ipAddress;
  userAgent;
}
exports.AuditEntity = AuditEntity;
