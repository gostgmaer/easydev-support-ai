import { ValueObject } from '@easydev/shared-kernel';
import { validate as uuidValidate } from 'uuid';

export class SourceId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid SourceId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }
  get value(): string {
    return this.props.value;
  }
  public static create(value: string): SourceId {
    return new SourceId(value);
  }
}

export class DocumentId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid DocumentId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }
  get value(): string {
    return this.props.value;
  }
  public static create(value: string): DocumentId {
    return new DocumentId(value);
  }
}

export class ChunkId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid ChunkId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }
  get value(): string {
    return this.props.value;
  }
  public static create(value: string): ChunkId {
    return new ChunkId(value);
  }
}

export class CategoryId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid CategoryId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }
  get value(): string {
    return this.props.value;
  }
  public static create(value: string): CategoryId {
    return new CategoryId(value);
  }
}

export class TagId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!uuidValidate(value)) {
      throw new Error(`Invalid TagId: ${value}. Must be a valid UUID.`);
    }
    super({ value });
  }
  get value(): string {
    return this.props.value;
  }
  public static create(value: string): TagId {
    return new TagId(value);
  }
}

export enum SourceTypeEnum {
  PDF = 'PDF',
  DOCX = 'DOCX',
  TXT = 'TXT',
  CSV = 'CSV',
  MARKDOWN = 'MARKDOWN',
  FAQ = 'FAQ',
  WEBSITE = 'WEBSITE',
  SITEMAP = 'SITEMAP',
  URL = 'URL',
  CONFLUENCE = 'CONFLUENCE',
  NOTION = 'NOTION',
  GOOGLE_DOC = 'GOOGLE_DOC',
  MANUAL = 'MANUAL',
}

export enum DocumentTypeEnum {
  PDF = 'PDF',
  DOCX = 'DOCX',
  TXT = 'TXT',
  CSV = 'CSV',
  MARKDOWN = 'MARKDOWN',
  FAQ = 'FAQ',
  HTML = 'HTML',
  WEBPAGE = 'WEBPAGE',
  MANUAL = 'MANUAL',
}

export enum DocumentStatusEnum {
  DRAFT = 'DRAFT',
  PROCESSING = 'PROCESSING',
  INDEXING = 'INDEXING',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  FAILED = 'FAILED',
}

export class DocumentStatus extends ValueObject<{ value: DocumentStatusEnum }> {
  constructor(value: DocumentStatusEnum) {
    if (!Object.values(DocumentStatusEnum).includes(value)) {
      throw new Error(`Invalid DocumentStatus: ${value}`);
    }
    super({ value });
  }
  get value(): DocumentStatusEnum {
    return this.props.value;
  }
  public static create(value: DocumentStatusEnum): DocumentStatus {
    return new DocumentStatus(value);
  }
}

export enum SyncStatusEnum {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
}

export enum IngestionStatusEnum {
  PENDING = 'PENDING',
  INGESTING = 'INGESTING',
  INGESTED = 'INGESTED',
  FAILED = 'FAILED',
}

export enum EmbeddingStatusEnum {
  PENDING = 'PENDING',
  EMBEDDING = 'EMBEDDING',
  EMBEDDED = 'EMBEDDED',
  FAILED = 'FAILED',
}

export class DocumentLanguage extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error(`Language cannot be empty`);
    }
    super({ value: value.toLowerCase() });
  }
  get value(): string {
    return this.props.value;
  }
  public static create(value: string): DocumentLanguage {
    return new DocumentLanguage(value);
  }
}
