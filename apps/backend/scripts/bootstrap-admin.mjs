import * as argon2 from 'argon2';
import { Prisma, PrismaClient, user_role } from '@prisma/client';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const prisma = new PrismaClient();
const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function readHidden(question) {
  if (!input.isTTY) {
    throw new Error('Bootstrap admin harus dijalankan pada terminal interaktif.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      input.removeListener('data', onData);
      input.setRawMode(false);
      input.pause();
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          cleanup();
          output.write('\n');
          reject(new Error('Bootstrap dibatalkan.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          output.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            output.write('\b \b');
          }
          continue;
        }
        value += character;
        output.write('*');
      }
    };

    output.write(question);
    input.setRawMode(true);
    input.resume();
    input.setEncoding('utf8');
    input.on('data', onData);
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL tidak tersedia. Periksa environment sebelum menjalankan bootstrap.');
  }

  const readline = createInterface({ input, output });
  const email = (await readline.question('Email ADMIN pertama: ')).trim().toLowerCase();
  readline.close();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Format email tidak valid.');
  }

  const password = await readHidden('Password ADMIN: ');
  const confirmation = await readHidden('Konfirmasi password ADMIN: ');
  if (password !== confirmation) {
    throw new Error('Password dan konfirmasi password tidak cocok.');
  }
  if (!PASSWORD_POLICY.test(password)) {
    throw new Error('Password minimal 8 karakter serta mengandung huruf besar, huruf kecil, angka, dan karakter khusus.');
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const admin = await prisma.$transaction(async (tx) => {
    // Serializes bootstrap attempts without changing the database schema.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('sirasma-bootstrap-admin'))`;

    const existingAdmin = await tx.users.findFirst({
      where: { role: user_role.ADMIN },
      select: { id: true },
    });
    if (existingAdmin) {
      throw new Error('Bootstrap dibatalkan: akun ADMIN sudah tersedia.');
    }

    const existingEmail = await tx.users.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new Error('Bootstrap dibatalkan: email tersebut sudah digunakan.');
    }

    return tx.users.create({
      data: {
        email,
        password_hash: passwordHash,
        role: user_role.ADMIN,
        is_active: true,
      },
      select: { id: true, email: true, role: true, created_at: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  console.log(`ADMIN pertama berhasil dibuat untuk ${admin.email} (${admin.role}).`);
  console.log(`ID akun: ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Bootstrap ADMIN gagal.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
