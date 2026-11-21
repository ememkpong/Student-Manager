import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveReminder,
  RecurringBill,
  ScheduleBlock,
  StudentClass,
  TodoTask,
} from "../types";
import {
  formatCurrency,
  formatISODate,
  formatTime12h,
  getCurrentMonthPrefix,
  getWeekdayFromDate,
  minutesToDurationLabel,
  timeToMinutes,
  WEEKDAYS,
} from "../utils/dateUtils";

export interface NextClassInfo {
  cls: StudentClass;
  dayLabel: string;
  isToday: boolean;
  inProgress: boolean;
  minutesUntilStart: number;
  minutesRemaining: number;
  countdownText: string;
}

function playGentleChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      gain.gain.setValueAtTime(0.001, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.42);
    });
  } catch {
    // Ignore audio context restrictions
  }
}

export function useReminders(params: {
  classes: StudentClass[];
  tasks: TodoTask[];
  scheduleBlocks: ScheduleBlock[];
  bills: RecurringBill[];
  soundEnabled: boolean;
  browserAlertsEnabled: boolean;
}) {
  const {
    classes,
    tasks,
    scheduleBlocks,
    bills,
    soundEnabled,
    browserAlertsEnabled,
  } = params;

  const [now, setNow] = useState<Date>(() => new Date());
  const [dismissedIds, setDismissedIds] = useState<Record<string, number>>({});
  const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  const nextClass = useMemo<NextClassInfo | null>(() => {
    if (classes.length === 0) return null;

    const todayWd = getWeekdayFromDate(now);
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const todayIndex = WEEKDAYS.indexOf(todayWd);

    let best: {
      cls: StudentClass;
      dayOffset: number;
      dayLabel: string;
      inProgress: boolean;
      minutesUntilStart: number;
      minutesRemaining: number;
    } | null = null;

    for (let offset = 0; offset < 7; offset++) {
      const targetWd = WEEKDAYS[(todayIndex + offset) % 7];
      for (const cls of classes) {
        if (!cls.days.includes(targetWd)) continue;
        const startMin = timeToMinutes(cls.startTime);
        const endMin = timeToMinutes(cls.endTime);

        if (offset === 0) {
          if (currentMin >= startMin && currentMin < endMin) {
            const rem = endMin - currentMin;
            const candidate = {
              cls,
              dayOffset: 0,
              dayLabel: "Today",
              inProgress: true,
              minutesUntilStart: 0,
              minutesRemaining: rem,
            };
            if (!best || best.dayOffset > 0 || !best.inProgress) {
              best = candidate;
            }
          } else if (startMin > currentMin) {
            const diff = startMin - currentMin;
            const candidate = {
              cls,
              dayOffset: 0,
              dayLabel: "Today",
              inProgress: false,
              minutesUntilStart: diff,
              minutesRemaining: endMin - startMin,
            };
            if (
              !best ||
              (!best.inProgress &&
                (best.dayOffset > 0 || diff < best.minutesUntilStart))
            ) {
              best = candidate;
            }
          }
        } else {
          const totalMinutesAway = offset * 1440 + (startMin - currentMin);
          const candidate = {
            cls,
            dayOffset: offset,
            dayLabel: offset === 1 ? "Tomorrow" : targetWd,
            inProgress: false,
            minutesUntilStart: totalMinutesAway,
            minutesRemaining: endMin - startMin,
          };
          if (
            !best ||
            (!best.inProgress && totalMinutesAway < best.minutesUntilStart)
          ) {
            best = candidate;
          }
        }
      }
    }

    if (!best) return null;

    const countdownText = best.inProgress
      ? `In progress · ${minutesToDurationLabel(best.minutesRemaining)} left`
      : best.dayOffset === 0
      ? `Starts in ${minutesToDurationLabel(best.minutesUntilStart)}`
      : `${best.dayLabel} at ${formatTime12h(best.cls.startTime)}`;

    return {
      cls: best.cls,
      dayLabel: best.dayLabel,
      isToday: best.dayOffset === 0,
      inProgress: best.inProgress,
      minutesUntilStart: best.minutesUntilStart,
      minutesRemaining: best.minutesRemaining,
      countdownText,
    };
  }, [classes, now]);

  const activeAlerts = useMemo<ActiveReminder[]>(() => {
    const alerts: ActiveReminder[] = [];
    const todayWd = getWeekdayFromDate(now);
    const todayISO = formatISODate(now);
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const nowTs = now.getTime();
    const monthPrefix = getCurrentMonthPrefix(now);

    // 1. Class reminders today
    classes.forEach((cls) => {
      if (!cls.remindersEnabled || !cls.days.includes(todayWd)) return;
      const startMin = timeToMinutes(cls.startTime);
      const endMin = timeToMinutes(cls.endTime);
      const diff = startMin - currentMin;
      if (diff >= 0 && diff <= cls.remindMinutesBefore) {
        alerts.push({
          id: `rem-cls-${cls.id}-${todayISO}`,
          type: "class",
          title: `${cls.code}: ${cls.title}`,
          subtitle: `${
            diff === 0 ? "Starting now" : `Starts in ${diff} min`
          } · ${cls.location || "Check room"} · ${formatTime12h(cls.startTime)}`,
          urgency: diff <= 5 ? "now" : "soon",
          minutesRemaining: diff,
          targetTab: "classes",
          relatedId: cls.id,
        });
      } else if (currentMin >= startMin && currentMin < endMin) {
        alerts.push({
          id: `rem-cls-live-${cls.id}-${todayISO}`,
          type: "class",
          title: `${cls.code} in session`,
          subtitle: `${endMin - currentMin} min remaining · ${cls.location}`,
          urgency: "now",
          minutesRemaining: 0,
          targetTab: "classes",
          relatedId: cls.id,
        });
      }
    });

    // 2. Scheduled activity blocks starting within 15 minutes
    scheduleBlocks.forEach((blk) => {
      if (blk.completed || blk.sourceType === "class" || blk.day !== todayWd)
        return;
      const startMin = timeToMinutes(blk.startTime);
      const diff = startMin - currentMin;
      if (diff >= 0 && diff <= 15) {
        alerts.push({
          id: `rem-blk-${blk.id}-${todayISO}`,
          type: "schedule",
          title: blk.title,
          subtitle: `${
            diff === 0 ? "Scheduled now" : `Starts in ${diff} min`
          } · ${formatTime12h(blk.startTime)}`,
          urgency: diff <= 5 ? "now" : "soon",
          minutesRemaining: diff,
          targetTab: "schedule",
          relatedId: blk.id,
        });
      }
    });

    // 3. Pending tasks due today or overdue
    tasks.forEach((tsk) => {
      if (tsk.completed) return;
      if (tsk.dueDate < todayISO) {
        alerts.push({
          id: `rem-tsk-over-${tsk.id}`,
          type: "task",
          title: tsk.title,
          subtitle: `Overdue since ${tsk.dueDate} · ${tsk.priority} priority`,
          urgency: "now",
          minutesRemaining: -1,
          targetTab: "tasks",
          relatedId: tsk.id,
        });
      } else if (tsk.dueDate === todayISO) {
        const dueMin = timeToMinutes(tsk.dueTime || "23:59");
        const diff = dueMin - currentMin;
        if (diff <= Math.max(120, tsk.remindBeforeMinutes)) {
          alerts.push({
            id: `rem-tsk-due-${tsk.id}-${todayISO}`,
            type: "task",
            title: tsk.title,
            subtitle:
              diff <= 0
                ? `Due time passed (${formatTime12h(tsk.dueTime)})`
                : `Due today in ${minutesToDurationLabel(diff)}`,
            urgency: diff <= 60 ? "now" : "soon",
            minutesRemaining: diff,
            targetTab: "tasks",
            relatedId: tsk.id,
          });
        }
      }
    });

    // 4. Upcoming bills due within 3 days
    const todayDay = now.getDate();
    bills.forEach((bill) => {
      if (bill.lastPaidMonth === monthPrefix) return;
      const daysUntil = bill.dueDay - todayDay;
      if (daysUntil >= -3 && daysUntil <= 3) {
        alerts.push({
          id: `rem-bill-${bill.id}-${monthPrefix}`,
          type: "bill",
          title: `Bill due: ${bill.title}`,
          subtitle:
            daysUntil < 0
              ? `${formatCurrency(bill.amount)} · Overdue by ${Math.abs(daysUntil)} day(s)`
              : daysUntil === 0
              ? `${formatCurrency(bill.amount)} · Due today`
              : `${formatCurrency(bill.amount)} · Due in ${daysUntil} day(s)`,
          urgency: daysUntil <= 0 ? "now" : "upcoming",
          minutesRemaining: daysUntil * 1440,
          targetTab: "money",
          relatedId: bill.id,
        });
      }
    });

    return alerts
      .filter((a) => {
        if (dismissedIds[a.id]) return false;
        const snoozeEnd = snoozedUntil[a.id];
        if (snoozeEnd && nowTs < snoozeEnd) return false;
        return true;
      })
      .sort((a, b) => a.minutesRemaining - b.minutesRemaining);
  }, [classes, tasks, scheduleBlocks, bills, now, dismissedIds, snoozedUntil]);

  // Trigger optional sound & desktop notification for newly arrived urgent alerts
  useEffect(() => {
    const urgent = activeAlerts.filter(
      (a) => a.urgency === "now" || a.urgency === "soon"
    );
    let hasNew = false;

    urgent.forEach((alert) => {
      if (!notifiedIdsRef.current.has(alert.id)) {
        notifiedIdsRef.current.add(alert.id);
        hasNew = true;
        if (
          browserAlertsEnabled &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(`Termflow Reminder: ${alert.title}`, {
              body: alert.subtitle,
            });
          } catch {
            // Ignore notification errors in restricted iframes
          }
        }
      }
    });

    if (hasNew && soundEnabled) {
      playGentleChime();
    }
  }, [activeAlerts, browserAlertsEnabled, soundEnabled]);

  const dismissAlert = useCallback((id: string) => {
    setDismissedIds((prev) => ({ ...prev, [id]: Date.now() }));
  }, []);

  const snoozeAlert = useCallback((id: string, minutes = 10) => {
    setSnoozedUntil((prev) => ({
      ...prev,
      [id]: Date.now() + minutes * 60 * 1000,
    }));
  }, []);

  return {
    now,
    nextClass,
    activeAlerts,
    dismissAlert,
    snoozeAlert,
  };
}
