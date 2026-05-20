import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md bg-forest px-5 py-2 text-sm font-semibold text-cream transition hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
