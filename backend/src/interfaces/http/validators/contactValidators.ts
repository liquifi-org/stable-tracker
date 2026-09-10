import { z } from 'zod';

export const ContactMessageSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    email: z.string().trim().email('Valid email is required').max(254),
    subject: z.string().trim().max(200).optional(),
    message: z.string().trim().min(1, 'Message is required').max(5000),
    /** Honeypot — real users leave this empty. */
    company: z.string().max(200).optional(),
});
