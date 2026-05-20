import Link from "next/link"

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 font-heading text-2xl font-semibold text-forest">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm text-cream">Ow</span>
      Owo
    </Link>
  )
}
