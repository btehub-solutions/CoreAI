"use client"
import { Component, ReactNode } from "react"
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"

interface Props {
  children: ReactNode
  fallbackMessage?: string
}

interface State {
  hasError: boolean
}

export class AIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">
            {this.props.fallbackMessage ?? "AI features are temporarily unavailable."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 text-xs text-emerald-500 hover:text-emerald-400"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
