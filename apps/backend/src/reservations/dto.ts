import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { reservation_status } from '@prisma/client';
export class CreateReservationDto { @IsUUID() roomId!: string; }
export class UpdateReservationStatusDto { @IsEnum(reservation_status) status!: reservation_status; @IsString() @IsOptional() @MaxLength(500) reason?: string; }
