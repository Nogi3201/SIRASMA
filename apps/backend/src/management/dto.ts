import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { gender_policy, room_status } from '@prisma/client';

export class BuildingDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsEnum(gender_policy) @IsOptional() genderPolicy?: gender_policy;
  @IsString() @IsOptional() description?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}
export class RoomDto {
  @IsUUID() buildingId!: string;
  @IsString() @IsNotEmpty() @MaxLength(40) roomNumber!: string;
  @Type(() => Number) @IsInt() @Min(1) capacity!: number;
  @IsEnum(room_status) @IsOptional() status?: room_status;
  @IsString() @IsOptional() description?: string;
}
export class FacilityDto { @IsString() @IsNotEmpty() @MaxLength(120) name!: string; @IsString() @IsOptional() description?: string; }
export class RoomFacilityDto { @IsUUID() facilityId!: string; @Type(() => Number) @IsInt() @Min(1) quantity!: number; @IsString() @IsOptional() notes?: string; }
export class RoomRateDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) amount!: number;
  @IsString() @IsOptional() @MaxLength(3) currency?: string;
  @IsDateString() effectiveFrom!: string;
  @IsDateString() @IsOptional() effectiveUntil?: string;
}
export class StaffUpdateDto { @IsString() @IsOptional() @MaxLength(60) employeeIdentifier?: string; @IsString() @IsOptional() @MaxLength(25) phoneNumber?: string; @IsBoolean() @IsOptional() isActive?: boolean; }
export class AcademicPeriodDto {
  @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsDateString() registrationOpenAt!: string;
  @IsDateString() registrationCloseAt!: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}
