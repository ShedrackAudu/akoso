// Sending SMS (brief section 2: Termii first, Africa's Talking as backup). Business
// logic sees only this interface; the real adapter arrives when the Termii account is
// opened (founder task).

export interface SmsMessage {
  /** E.164, e.g. +2348031234567. */
  to: string
  body: string
  /**
   * What the message is for. Sign-in codes go on the DND (transactional) route so they
   * still reach numbers on Do Not Disturb.
   */
  purpose: "sign_in_code"
}

export interface SmsProvider {
  /** Sends one message. Throws when the provider refuses it. */
  send(message: SmsMessage): Promise<void>
}
