// What a school's status allows (spec: stage-1-tenancy.md, section 1). Applied by the
// request pipeline and server actions to every request for a school.
import type { SchoolSummary } from "@akoso/schemas/tenancy"

import { SchoolReadOnlyError, SchoolUnavailableError } from "./errors"

/**
 * @throws SchoolUnavailableError for a suspended or closed school.
 * @throws SchoolReadOnlyError for a write to a school that is leaving.
 */
export function assertSchoolAllows(
  school: SchoolSummary | null,
  write: boolean
): void {
  if (school === null) return
  if (school.status === "suspended" || school.status === "closed") {
    throw new SchoolUnavailableError()
  }
  if (write && school.status === "read_only") {
    throw new SchoolReadOnlyError()
  }
}
