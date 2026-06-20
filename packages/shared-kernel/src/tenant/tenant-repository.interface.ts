export interface ITenantRepository<TEntity, TId = string> {
  findById(id: TId, tenantId: string): Promise<TEntity | null>;
  findAll(tenantId: string): Promise<TEntity[]>;
  save(entity: TEntity, tenantId: string): Promise<TEntity>;
  delete(id: TId, tenantId: string): Promise<boolean>;
}
