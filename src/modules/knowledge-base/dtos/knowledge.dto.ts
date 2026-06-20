import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject, IsArray, IsUrl, IsNumber, IsUUID } from 'class-validator';
import { SourceTypeEnum, DocumentTypeEnum, DocumentStatusEnum } from '../domain/value-objects';

export class CreateSourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SourceTypeEnum)
  sourceType: SourceTypeEnum;

  @IsString()
  @IsOptional()
  uri?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSourceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  uri?: string;
}

export class CreateDocumentDto {
  @IsUUID()
  @IsNotEmpty()
  sourceId: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsEnum(DocumentTypeEnum)
  documentType: DocumentTypeEnum;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  storageProvider?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  parentCategoryId?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  parentCategoryId?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class PublishDocumentDto {
  @IsString()
  @IsNotEmpty()
  changeSummary: string;
}

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsUUID()
  @IsOptional()
  sourceId?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class AddPermissionDto {
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsEnum(['READ', 'WRITE', 'MANAGE'])
  accessLevel: 'READ' | 'WRITE' | 'MANAGE';
}

export class UrlImportDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsUUID()
  @IsNotEmpty()
  sourceId: string;
}
export class SitemapImportDto {
  @IsUrl()
  @IsNotEmpty()
  sitemapUrl: string;

  @IsUUID()
  @IsNotEmpty()
  sourceId: string;
}
