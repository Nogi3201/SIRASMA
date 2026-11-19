export interface SendMailOptions {
  to: string;
  subject: string;
  content: string;
}

export interface IMailService {
  sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string }>;
}

