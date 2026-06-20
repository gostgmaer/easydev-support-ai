import { Entity } from '@easydev/shared-kernel';

export interface KnowledgePermissionProps {
  tenantId: string;
  documentId: string;
  teamId?: string;
  role?: string;
  accessLevel: 'READ' | 'WRITE' | 'MANAGE';
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class KnowledgePermission extends Entity<string> {
  private props: KnowledgePermissionProps;

  constructor(id: string, props: KnowledgePermissionProps) {
    super(id);
    this.props = {
      ...props,
      accessLevel: props.accessLevel || 'READ',
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get documentId(): string {
    return this.props.documentId;
  }
  get teamId(): string | undefined {
    return this.props.teamId;
  }
  get role(): string | undefined {
    return this.props.role;
  }
  get accessLevel(): 'READ' | 'WRITE' | 'MANAGE' {
    return this.props.accessLevel;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version || 1;
  }

  public updateAccessLevel(level: 'READ' | 'WRITE' | 'MANAGE'): void {
    this.props.accessLevel = level;
    this.props.updatedAt = new Date();
    this.props.version = (this.props.version || 1) + 1;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      documentId: this.documentId,
      teamId: this.teamId,
      role: this.role,
      accessLevel: this.accessLevel,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
