import type { ComponentProps, JSX } from "react"

import { Input } from "@akoso/ui/components/input"
import { Label } from "@akoso/ui/components/label"

/** A labelled input. */
export function Field({
  id,
  label,
  className,
  ...props
}: ComponentProps<"input"> & { id: string; label: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className={className} {...props} />
    </div>
  )
}
