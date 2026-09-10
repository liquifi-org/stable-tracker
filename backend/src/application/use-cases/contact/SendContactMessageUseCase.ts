import type { TelegramNotifier } from '../../../infrastructure/telegram/TelegramNotifier';

export type ContactMessage = {
    name: string;
    email: string;
    subject?: string;
    message: string;
};

export class SendContactMessageUseCase {
    constructor(private readonly telegram: TelegramNotifier) {}

    async execute(input: ContactMessage): Promise<void> {
        const lines = [
            'New contact form message',
            '',
            `Name: ${input.name}`,
            `Email: ${input.email}`,
            `Subject: ${input.subject?.trim() || '(none)'}`,
            '',
            input.message,
        ];

        await this.telegram.sendMessage(lines.join('\n'));
    }
}
