import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import {
  AlertCircle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  LogIn,
  Wallet,
} from "lucide-react";
import { auth, googleProvider } from "../firebase";

export function AuthGate() {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      if (code === "auth/popup-closed-by-user") {
        setErrorMsg("Sign-in window was closed before completing login.");
      } else if (code === "auth/popup-blocked") {
        setErrorMsg(
          "Your browser blocked the sign-in popup. Please allow popups for this site and try again."
        );
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Could not complete Google sign-in. Please try again."
        );
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9fd] flex flex-col justify-center items-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-violet-200/80 rounded-2xl overflow-hidden">
        {/* Left: Academic Summary */}
        <div className="lg:col-span-7 p-7 sm:p-10 border-b lg:border-b-0 lg:border-r border-violet-100 flex flex-col justify-between bg-violet-50/35">
          <div className="space-y-6">
            <div>
              <div className="font-display text-2xl font-bold tracking-tight text-violet-950">
                Termflow
              </div>
              <p className="mt-1 text-xs font-medium text-violet-700">
                Student Schedule, Task &amp; Naira Money Manager
              </p>
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                Your semester, saved and organized in one place.
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
                Sign in with your Google account to save your name, Gmail,
                semester, academic level, timetable, tasks, and Naira budget
                across sessions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white border border-violet-200/70 space-y-1.5">
                <CalendarClock className="h-4 w-4 text-violet-600" />
                <div className="text-xs font-semibold text-slate-900">
                  AI Timetable
                </div>
                <p className="text-xs text-slate-500">
                  Conflict-free daily and weekly schedules from your activities.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-violet-200/70 space-y-1.5">
                <BookOpen className="h-4 w-4 text-violet-600" />
                <div className="text-xs font-semibold text-slate-900">
                  Class Alerts
                </div>
                <p className="text-xs text-slate-500">
                  Live lecture countdowns and assignment deadline reminders.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-violet-200/70 space-y-1.5">
                <Wallet className="h-4 w-4 text-violet-600" />
                <div className="text-xs font-semibold text-slate-900">
                  Naira Budget
                </div>
                <p className="text-xs text-slate-500">
                  Track stipends, recurring bills, and monthly category caps.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-violet-200/60 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-violet-600" />
              Personal profile saved
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-violet-600" />
              Cloud-synced semester data
            </span>
          </div>
        </div>

        {/* Right: Sign-in Card */}
        <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-center space-y-6">
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              Sign in to Termflow
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Use your Google account to log in and set up your student profile
              details.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={signingIn}
            className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
          >
            <LogIn className="h-4 w-4" />
            <span>
              {signingIn ? "Connecting to Google..." : "Continue with Google"}
            </span>
          </button>

          <p className="text-xs text-slate-400 leading-relaxed">
            Your Gmail from Google Auth will prefill your student profile, and
            you can edit your display name, Gmail, semester, and academic level
            anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
