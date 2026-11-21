import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { check_out_status, room_status } from '@prisma/client';
export class CheckoutDto { @IsString() @IsOptional() @MaxLength(500) reason?: string; }
export class CheckoutReviewDto { @IsEnum(check_out_status) status!: check_out_status; @IsString() @IsOptional() @MaxLength(500) notes?: string; @IsEnum(room_status) @IsOptional() roomStatus?: room_status; }
