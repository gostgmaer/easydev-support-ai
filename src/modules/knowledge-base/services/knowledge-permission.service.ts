import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IKnowledgeRepository } from '../repositories/knowledge-repository.interface';
import { KnowledgePermission } from '../domain/knowledge-permission.entity';
import { AddPermissionDto } from '../dtos/knowledge.dto';

@Injectable()
export class KnowledgePermissionService {
  constructor(
    @Inject('IKnowledgeRepository')
    private readonly repository: IKnowledgeRepository,
  ) {}

  public async addPermission(
    tenantId: string,
    documentId: string,
    dto: AddPermissionDto,
  ): Promise<KnowledgePermission> {
    const permission = new KnowledgePermission(crypto.randomUUID(), {
      tenantId,
      documentId,
      teamId: dto.teamId,
      role: dto.role,
      accessLevel: dto.accessLevel,
    });

    return this.repository.savePermission(permission, tenantId);
  }

  public async getPermissions(
    tenantId: string,
    documentId: string,
  ): Promise<KnowledgePermission[]> {
    return this.repository.getPermissionsByDocumentId(documentId, tenantId);
  }

  public async deletePermission(
    tenantId: string,
    id: string,
  ): Promise<boolean> {
    const deleted = await this.repository.deletePermission(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Permission ${id} not found`);
    }
    return deleted;
  }

  public async checkAccess(
    tenantId: string,
    documentId: string,
    teamId?: string,
    role?: string,
    requiredLevel: 'READ' | 'WRITE' | 'MANAGE' = 'READ',
  ): Promise<boolean> {
    return this.repository.checkPermission(
      documentId,
      tenantId,
      teamId,
      role,
      requiredLevel,
    );
  }
}
import * as crypto from 'crypto';
