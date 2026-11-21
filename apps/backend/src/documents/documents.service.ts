import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { document_status, document_type, user_role } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReviewDocumentDto, UploadDocumentDto } from './dto.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const PRIVATE_ROOT = join(process.cwd(), 'storage', 'student-documents');
const signatures: Record<string, { extension: string; valid: (value: Buffer) => boolean }> = {
  'image/jpeg': { extension: 'jpg', valid: (v) => v.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  'image/png': { extension: 'png', valid: (v) => v.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'application/pdf': { extension: 'pdf', valid: (v) => v.subarray(0, 5).toString() === '%PDF-' },
};

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}
  async mine(userId: string) { return this.prisma.student_documents.findMany({ where: { user_id: userId }, orderBy: { uploaded_at: 'desc' }, select: { id: true, document_type: true, status: true, rejection_reason: true, uploaded_at: true, reviewed_at: true } }); }
  async list() { return this.prisma.student_documents.findMany({ orderBy: { uploaded_at: 'desc' }, include: { users_student_documents_user_idTousers: { select: { email: true, student_profiles: { select: { full_name: true, nim: true } } } } } }); }
  async upload(userId: string, dto: UploadDocumentDto) {
    const raw = dto.fileBase64.replace(/^data:[^;]+;base64,/, '');
    let content: Buffer;
    try { content = Buffer.from(raw, 'base64'); } catch { throw new BadRequestException('Berkas tidak valid.'); }
    if (!content.length || content.length > MAX_FILE_SIZE) throw new BadRequestException('Ukuran berkas harus antara 1 byte dan 5 MB.');
    const signature = Object.values(signatures).find((item) => item.valid(content));
    if (!signature) throw new BadRequestException('Format berkas harus JPG, PNG, atau PDF yang valid.');
    const safeName = `${userId}-${dto.documentType}-${randomUUID()}.${signature.extension}`;
    await mkdir(PRIVATE_ROOT, { recursive: true });
    await writeFile(join(PRIVATE_ROOT, safeName), content, { flag: 'wx', mode: 0o600 });
    return this.prisma.$transaction(async (tx) => {
      // A replacement is a new auditable record; old files remain inaccessible publicly.
      await tx.student_documents.updateMany({ where: { user_id: userId, document_type: dto.documentType, status: document_status.PENDING }, data: { status: document_status.REJECTED, rejection_reason: 'Digantikan oleh unggahan terbaru.', reviewed_at: new Date() } });
      return tx.student_documents.create({ data: { user_id: userId, document_type: dto.documentType, file_path: safeName } });
    });
  }
  async review(id: string, reviewerId: string, dto: ReviewDocumentDto) {
    if (dto.status === document_status.PENDING) throw new BadRequestException('Status verifikasi harus APPROVED atau REJECTED.');
    if (dto.status === document_status.REJECTED && !dto.reason?.trim()) throw new BadRequestException('Alasan penolakan/perbaikan wajib diisi.');
    const document = await this.prisma.student_documents.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Dokumen tidak ditemukan.');
    return this.prisma.student_documents.update({ where: { id }, data: { status: dto.status, reviewed_by: reviewerId, reviewed_at: new Date(), rejection_reason: dto.status === document_status.REJECTED ? dto.reason!.trim() : null } });
  }
  async file(id: string, userId: string, role: user_role) {
    const document = await this.prisma.student_documents.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Dokumen tidak ditemukan.');
    if (role === user_role.USER && document.user_id !== userId) throw new ForbiddenException('Anda tidak dapat membuka dokumen ini.');
    const content = await readFile(join(PRIVATE_ROOT, document.file_path)).catch(() => { throw new NotFoundException('Berkas dokumen tidak ditemukan.'); });
    const extension = document.file_path.split('.').pop();
    return { content, contentType: extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : 'image/jpeg', etag: createHash('sha256').update(content).digest('hex') };
  }
}
