import { env } from '../../config/env';

export interface Email {
  to: string;
  subject: string;
  html: string;
}

export interface SendResult {
  sent: number;
  failed: number;
}

/**
 * Sends one message through Resend.
 *
 * Uses the REST endpoint over global fetch rather than the SDK: the payload is
 * three fields and the dependency would not earn its place.
 */
async function sendWithResend(email: Email): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.mail.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.mail.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend respondio ${response.status}: ${detail}`);
  }
}

/**
 * Without an API key the message is logged instead of sent, so the whole flow
 * can be exercised in development and a missing credential never takes down the
 * action that triggered the notification.
 */
function logInstead(email: Email): void {
  console.log(`[EMAIL] para ${email.to} | ${email.subject}`);
}

export function isMailConfigured(): boolean {
  return Boolean(env.mail.resendApiKey);
}

/**
 * Delivers a batch of messages.
 *
 * A notification is never worth failing the operation that produced it: a
 * fixture is still generated if the email is down. Failures are counted and
 * logged, not thrown.
 */
export async function sendEmails(emails: Email[]): Promise<SendResult> {
  if (emails.length === 0) return { sent: 0, failed: 0 };

  if (!isMailConfigured()) {
    emails.forEach(logInstead);
    return { sent: 0, failed: 0 };
  }

  const results = await Promise.allSettled(emails.map(sendWithResend));

  const failed = results.filter((r) => r.status === 'rejected');
  for (const failure of failed) {
    console.error('SendEmail error:', (failure as PromiseRejectedResult).reason);
  }

  return { sent: results.length - failed.length, failed: failed.length };
}
