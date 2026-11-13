"use client"

// The school's identity in the top bar and sidebar (app frame spec, section 5): its
// initials until it uploads a logo, and its name. People in more than one school pick
// another here.
import { CaretDownIcon } from "@phosphor-icons/react"
import Link from "next/link"
import type { JSX } from "react"

import { Icon } from "@akoso/ui/akoso/icon"
import { Monogram } from "@akoso/ui/akoso/monogram"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@akoso/ui/components/dropdown-menu"

export interface SchoolBrandProps {
  /** This school, or null on pages across schools. */
  school: { slug: string; name: string } | null
  /** Every school the person may use. */
  schools: { slug: string; name: string }[]
  /** Where a chosen school leads ("" for the staff home, "/parent" for parents). */
  homePath: string
}

function Identity({ name }: { name: string }): JSX.Element {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Monogram name={name} />
      <span className="truncate text-base font-semibold" title={name}>
        {name}
      </span>
    </span>
  )
}

export function SchoolBrand({
  school,
  schools,
  homePath,
}: SchoolBrandProps): JSX.Element {
  if (school === null) {
    return (
      <Link
        href="/schools"
        className="font-heading text-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Akoso
      </Link>
    )
  }
  const home = `/${encodeURIComponent(school.slug)}${homePath}`
  if (schools.length <= 1) {
    return (
      <Link
        href={home}
        className="flex min-h-11 min-w-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="school-brand"
      >
        <Identity name={school.name} />
      </Link>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="school-switcher"
          />
        }
      >
        <Identity name={school.name} />
        <span className="sr-only">, switch school</span>
        <Icon icon={CaretDownIcon} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Your schools</DropdownMenuLabel>
          {schools.map((option) => (
            <DropdownMenuItem
              key={option.slug}
              render={
                <Link
                  href={`/${encodeURIComponent(option.slug)}`}
                  aria-current={
                    option.slug === school.slug ? "page" : undefined
                  }
                />
              }
            >
              <Identity name={option.name} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
