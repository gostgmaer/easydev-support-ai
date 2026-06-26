'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.TenantResolver = void 0;
const common_1 = require('@nestjs/common');
let TenantResolver = class TenantResolver {
  resolve(context) {
    const request = context.switchToHttp().getRequest();
    if (!request) return undefined;
    let tenantId =
      request.headers['x-tenant-id'] || request.headers['x-tenant-slug'];
    if (tenantId) return String(tenantId);
    const user = request.user;
    if (user && user.tenantId) {
      return user.tenantId;
    }
    tenantId = request.query?.tenantId || request.query?.tenant_id;
    if (tenantId) return String(tenantId);
    return undefined;
  }
};
exports.TenantResolver = TenantResolver;
exports.TenantResolver = TenantResolver = __decorate(
  [(0, common_1.Injectable)()],
  TenantResolver,
);
