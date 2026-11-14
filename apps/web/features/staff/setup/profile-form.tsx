"use client"

// Setup step 1, the school profile (school setup part A spec, section 2). The address
// slug isn't editable here: it's printed on flyers and QR codes, so Akoso support
// changes it. The server checks every rule; this form only explains.
import { useState, type JSX, type SyntheticEvent } from "react"

import type { SchoolProfile } from "@akoso/core/school-setup"
import { schoolSetup } from "@akoso/domain"
import { Button } from "@akoso/ui/components/button"
import { SafeForm } from "@akoso/ui/components/safe-form"

import { fieldText } from "@/features/shared/auth/auth-client"
import { Field } from "@/features/shared/auth/field"
import { saveProfileAction } from "@/server/actions/school-setup"

import {
  ActionStatus,
  CHECK,
  fieldProblem,
  SECTION,
  SelectField,
  useSetupAction,
} from "./controls"

export function ProfileForm({
  school,
  profile,
}: {
  school: string
  profile: SchoolProfile
}): JSX.Element {
  const action = useSetupAction()
  const [colour, setColour] = useState(profile.brandColour ?? "")
  const swatch = schoolSetup.normaliseHexColour(colour)

  const save = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void action.run(
      saveProfileAction,
      {
        school,
        name: fieldText(form, "name"),
        timeZone: fieldText(form, "timeZone"),
        schoolTypes: form.getAll("schoolTypes").map(String),
        motto: fieldText(form, "motto"),
        address: fieldText(form, "address"),
        state:
          fieldText(form, "state") === "" ? null : fieldText(form, "state"),
        lga: fieldText(form, "lga"),
        phone: fieldText(form, "phone"),
        email: fieldText(form, "email"),
        brandColour: colour,
        ...(profile.version === null ? {} : { version: profile.version }),
      },
      () => "Profile saved."
    )
  }

  const problem = (path: string) => fieldProblem(action.problem, path)

  return (
    <SafeForm onSubmit={save} className={SECTION} aria-label="School profile">
      <Field
        id="name"
        name="name"
        label="School name"
        defaultValue={profile.name}
        required
        maxLength={200}
        aria-invalid={problem("name") !== undefined}
      />
      <p className="text-sm text-muted-foreground">
        Your school&apos;s address is <strong>{profile.slug}</strong>. To change
        it, ask Akoso support: it&apos;s printed on flyers and QR codes.
      </p>

      <fieldset className="flex flex-col">
        <legend className="text-sm font-semibold">
          What the school teaches
        </legend>
        <p className="text-sm text-muted-foreground">
          Choose more than one for a combined school.
        </p>
        {schoolSetup.SCHOOL_TYPES.map((type) => (
          <label key={type} className={CHECK}>
            <input
              type="checkbox"
              name="schoolTypes"
              value={type}
              defaultChecked={profile.schoolTypes.includes(type)}
              className="size-5"
            />
            {schoolSetup.SCHOOL_TYPE_LABELS[type]}
          </label>
        ))}
      </fieldset>

      <Field
        id="motto"
        name="motto"
        label="Motto (optional)"
        defaultValue={profile.motto}
        maxLength={200}
      />
      <Field
        id="address"
        name="address"
        label="Address"
        defaultValue={profile.address}
        maxLength={500}
        autoComplete="street-address"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="state"
          name="state"
          label="State"
          defaultValue={profile.state ?? ""}
        >
          <option value="">Choose a state</option>
          {schoolSetup.NIGERIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </SelectField>
        <Field
          id="lga"
          name="lga"
          label="Local government area"
          defaultValue={profile.lga}
          maxLength={100}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="phone"
          name="phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0803 123 4567"
          defaultValue={profile.phone ?? ""}
          aria-invalid={problem("phone") !== undefined}
        />
        <Field
          id="email"
          name="email"
          label="Email (optional)"
          type="email"
          autoComplete="email"
          defaultValue={profile.email ?? ""}
          aria-invalid={problem("email") !== undefined}
        />
      </div>
      <Field
        id="timeZone"
        name="timeZone"
        label="Time zone"
        defaultValue={profile.timeZone}
        maxLength={64}
        aria-describedby="timeZone-hint"
      />
      <p id="timeZone-hint" className="-mt-2 text-sm text-muted-foreground">
        Schools in Nigeria use Africa/Lagos. Every date and deadline uses it.
      </p>

      <div className="flex items-end gap-3">
        <div className="grow">
          <Field
            id="brandColour"
            name="brandColour"
            label="Brand colour (optional)"
            placeholder="#5b21b6"
            value={colour}
            onChange={(event) => {
              setColour(event.target.value)
            }}
            maxLength={7}
            aria-describedby="brandColour-hint"
            aria-invalid={problem("brandColour") !== undefined}
          />
        </div>
        <span
          aria-hidden="true"
          className="size-7 shrink-0 rounded-lg border border-border"
          style={swatch === null ? undefined : { backgroundColor: swatch }}
        />
      </div>
      <p id="brandColour-hint" className="-mt-2 text-sm text-muted-foreground">
        A six-digit colour code. It must be dark enough for white text on it.
        Leave it empty to use Akoso&apos;s colours.
      </p>

      <ActionStatus action={action} />
      <div>
        <Button type="submit" disabled={action.busy}>
          Save profile
        </Button>
      </div>
    </SafeForm>
  )
}
