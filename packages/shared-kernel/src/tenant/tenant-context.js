"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContext = void 0;
const async_hooks_1 = require("async_hooks");
class TenantContext {
    static storage = new async_hooks_1.AsyncLocalStorage();
    static run(tenantId, callback) {
        return this.storage.run(tenantId, callback);
    }
    static getTenantId() {
        return this.storage.getStore();
    }
    static getRequiredTenantId() {
        const tenantId = this.getTenantId();
        if (!tenantId) {
            throw new Error('Tenant context is missing or not set');
        }
        return tenantId;
    }
}
exports.TenantContext = TenantContext;
