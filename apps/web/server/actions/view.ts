"use server"

// Switching between the staff and parent views for someone who is both in a school
// (app frame spec, section 1). The choice is a cookie on this device. It only picks
// which frame to show: staff pages still need staff permissions on the server.
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { VIEW_COOKIE } from "@/server/view-cookie"

const input = z.object({
  view: z.enum(["staff", "parent"]),
  school: z.string().regex(/^[a-z0-9-]{1,63}$/),
})

export async function switchViewAction(raw: unknown): Promise<void> {
  const parsed = input.safeParse(raw)
  if (!parsed.success) return
  const { view, school } = parsed.data
  ;(await cookies()).set(VIEW_COOKIE, view, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  })
  redirect(view === "parent" ? `/${school}/parent` : `/${school}`)
}
