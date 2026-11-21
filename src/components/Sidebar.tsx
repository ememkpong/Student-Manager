import { useState } from "react";
import {
  BookOpen,
  CalendarClock,
  CheckSquare,
  LayoutDashboard,
  RotateCcw,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from "lucide-react";
import type { AppTab } from "../types";
import type { NextClassInfo } from "../hooks/useReminders";
import { formatTime12h } from "../utils/dateUtils";

interface SidebarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  nextClass: NextClassInfo | null;
  openTasksCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetDemoData: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: AppTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "schedule", label: "Schedule", icon: CalendarClock },
  { id: "classes", label: "Classes", icon: BookOpen },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "money", label: "Money", icon: Wallet },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  nextClass,
  openTasksCount,
  soundEnabled,
  onToggleSound,
  onResetDemoData,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [imgError, setImgError] = useState(false);

  const content = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-violet-200/70 px-4 py-5">
      <div className="space-y-6">
        {/* Brand Zone */}
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => {
              onSelectTab("overview");
              onCloseMobile();
            }}
            className="font-display text-xl font-bold tracking-tight text-violet-950 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 rounded"
          >
            Termflow
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 ${
                  isActive
                    ? "bg-violet-50 text-violet-800"
                    : "text-slate-600 hover:bg-violet-50/50 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-violet-600" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.id === "tasks" && openTasksCount > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive ? "text-violet-700 font-semibold" : "text-slate-400"
                    }`}
                  >
                    {openTasksCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Next Class Live Countdown Box */}
        <div className="border border-violet-200/80 rounded-xl p-3.5 bg-violet-50/45">
          <div className="text-xs font-medium text-violet-700 mb-1">
            Next Class
          </div>
          {nextClass ? (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {nextClass.cls.code} · {nextClass.cls.title}
              </div>
              <div className="font-mono text-xs font-medium text-violet-700 tabular-nums">
                {nextClass.countdownText}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {formatTime12h(nextClass.cls.startTime)} ·{" "}
                {nextClass.cls.location || "Room TBA"}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              No classes scheduled yet. Add your timetable in Classes.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Student Footer */}
      <div className="pt-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-3 px-1">
          {!imgError ? (
            <img
              src="/src/assets/images/avatar_student_profile_1795272055313.jpg"
              alt="Student profile portrait"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-9 w-9 rounded-full object-cover border border-violet-200 shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-violet-100 text-violet-800 flex items-center justify-center text-xs font-semibold shrink-0">
              ST
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">
              Alex Rivera
            </div>
            <div className="text-xs text-slate-500 truncate">
              Fall Semester · Junior
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={onToggleSound}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 py-1.5 px-2 rounded-md hover:bg-violet-50 transition-colors whitespace-nowrap"
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-violet-600" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>{soundEnabled ? "Chime On" : "Chime Off"}</span>
          </button>

          <button
            type="button"
            onClick={onResetDemoData}
            title="Restore sample semester data"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 py-1.5 px-2 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/30"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
