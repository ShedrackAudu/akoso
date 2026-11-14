import type { Metadata } from "next"
import Link from "next/link"
import type { JSX } from "react"

import { getSchoolSetup, type StepState } from "@akoso/core/school-setup"
import { PageBody, PageHeader } from "@akoso/ui/akoso/page"

import { setupHref } from "@/features/staff/setup/setup-shell"
import { requirePermission } from "@/server/session"

// The Setup checklist (school setup part A spec, section 1): each step with its state.
// A new school goes through them in order; afterwards each stays editable on its own.
export const metadata: Metadata = { title: "Setup" }
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ school: string }> }

const STATE_LABELS: Record<StepState, string> = {
  not_started: "Not started",
  needs_attention: "Needs attention",
  done: "Done",
}

const STATE_STYLES: Record<StepState, string> = {
  not_started: "border-border text-muted-foreground",
  needs_attention: "border-foreground font-semibold",
  done: "border-border bg-muted",
}

export default async function SetupPage({
  params,
}: Props): Promise<JSX.Element> {
  const { school } = await params
  const ctx = await requirePermission(school, "setup.school.manage")
  const setup = await getSchoolSetup(ctx)
  const next = setup.checklist.find((step) => step.state !== "done")

  return (
    <PageBody width="narrow">
      <PageHeader
        title="Set up your school"
        description={
          next === undefined
            ? "Everything is set up. You can change any step at any time."
            : "Five steps. Each change is saved as you make it, so you can stop and come back."
        }
      />
      <ol className="flex flex-col gap-3" data-testid="setup-checklist">
        {setup.checklist.map((step, index) => (
          <li key={step.key}>
            <Link
              href={setupHref(school, step.key)}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-4 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={`setup-step-${step.key}`}
            >
              <span className="flex flex-col gap-1">
                <span className="text-base font-semibold">
                  {index + 1}. {step.title}
                </span>
                {step.note !== "" && (
                  <span className="text-base text-muted-foreground">
                    {step.note}
                  </span>
                )}
              </span>
              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-base ${STATE_STYLES[step.state]}`}
                data-state={step.state}
              >
                {STATE_LABELS[step.state]}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </PageBody>
  )
}
