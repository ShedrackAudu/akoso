// Messages the part B flows send: codes, and security notices to a person's other
// numbers and email (spec: stage-1-sign-in-part-b.md, sections 4 to 7). A notice that
// fails to send is logged and never undoes the change it reports.
import type { Logger } from "../kernel/index"
import type { IdentityServices } from "./instance"

/** Sends a one-time code by SMS. A failure is the caller's to report. */
export async function sendCode(
  services: IdentityServices,
  to: string,
  text: string
): Promise<void> {
  await services.sms.send({ to, body: text, purpose: "sign_in_code" })
}

export interface Notice {
  phones: readonly (string | null | undefined)[]
  emails: readonly (string | null | undefined)[]
  subject: string
  text: string
}

/** Sends a security notice to each number and address given; failures are logged. */
export async function sendNotice(
  services: IdentityServices,
  log: Logger,
  notice: Notice
): Promise<void> {
  const phones = [...new Set(notice.phones)].filter(
    (phone): phone is string => typeof phone === "string" && phone !== ""
  )
  const emails = [...new Set(notice.emails)].filter(
    (email): email is string =>
      typeof email === "string" && email !== "" && !email.endsWith(".invalid")
  )
  const sends = [
    ...phones.map((to) =>
      services.sms.send({ to, body: notice.text, purpose: "security_notice" })
    ),
    ...emails.map((to) =>
      services.email.send({
        to,
        subject: notice.subject,
        text: notice.text,
        purpose: "security_notice",
      })
    ),
  ]
  const results = await Promise.allSettled(sends)
  const failed = results.filter((result) => result.status === "rejected").length
  if (failed > 0) {
    log.warn("A security notice could not be sent", {
      code: `failed_${String(failed)}`,
    })
  }
}
