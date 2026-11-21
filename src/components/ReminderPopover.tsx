import { BellRing, Clock, ExternalLink, X } from "lucide-react";
import type { ActiveReminder, AppTab } from "../types";

interface ReminderPopoverProps {
  open: boolean;
  alerts: ActiveReminder[];
  browserAlertsEnabled: boolean;
  onRequestBrowserAlerts: () => void;
  onSnooze: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (tab: AppTab) => void;
  onClose: () => void;
}

export function ReminderPopover({
  open,
  alerts,
  browserAlertsEnabled,
  onRequestBrowserAlerts,
  onSnooze,
  onDismiss,
  onNavigate,
  onClose,
}: ReminderPopoverProps) {
  if (!open) return null;

  const urgencyLabel: Record<ActiveReminder["urgency"], string> = {
    now: "Action Needed",
    soon: "Starting Soon",
    upcoming: "Upcoming",
  };

  const urgencyColor: Record<ActiveReminder["urgency"], string> = {
    now: "text-red-600",
    soon: "text-amber-600",
    upcoming: "text-purple-700",
  };

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute right-4 sm:right-8 top-18 w-[calc(100vw-2rem)] sm:w-[420px] bg-white border border-purple-200 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100 bg-purple-50/70">
          <div>
            <h2 className="font-display text-sm font-semibold text-purple-950">
              Active Reminders
            </h2>
            <p className="text-xs text-slate-600">
              Classes, deadlines, activities, and upcoming bills
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reminders"
            className="p-1.5 text-slate-400 hover:text-purple-800 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Browser alert opt-in bar */}
        <div className="px-4 py-2.5 border-b border-purple-100 flex items-center justify-between gap-3 bg-white">
          <span className="text-xs text-slate-600">
            {browserAlertsEnabled
              ? "Desktop browser alerts enabled"
              : "Get notified before classes start"}
          </span>
          <button
            type="button"
            onClick={onRequestBrowserAlerts}
            className="flex items-center gap-1.5 text-xs font-medium text-purple-700 hover:text-purple-900 whitespace-nowrap shrink-0"
          >
            <BellRing className="h-3.5 w-3.5" />
            <span>
              {browserAlertsEnabled ? "Alerts Active" : "Enable Desktop Alerts"}
            </span>
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-purple-100">
          {alerts.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-800">
                All caught up for now
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Reminders appear automatically before your classes, tasks, and
                bill due dates.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-purple-50/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs mb-1">
                      <span
                        className={`font-semibold ${urgencyColor[alert.urgency]}`}
                      >
                        {urgencyLabel[alert.urgency]}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-500 capitalize">
                        {alert.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {alert.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {alert.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(alert.targetTab);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSnooze(alert.id)}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                  >
                    <Clock className="h-3 w-3" />
                    <span>Snooze 10m</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(alert.id)}
                    className="text-xs text-slate-500 hover:text-slate-900 ml-auto"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
