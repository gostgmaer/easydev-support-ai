import { Injectable, Inject } from '@nestjs/common';
import type { IKnowledgeRepository } from '../repositories/knowledge-repository.interface';
import { KnowledgeVersion } from '../domain/knowledge-version.entity';

@Injectable()
export class KnowledgeVersionService {
  constructor(
    @Inject('IKnowledgeRepository')
    private readonly repository: IKnowledgeRepository,
  ) {}

  public async getVersions(
    tenantId: string,
    documentId: string,
  ): Promise<KnowledgeVersion[]> {
    return this.repository.getVersionsByDocumentId(documentId, tenantId);
  }
}
