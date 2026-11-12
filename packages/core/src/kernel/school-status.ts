// What a school's status allows (spec: stage-1-tenancy.md, section 1). Applied by the
// request pipeline and server actions to every request for a school.
import type { SchoolSummary } from "@akoso/schemas/tenancy"

import {
  SchoolClosedError,
  SchoolReadOnlyError,
  SchoolUnavailableError,
} from "./errors"

/**
 * Membership is checked before this runs, so only a school's own members ever learn
 * its status; anyone else gets 404.
 *
 * @throws SchoolUnavailableError for a suspended school.
 * @throws SchoolClosedError for a closed school.
 * @throws SchoolReadOnlyError for a write to a school that is leaving.
 */
export function assertSchoolAllows(
  school: SchoolSummary | null,
  write: boolean
): void {
  if (school === null) return
  if (school.status === "suspended") throw new SchoolUnavailableError()
  if (school.status === "closed") throw new SchoolClosedError()
  if (write && school.status === "read_only") {
    throw new SchoolReadOnlyError()
  }
}
