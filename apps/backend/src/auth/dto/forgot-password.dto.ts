import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { otp_channel } from '@prisma/client';

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // email or phone number

  @IsEnum(otp_channel, { message: 'Channel harus berupa EMAIL atau WHATSAPP' })
  channel: otp_channel;
}

