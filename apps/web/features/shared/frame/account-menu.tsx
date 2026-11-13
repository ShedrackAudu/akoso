"use client"

// My menu in the top bar (app frame spec, section 5): who I am here, my account, the
// staff or parent view when both apply, the theme, and signing out.
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import type { JSX } from "react"

import { Monogram } from "@akoso/ui/akoso/monogram"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@akoso/ui/components/dropdown-menu"

import { switchViewAction } from "@/server/actions/view"

import { authPost } from "../auth/auth-client"

export interface AccountMenuProps {
  name: string
  /** "Proprietor", "Parent", and so on, in this school; empty across schools. */
  roleLabel: string
  /** The other view, when the person is both staff and parent here. */
  switchTo: { view: "staff" | "parent"; school: string } | null
}

export function AccountMenu({
  name,
  roleLabel,
  switchTo,
}: AccountMenuProps): JSX.Element {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const signOut = () => {
    void authPost("/sign-out").then(() => {
      router.push("/sign-in")
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="account-menu"
          />
        }
      >
        <Monogram name={name} />
        {/* The spoken name: the initials themselves are hidden from screen readers. */}
        <span className="sr-only">Your menu: {name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-base font-semibold text-foreground">
              {name}
            </span>
            {roleLabel !== "" && (
              <span className="block text-sm text-muted-foreground">
                {roleLabel}
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account" />}>
          My account
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/security" />}>
          Sign-in and security
        </DropdownMenuItem>
        {switchTo !== null && (
          <DropdownMenuItem
            onClick={() => {
              void switchViewAction({
                view: switchTo.view,
                school: switchTo.school,
              })
            }}
          >
            {switchTo.view === "parent"
              ? "Switch to parent view"
              : "Switch to staff view"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme ?? "system"}
            onValueChange={(value: string) => {
              setTheme(value)
            }}
          >
            <DropdownMenuRadioItem value="system">
              Device setting
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
