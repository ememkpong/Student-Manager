import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BudgetLimits, Transaction } from "../types";
import {
  addDaysToISO,
  formatCompactCurrency,
  formatCurrency,
  formatISODate,
  getCurrentWeekDates,
  WEEKDAYS,
} from "../utils/dateUtils";

interface WeeklySpendingChartProps {
  transactions: Transaction[];
  budgetLimits: BudgetLimits;
  onNavigateToMoney: () => void;
}

interface DayPoint {
  dateISO: string;
  label: string;
  fullLabel: string;
  spent: number;
  budgetLimit: number;
  overLimit: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    dataKey?: string;
    payload?: DayPoint;
  }>;
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const diff = point.budgetLimit - point.spent;

  return (
    <div className="bg-white border border-violet-200 rounded-lg shadow-md px-3.5 py-2.5 text-xs space-y-1.5">
      <div className="font-semibold text-slate-900">{point.fullLabel}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-600">Spent</span>
        <span
          className={`font-mono font-semibold tabular-nums ${
            point.overLimit ? "text-rose-600" : "text-violet-700"
          }`}
        >
          {formatCurrency(point.spent)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-600">Daily Limit</span>
        <span className="font-mono text-slate-700 tabular-nums">
          {formatCurrency(point.budgetLimit)}
        </span>
      </div>
      <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-4">
        <span className="text-slate-500">Status</span>
        <span
          className={`font-mono font-medium tabular-nums ${
            diff < 0 ? "text-red-600" : "text-green-700"
          }`}
        >
          {diff < 0
            ? `Over by ${formatCurrency(Math.abs(diff))}`
            : `Under by ${formatCurrency(diff)}`}
        </span>
      </div>
    </div>
  );
}

export function WeeklySpendingChart({
  transactions,
  budgetLimits,
  onNavigateToMoney,
}: WeeklySpendingChartProps) {
  const [rangeMode, setRangeMode] = useState<"rolling" | "calendar">("rolling");

  const today = new Date();
  const todayISO = formatISODate(today);
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();
  const dailyBudgetLimit = Math.round(
    (budgetLimits.monthlyCap || 0) / Math.max(1, daysInMonth)
  );

  const chartData = useMemo<DayPoint[]>(() => {
    const expenseByDate = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      expenseByDate.set(
        tx.date,
        (expenseByDate.get(tx.date) || 0) + tx.amount
      );
    });

    const dates: string[] = [];
    if (rangeMode === "rolling") {
      for (let i = -6; i <= 0; i++) {
        dates.push(addDaysToISO(todayISO, i));
      }
    } else {
      const weekDates = getCurrentWeekDates(today);
      WEEKDAYS.forEach((wd) => dates.push(weekDates[wd]));
    }

    return dates.map((iso) => {
      const [y, m, d] = iso.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      const shortDay = dt.toLocaleDateString("en-US", { weekday: "short" });
      const shortDate = dt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const spent = expenseByDate.get(iso) || 0;
      return {
        dateISO: iso,
        label: iso === todayISO ? `Today` : shortDay,
        fullLabel: `${shortDay}, ${shortDate}`,
        spent,
        budgetLimit: dailyBudgetLimit,
        overLimit: dailyBudgetLimit > 0 && spent > dailyBudgetLimit,
      };
    });
  }, [transactions, dailyBudgetLimit, rangeMode, todayISO]);

  const weeklySpentTotal = useMemo(
    () => chartData.reduce((sum, d) => sum + d.spent, 0),
    [chartData]
  );
  const weeklyBudgetTotal = dailyBudgetLimit * 7;
  const isWeeklyOver =
    weeklyBudgetTotal > 0 && weeklySpentTotal > weeklyBudgetTotal;

  return (
    <section className="bg-white border border-purple-200 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-purple-950">
            Weekly Spending vs. Daily Limit
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Daily Naira expenses vs.{" "}
            <span className="font-mono text-violet-800">
              {formatCurrency(dailyBudgetLimit)}/day
            </span>{" "}
            allowance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-purple-50 rounded-lg border border-purple-100">
            <button
              type="button"
              onClick={() => setRangeMode("rolling")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                rangeMode === "rolling"
                  ? "bg-purple-700 text-white shadow-sm"
                  : "text-purple-900 hover:bg-white"
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setRangeMode("calendar")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                rangeMode === "calendar"
                  ? "bg-purple-700 text-white shadow-sm"
                  : "text-purple-900 hover:bg-white"
              }`}
            >
              This Week
            </button>
          </div>

          <button
            type="button"
            onClick={onNavigateToMoney}
            className="text-xs font-medium text-purple-700 hover:text-purple-900 whitespace-nowrap"
          >
            Open Ledger →
          </button>
        </div>
      </div>

      {/* Key Weekly Totals & Inline Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-violet-100 text-xs">
        <div className="flex flex-wrap items-center gap-3 tabular-nums">
          <div>
            <span className="text-slate-500">7-Day Total: </span>
            <span className="font-mono font-semibold text-violet-900">
              {formatCurrency(weeklySpentTotal)}
            </span>
          </div>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <div>
            <span className="text-slate-500">Weekly Limit: </span>
            <span className="font-mono font-medium text-slate-600">
              {formatCurrency(weeklyBudgetTotal)}
            </span>
          </div>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span
            className={`font-medium ${
              isWeeklyOver ? "text-rose-600" : "text-emerald-700"
            }`}
          >
            {isWeeklyOver ? "Above weekly limit" : "Within weekly limit"}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-violet-600" />
            <span>Within Limit</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-rose-600" />
            <span>Over Limit</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-violet-200 border border-violet-300" />
            <span>Daily Budget</span>
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart */}
      <div className="h-64 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#EDE9FE"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748B", fontSize: 12 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompactCurrency}
              tick={{ fill: "#64748B", fontSize: 11 }}
              width={56}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "rgba(245, 243, 255, 0.7)" }}
            />
            {dailyBudgetLimit > 0 && (
              <ReferenceLine
                y={dailyBudgetLimit}
                stroke="#A78BFA"
                strokeDasharray="4 4"
              />
            )}
            <Bar
              dataKey="budgetLimit"
              name="Daily Budget Limit"
              fill="#DDD6FE"
              radius={[5, 5, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="spent"
              name="Spent"
              radius={[5, 5, 0, 0]}
              maxBarSize={22}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.dateISO}
                  fill={entry.overLimit ? "#E11D48" : "#7C3AED"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
