import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches uncaught render errors and displays a recovery UI instead of
 * crashing the entire app to a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          data-testid="error-boundary"
          className="flex flex-col items-center justify-center h-full gap-4 p-8"
        >
          <h2 className="text-lg font-semibold text-destructive">
            Something went wrong
          </h2>
          <pre className="max-w-xl overflow-auto rounded bg-muted p-4 text-xs text-foreground">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.hash = "#/load";
              window.location.reload();
            }}
            className="cursor-pointer rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
