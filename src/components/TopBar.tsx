import { Bell, Menu, Plus } from "lucide-react";
import type { AppTab } from "../types";

interface TopBarProps {
  activeTab: AppTab;
  alertCount: number;
  remindersOpen: boolean;
  onToggleReminders: () => void;
  onOpenQuickAdd: () => void;
  onOpenMobileMenu: () => void;
  todayLabel: string;
}

const TAB_TITLES: Record<AppTab, string> = {
  overview: "Overview",
  schedule: "Schedule Generator",
  classes: "Classes & Reminders",
  tasks: "To-Do Hub",
  money: "Money & Budget",
};

export function TopBar({
  activeTab,
  alertCount,
  remindersOpen,
  onToggleReminders,
  onOpenQuickAdd,
  onOpenMobileMenu,
  todayLabel,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-purple-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 text-purple-800 hover:text-purple-950 rounded-lg hover:bg-purple-50"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-purple-500 hidden sm:inline whitespace-nowrap">
            Termflow
          </span>
          <span className="text-purple-300 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <h1 className="font-display text-base sm:text-lg font-semibold text-purple-950 truncate">
            {TAB_TITLES[activeTab]}
          </h1>
          <span className="text-purple-300 hidden md:inline" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-slate-500 hidden md:inline whitespace-nowrap tabular-nums">
            {todayLabel}
          </span>
        </div>
      </div>

      {/* Right: Reminder Trigger & Primary CTA */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleReminders}
          aria-expanded={remindersOpen}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
            remindersOpen
              ? "border-purple-700 bg-purple-50 text-purple-900"
              : alertCount > 0
              ? "border-amber-300 bg-amber-50/70 text-amber-800 hover:bg-amber-100/70"
              : "border-purple-200 bg-white text-purple-900 hover:bg-purple-50"
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>Reminders</span>
          <span className="font-mono tabular-nums font-semibold">
            ({alertCount})
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 text-white text-xs sm:text-sm font-medium hover:bg-purple-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          <span>Quick Add</span>
        </button>
      </div>
    </header>
  );
}
