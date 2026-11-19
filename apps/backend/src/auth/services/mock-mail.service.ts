import { Injectable, Logger } from '@nestjs/common';
import { IMailService, SendMailOptions } from '../interfaces/mail.service.interface.js';

@Injectable()
export class MockMailService implements IMailService {
  private readonly logger = new Logger(MockMailService.name);
  public readonly sentMails: SendMailOptions[] = [];

  async sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string }> {
    this.sentMails.push(options);
    this.logger.log(`[MockMailService] Simulated email dispatch to: ${options.to} | Subject: ${options.subject}`);
    return {
      success: true,
      messageId: `mock-mail-${Date.now()}`,
    };
  }
}

