// Sending email (brief section 2: Resend or Amazon SES). Business logic sees only this
// interface; the real adapter arrives when the founder opens the account. Until then,
// email works locally through the fake adapter only.

export interface EmailMessage {
  to: string
  subject: string
  /** Plain text. Kept short and calm (docs/brand-voice.md). */
  text: string
  /** What the email is for, so the real adapter can pick a stream or route. */
  purpose: "account_link" | "security_notice"
}

export interface EmailProvider {
  /** Sends one message. Throws when the provider refuses it. */
  send(message: EmailMessage): Promise<void>
}
