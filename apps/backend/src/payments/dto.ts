import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  @IsNotEmpty()
  reservationId!: string;
}

export class CreateSnapTokenDto {
  @IsUUID()
  @IsNotEmpty()
  invoiceId!: string;
}

export class MidtransNotificationDto {
  @IsString()
  @IsNotEmpty()
  order_id!: string;

  @IsString()
  @IsNotEmpty()
  status_code!: string;

  @IsString()
  @IsNotEmpty()
  gross_amount!: string;

  @IsString()
  @IsNotEmpty()
  signature_key!: string;

  @IsString()
  @IsNotEmpty()
  transaction_status!: string;

  @IsString()
  @IsOptional()
  fraud_status?: string;

  @IsString()
  @IsOptional()
  payment_type?: string;

  @IsString()
  @IsOptional()
  transaction_id?: string;

  @IsString()
  @IsOptional()
  status_message?: string;

  @IsString()
  @IsOptional()
  transaction_time?: string;
}

export class PaymentFilterDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
