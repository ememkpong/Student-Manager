import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || "An unexpected error occurred.",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Termflow ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let parsedError: string | null = null;
      try {
        const obj = JSON.parse(this.state.errorMessage);
        if (obj && typeof obj.error === "string") {
          parsedError = `${obj.error}${obj.path ? ` (${obj.path})` : ""}`;
        }
      } catch {
        parsedError = null;
      }

      return (
        <div className="min-h-screen bg-[#4c1d95] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-purple-200 rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-700">
              <div className="h-9 w-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-base font-semibold text-slate-900">
                  Something went wrong
                </h1>
                <p className="text-xs text-slate-500">
                  Termflow encountered a data or connection error.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-200 text-xs font-mono text-slate-700 break-words">
              {parsedError || this.state.errorMessage}
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reload Termflow</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
