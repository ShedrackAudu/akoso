// "Today" for the request's school (brief section 3.1): its time zone, the server's
// clock. Nothing on the server reads its own local date.
import { time } from "@akoso/domain"

import type { RequestContext } from "./context"

/** Today's date in the request's school, from the server's clock. */
export function schoolToday(ctx: RequestContext): time.LocalDate {
  if (ctx.school === null) {
    throw new Error("schoolToday() needs a school; this request has none")
  }
  return time.todayIn(ctx.school.timeZone, ctx.now())
}
