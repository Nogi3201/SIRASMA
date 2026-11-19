export interface SendWhatsAppOptions {
  to: string;
  message: string;
}

export interface IWhatsAppService {
  sendMessage(options: SendWhatsAppOptions): Promise<{ success: boolean; messageId?: string }>;
}

