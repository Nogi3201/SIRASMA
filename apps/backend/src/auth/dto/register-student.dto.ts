import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterStudentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9]+$/, { message: 'NIM harus berupa karakter alfanumerik tanpa spasi' })
  nim: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Nama lengkap minimal 3 karakter' })
  fullName: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message: 'Password harus mengandung huruf besar, huruf kecil, angka, dan karakter khusus',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @IsString()
  @IsNotEmpty()
  studyProgram: string;

  @IsInt({ message: 'Tahun masuk harus berupa angka' })
  @Min(2000, { message: 'Tahun masuk tidak valid' })
  @Max(2100, { message: 'Tahun masuk tidak valid' })
  admissionYear: number;

  @IsInt({ message: 'Semester aktif harus berupa angka' })
  @Min(1, { message: 'Semester aktif minimal 1' })
  @Max(14, { message: 'Semester aktif maksimal 14' })
  activeSemester: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Nomor WhatsApp harus berformat internasional valid (contoh: +6281234567890)',
  })
  whatsappNumber: string;
}

