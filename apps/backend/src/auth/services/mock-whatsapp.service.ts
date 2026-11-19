import { Injectable, Logger } from '@nestjs/common';
import { IWhatsAppService, SendWhatsAppOptions } from '../interfaces/whatsapp.service.interface.js';

@Injectable()
export class MockWhatsAppService implements IWhatsAppService {
  private readonly logger = new Logger(MockWhatsAppService.name);
  public readonly sentMessages: SendWhatsAppOptions[] = [];

  async sendMessage(options: SendWhatsAppOptions): Promise<{ success: boolean; messageId?: string }> {
    this.sentMessages.push(options);
    this.logger.log(`[MockWhatsAppService] Simulated WhatsApp message dispatch to: ${options.to}`);
    return {
      success: true,
      messageId: `mock-wa-${Date.now()}`,
    };
  }
}

