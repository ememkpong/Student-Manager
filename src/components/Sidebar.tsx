import { useState } from "react";
import {
  BookOpen,
  CalendarClock,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Pencil,
  Trash2,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from "lucide-react";
import type { AppTab, StudentProfile } from "../types";
import type { NextClassInfo } from "../hooks/useReminders";
import { formatTime12h } from "../utils/dateUtils";

interface SidebarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  nextClass: NextClassInfo | null;
  openTasksCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClearWorkspaceData: () => void;
  profile: StudentProfile | null;
  onEditProfile: () => void;
  onSignOut: () => void;
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

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Sidebar({
  activeTab,
  onSelectTab,
  nextClass,
  openTasksCount,
  soundEnabled,
  onToggleSound,
  onClearWorkspaceData,
  profile,
  onEditProfile,
  onSignOut,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [imgError, setImgError] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const displayName = profile?.name?.trim() || "Student";
  const displayGmail = profile?.gmail?.trim() || "";
  const semesterLevel = [profile?.semester?.trim(), profile?.level?.trim()]
    .filter(Boolean)
    .join(" · ");
  const initials = getInitials(displayName);

  const content = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-purple-200 px-4 py-5">
      <div className="space-y-6">
        {/* Brand Zone */}
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => {
              onSelectTab("overview");
              onCloseMobile();
            }}
            className="font-display text-xl font-bold tracking-tight text-purple-950 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 rounded"
          >
            Termflow
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-2 text-slate-500 hover:text-purple-900 rounded-lg"
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
                  isActive
                    ? "bg-purple-700 text-white"
                    : "text-slate-700 hover:bg-purple-50 hover:text-purple-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-purple-100" : "text-purple-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.id === "tasks" && openTasksCount > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive ? "text-purple-100 font-semibold" : "text-purple-700"
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
        <div className="border border-purple-200 rounded-xl p-3.5 bg-purple-50/75">
          <div className="text-xs font-medium text-purple-800 mb-1">
            Next Class
          </div>
          {nextClass ? (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {nextClass.cls.code} · {nextClass.cls.title}
              </div>
              <div className="font-mono text-xs font-medium text-purple-700 tabular-nums">
                {nextClass.countdownText}
              </div>
              <div className="text-xs text-slate-600 truncate">
                {formatTime12h(nextClass.cls.startTime)} ·{" "}
                {nextClass.cls.location || "Room TBA"}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-600">
              No classes scheduled yet. Add your timetable in Classes.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Student Footer */}
      <div className="pt-4 border-t border-purple-100 space-y-3">
        <button
          type="button"
          onClick={() => {
            onEditProfile();
            onCloseMobile();
          }}
          className="w-full flex items-center justify-between gap-2 px-1.5 py-1.5 rounded-lg hover:bg-purple-50 transition-colors text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
          title="Edit your name, Gmail, semester, and level"
        >
          <div className="flex items-center gap-3 min-w-0">
            {profile?.photoURL && !imgError ? (
              <img
                src={profile.photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-9 w-9 rounded-full object-cover border border-purple-200 shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center text-xs font-semibold shrink-0 border border-purple-200">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">
                {displayName}
              </div>
              <div className="text-xs text-slate-600 truncate">
                {semesterLevel || "Set semester · level"}
              </div>
              {displayGmail && (
                <div className="text-[11px] text-slate-400 truncate">
                  {displayGmail}
                </div>
              )}
            </div>
          </div>
          <Pencil className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-700 shrink-0" />
        </button>

        {confirmClear ? (
          <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between gap-2 text-xs">
            <span className="text-purple-950 font-medium">Clear all data?</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-2 py-1 rounded text-slate-600 hover:bg-white"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearWorkspaceData();
                  setConfirmClear(false);
                }}
                className="px-2 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1 px-1">
            <button
              type="button"
              onClick={onToggleSound}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-purple-900 py-1.5 px-2 rounded-md hover:bg-purple-50 transition-colors whitespace-nowrap"
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5 text-purple-700" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span>{soundEnabled ? "Chime" : "Muted"}</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              title="Clear workspace data and start fresh"
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-purple-900 py-1.5 px-2 rounded-md hover:bg-purple-50 transition-colors whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              title="Sign out of Termflow"
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-700 py-1.5 px-2 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        )}
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
            className="fixed inset-0 bg-purple-950/60"
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
