'use client'

import { Component } from 'react'

// Contains a crashing demo: one demo's error must never unmount the
// rest of the chapter. The fallback offers a local reload of just that demo.

export class DemoBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mt-8 rounded-xl bg-rose-50 p-4 ring-1 ring-rose-500/20 dark:bg-rose-500/5 dark:ring-rose-500/20">
          <p className="text-sm/6 text-rose-700 dark:text-rose-300">
            This demo hit an error and shut itself down — the rest of the page is
            unaffected.
          </p>
          <p className="mt-1 font-mono text-xs text-rose-600/70 dark:text-rose-400/70">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 rounded-lg px-3 py-1.5 text-sm text-rose-700 ring-1 ring-rose-500/30 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            Reload this demo
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
