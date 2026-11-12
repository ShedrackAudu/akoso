// The preset's fonts, shared by both root layouts. next/font self-hosts them at build
// time, so no request goes to Google from a parent's phone.
import { Figtree, Geist_Mono, Merriweather } from "next/font/google"

export const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})
