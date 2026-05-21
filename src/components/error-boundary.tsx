"use client"

import { Component, type ReactNode } from "react"
import Link from "next/link"

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cream px-5 text-center text-charcoal">
          <div className="relative flex h-14 w-14">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-30" />
            <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-clay text-cream text-2xl font-bold">!</span>
          </div>
          <h1 className="font-heading text-4xl text-forest">Something went wrong</h1>
          <p className="max-w-sm text-sm leading-6 text-charcoal/70">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-md bg-forest px-5 py-2.5 text-sm font-semibold text-cream"
            >
              Try again
            </button>
            <Link href="/" className="rounded-md border border-forest/20 px-5 py-2.5 text-sm font-semibold text-forest">
              Go home
            </Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
