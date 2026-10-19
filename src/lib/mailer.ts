import "server-only";

import nodemailer from "nodemailer";

/** Thrown when no mail provider is configured, so callers can say so plainly. */
export class MailNotConfiguredError extends Error {
  constructor() {
    super(
      "Email is not set up. Set RESEND_API_KEY, or GMAIL_USER and GMAIL_APP_PASSWORD.",
    );
    this.name = "MailNotConfiguredError";
  }
}

export interface Message {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends one email through Resend when RESEND_API_KEY is set, otherwise Gmail
 * SMTP with an app password. Read at call time, so changing the environment
 * needs no rebuild. Throws when the provider refuses it.
 */
export async function sendMail(message: Message): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const user = process.env.GMAIL_USER?.trim();
  // Google shows app passwords in four spaced groups; SMTP wants them joined.
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  // EARLY_ACCESS_FROM is the marketing site's name for the same sender, so one
  // value can serve both apps.
  const from =
    process.env.MAIL_FROM?.trim() || process.env.EARLY_ACCESS_FROM?.trim();

  if (resendKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "Hostayo <onboarding@resend.dev>",
        to: [message.to],
        reply_to: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error(
        `Resend responded ${response.status}: ${(await response.text()).slice(0, 300)}`,
      );
    return;
  }

  if (user && pass) {
    const port = Number(process.env.SMTP_PORT) || 465;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    try {
      await transport.sendMail({
        from: from || { name: "Hostayo", address: user },
        ...message,
      });
    } finally {
      transport.close();
    }
    return;
  }

  throw new MailNotConfiguredError();
}
