import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { document_status, document_type } from '@prisma/client';

export class UploadDocumentDto {
  @IsEnum(document_type) documentType!: document_type;
  @IsString() @IsNotEmpty() @MaxLength(180) fileName!: string;
  @IsString() @IsNotEmpty() fileBase64!: string;
}

export class ReviewDocumentDto {
  @IsEnum(document_status) status!: document_status;
  @IsString() @IsOptional() @MaxLength(500) reason?: string;
}
