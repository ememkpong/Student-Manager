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
    <div className="min-h-screen bg-[#4c1d95] flex flex-col justify-center items-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-2xl">
        {/* Left: Academic Summary */}
        <div className="lg:col-span-7 p-7 sm:p-10 border-b lg:border-b-0 lg:border-r border-purple-100 flex flex-col justify-between bg-purple-50/75">
          <div className="space-y-6">
            <div>
              <div className="font-display text-2xl font-bold tracking-tight text-purple-950">
                Termflow
              </div>
              <p className="mt-1 text-xs font-medium text-purple-700">
                Student Schedule, Academic Goals &amp; Naira Money Manager
              </p>
            </div>

            <div className="space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                Your semester, built around your courses and goals.
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
                Sign in with Google to enter your student details, add your
                semester courses right away, track academic goals, and manage
                your Naira budget in one purple-and-white workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white border border-purple-200 space-y-1.5">
                <CalendarClock className="h-4 w-4 text-purple-700" />
                <div className="text-xs font-semibold text-slate-900">
                  AI Timetable
                </div>
                <p className="text-xs text-slate-500">
                  Conflict-free daily and weekly schedules from your activities.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-purple-200 space-y-1.5">
                <BookOpen className="h-4 w-4 text-purple-700" />
                <div className="text-xs font-semibold text-slate-900">
                  Courses &amp; Goals
                </div>
                <p className="text-xs text-slate-500">
                  Register your courses at login and track semester goals.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white border border-purple-200 space-y-1.5">
                <Wallet className="h-4 w-4 text-purple-700" />
                <div className="text-xs font-semibold text-slate-900">
                  Naira Budget
                </div>
                <p className="text-xs text-slate-500">
                  Track stipends, recurring bills, and monthly category caps.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-purple-200/70 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-700" />
              Course setup at login
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-700" />
              Clean slate — only your data
            </span>
          </div>
        </div>

        {/* Right: Sign-in Card */}
        <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-center space-y-6 bg-white">
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-semibold text-purple-950">
              Sign in to Termflow
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Log in with Google to save your name, Gmail, semester, level, and
              enrolled courses.
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
            className="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
          >
            <LogIn className="h-4 w-4" />
            <span>
              {signingIn ? "Connecting to Google..." : "Continue with Google"}
            </span>
          </button>

          <p className="text-xs text-slate-500 leading-relaxed">
            After signing in, you&apos;ll enter your academic details and add
            your courses directly before entering your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
