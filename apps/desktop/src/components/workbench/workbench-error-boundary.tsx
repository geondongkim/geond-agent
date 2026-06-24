import { redactSensitiveTextContent } from "@geond-agent/claude-code-bridge";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "../ui/button.js";

interface WorkbenchErrorBoundaryProps {
  readonly children: ReactNode;
  readonly detail: string;
  readonly resetKey?: string;
  readonly resetLabel: string;
  readonly title: string;
  readonly onReset: () => void;
}

interface WorkbenchErrorBoundaryState {
  readonly detail?: string;
  readonly failed: boolean;
}

export class WorkbenchErrorBoundary extends Component<
  WorkbenchErrorBoundaryProps,
  WorkbenchErrorBoundaryState
> {
  readonly state: WorkbenchErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(error: unknown): WorkbenchErrorBoundaryState {
    return {
      detail: sanitizeBoundaryError(error),
      failed: true
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("Workbench panel render failed", {
      error: sanitizeBoundaryError(error),
      componentStack: redactSensitiveTextContent(info.componentStack ?? "")
    });
  }

  componentDidUpdate(previousProps: WorkbenchErrorBoundaryProps): void {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false, detail: undefined });
    }
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <aside className="inspector-surface" role="alert">
        <section className="review-section">
          <div className="review-section-heading">
            <div className="min-w-0">
              <h3>{this.props.title}</h3>
              <p className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]">
                {this.props.detail}
              </p>
            </div>
          </div>
          {this.state.detail ? (
            <p className="mt-3 rounded-md bg-black/20 p-3 font-mono text-[11px] leading-5 text-[color:var(--ink-soft)]">
              {this.state.detail}
            </p>
          ) : null}
          <Button className="mt-4" variant="outline" onClick={this.props.onReset}>
            {this.props.resetLabel}
          </Button>
        </section>
      </aside>
    );
  }
}

function sanitizeBoundaryError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown workbench panel error.";
  return redactSensitiveTextContent(raw).trim().slice(0, 240);
}
