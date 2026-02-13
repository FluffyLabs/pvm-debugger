import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error);
    console.error("Component stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background text-foreground">
          <div className="max-w-2xl w-full bg-destructive/10 border border-destructive rounded-lg p-6">
            <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Error:</h2>
              <pre className="bg-muted p-3 rounded text-sm overflow-auto max-h-32">
                {this.state.error?.message || "Unknown error"}
              </pre>
            </div>
            {this.state.error?.stack && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">Stack trace:</h2>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">{this.state.error.stack}</pre>
              </div>
            )}
            {this.state.errorInfo?.componentStack && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">Component stack:</h2>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.hash = "#/load";
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
