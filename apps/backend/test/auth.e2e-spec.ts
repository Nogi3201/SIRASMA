import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Authentication & Authorization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = `e2e_student_${Date.now()}@ulbi.ac.id`;
  const testNim = `NIM${Date.now().toString().slice(-7)}`;
  const testPhone = `+62812${Date.now().toString().slice(-7)}`;
  const testPassword = 'Password123!@#';

  let accessToken = '';
  let refreshToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data safely
    try {
      const user = await prisma.users.findUnique({ where: { email: testEmail } });
      if (user) {
        await prisma.academic_verifications.deleteMany({
          where: { student_profiles: { user_id: user.id } },
        });
        await prisma.student_profiles.deleteMany({ where: { user_id: user.id } });
        await prisma.auth_sessions.deleteMany({ where: { user_id: user.id } });
        await prisma.users.delete({ where: { id: user.id } });
      }
    } catch {
      // Ignore cleanup error in test
    }
    await app.close();
  });

  it('1. POST /api/auth/register — Mahasiswa berhasil mendaftar', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        nim: testNim,
        fullName: 'E2E Testing Student',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
        studyProgram: 'D4 Teknik Informatika',
        admissionYear: 2024,
        activeSemester: 1,
        whatsappNumber: testPhone,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('USER');
    expect(res.body.data.nim).toBe(testNim);
  });

  it('2. POST /api/auth/register — Duplikat NIM ditolak (409 Conflict)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        nim: testNim, // Duplikat NIM
        fullName: 'Another Student',
        email: `another_${Date.now()}@ulbi.ac.id`,
        password: testPassword,
        confirmPassword: testPassword,
        studyProgram: 'D4 Teknik Informatika',
        admissionYear: 2024,
        activeSemester: 1,
        whatsappNumber: `+62813${Date.now().toString().slice(-7)}`,
      })
      .expect(409);

    expect(res.body.message).toContain('NIM sudah terdaftar');
  });

  it('3. POST /api/auth/register — Duplikat Email ditolak (409 Conflict)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        nim: `DIFF${Date.now().toString().slice(-6)}`,
        fullName: 'Another Student',
        email: testEmail, // Duplikat Email
        password: testPassword,
        confirmPassword: testPassword,
        studyProgram: 'D4 Teknik Informatika',
        admissionYear: 2024,
        activeSemester: 1,
        whatsappNumber: `+62814${Date.now().toString().slice(-7)}`,
      })
      .expect(409);

    expect(res.body.message).toContain('Email sudah terdaftar');
  });

  it('4. POST /api/auth/login — Berhasil login & menerima access token & HttpOnly cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('USER');

    accessToken = res.body.data.accessToken;

    // Check Set-Cookie header contains refresh_token
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = (cookies as unknown as string[]).find((c) => c.startsWith('refresh_token='));
    expect(refreshCookie).toBeDefined();
    refreshToken = refreshCookie!.split(';')[0].replace('refresh_token=', '');
  });

  it('5. POST /api/auth/login — Password salah ditolak (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'CompletelyWrongPassword!',
      })
      .expect(401);
  });

  it('6. GET /api/auth/me — Access token valid dapat mengakses profil', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.studentProfile.nim).toBe(testNim);
  });

  it('7. GET /api/auth/test/user — USER dapat mengakses endpoint USER', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/test/user')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('8. GET /api/auth/test/admin — USER ditolak mengakses endpoint ADMIN (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/test/admin')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('9. POST /api/auth/refresh — Refresh token berhasil dirotasi', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', `refresh_token=${refreshToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    // Check new rotated cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const newRefreshCookie = (cookies as unknown as string[]).find((c) => c.startsWith('refresh_token='));
    expect(newRefreshCookie).toBeDefined();
    refreshToken = newRefreshCookie!.split(';')[0].replace('refresh_token=', '');
  });

  it('10. POST /api/auth/logout — Logout berhasil dan mencabut cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', `refresh_token=${refreshToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
