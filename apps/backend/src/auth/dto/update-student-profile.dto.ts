import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateStudentProfileDto {
  @IsString() @IsNotEmpty() @MaxLength(160) @IsOptional() fullName?: string;
  @IsString() @IsNotEmpty() @MaxLength(160) @IsOptional() studyProgram?: string;
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() activeSemester?: number;
}
