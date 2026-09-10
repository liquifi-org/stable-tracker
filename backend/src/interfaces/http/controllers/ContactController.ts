import { Request, Response, NextFunction } from 'express';
import type { SendContactMessageUseCase } from '../../../application/use-cases/contact/SendContactMessageUseCase';
import type { TelegramNotifier } from '../../../infrastructure/telegram/TelegramNotifier';
import { ContactMessageSchema } from '../validators/contactValidators';
import logger from '../../../util/logger';

export class ContactController {
    constructor(
        private readonly sendContact: SendContactMessageUseCase,
        private readonly telegram: TelegramNotifier,
    ) {}

    submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const body = ContactMessageSchema.parse(req.body);

            if (body.hp_website?.trim()) {
                logger.info('CONTACT_HONEYPOT_DROPPED', { meta: { email: body.email } });
                res.status(200).json({ ok: true });
                return;
            }

            if (!this.telegram.isConfigured()) {
                res.status(503).json({
                    type: 'https://api.stablecoin-tracker.ey.com/problems/service-unavailable',
                    title: 'Service Unavailable',
                    status: 503,
                    detail: 'Contact form is not configured on the server.',
                });
                return;
            }

            await this.sendContact.execute({
                name: body.name,
                email: body.email,
                subject: body.subject,
                message: body.message,
            });

            logger.info('CONTACT_MESSAGE_SENT', { meta: { email: body.email } });
            res.status(200).json({ ok: true });
        } catch (error) {
            next(error);
        }
    };
}
