import { Resend } from 'resend';
import { logger } from '../logger.js';

let _resend: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export const FROM_EMAIL = 'shelfy@shelfesteem.app';

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn('RESEND_API_KEY not set — skipping email');
    return false;
  }
  try {
    await resend.emails.send({ from: FROM_EMAIL, ...opts });
    return true;
  } catch (err) {
    logger.error({ err }, 'Failed to send email');
    return false;
  }
}
