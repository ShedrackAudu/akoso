"use client"

// The admin app's frame (app frame spec, section 4): a sidebar on computers and a menu
// button on phones, headed Akoso Admin, with the member's name, roles and sign-out.
import {
  FingerprintIcon,
  HouseIcon,
  ListMagnifyingGlassIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import type { JSX, ReactNode } from "react"

import {
  AppFrame,
  type FrameIcons,
  type FrameLink,
  type FrameNavItem,
} from "@akoso/ui/akoso/app-frame"
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

import { signOut } from "./passkey-client"

const FrameLinkComponent: FrameLink = (props) => <Link {...props} />

/** The icons the admin navigation uses (app/(framed)/layout.tsx). */
const ADMIN_ICONS: FrameIcons = {
  home: HouseIcon,
  people: UsersThreeIcon,
  log: ListMagnifyingGlassIcon,
  passkey: FingerprintIcon,
}

function AdminAccount({
  name,
  roleLabel,
}: {
  name: string
  roleLabel: string
}): JSX.Element {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
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
            <span className="block text-sm text-muted-foreground">
              {roleLabel}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/security" />}>
          My passkeys and recovery codes
        </DropdownMenuItem>
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
        <DropdownMenuItem
          onClick={() => {
            void signOut().then(() => {
              router.push("/sign-in")
            })
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AdminFrame({
  name,
  roleLabel,
  nav,
  children,
}: {
  name: string
  roleLabel: string
  nav: FrameNavItem[]
  children: ReactNode
}): JSX.Element {
  const pathname = usePathname()
  return (
    <AppFrame
      pathname={pathname}
      link={FrameLinkComponent}
      icons={ADMIN_ICONS}
      brand={
        <Link
          href="/"
          className="font-heading text-lg font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Akoso Admin
        </Link>
      }
      account={<AdminAccount name={name} roleLabel={roleLabel} />}
      nav={nav}
      bottomNav={null}
    >
      {children}
    </AppFrame>
  )
}
