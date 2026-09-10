import logger from '../../util/logger';

const TELEGRAM_API = 'https://api.telegram.org';

export class TelegramNotifier {
    isConfigured(): boolean {
        return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
    }

    async sendMessage(text: string): Promise<void> {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatIds = (process.env.TELEGRAM_CHAT_ID ?? '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);

        if (!token || chatIds.length === 0) {
            throw new Error('Telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).');
        }

        const results = await Promise.allSettled(
            chatIds.map((chatId) => this.postSendMessage(token, chatId, text)),
        );

        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length === results.length) {
            const first = failures[0] as PromiseRejectedResult;
            throw first.reason instanceof Error ? first.reason : new Error('Telegram send failed.');
        }

        if (failures.length > 0) {
            logger.warn('TELEGRAM_PARTIAL_FAILURE', {
                meta: { failed: failures.length, total: results.length },
            });
        }
    }

    private async postSendMessage(token: string, chatId: string, text: string): Promise<void> {
        const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                disable_web_page_preview: true,
            }),
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Telegram API ${response.status}: ${body.slice(0, 300)}`);
        }
    }
}
