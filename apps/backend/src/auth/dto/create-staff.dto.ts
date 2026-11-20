import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateStaffDto {
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
  @IsOptional()
  employeeIdentifier?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

