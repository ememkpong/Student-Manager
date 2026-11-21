import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BUDGET_CATEGORIES } from "../data/defaultData";
import type { BudgetCategoryName, Transaction } from "../types";
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonthLabel,
  getCurrentMonthPrefix,
  getPreviousMonthPrefix,
} from "../utils/dateUtils";

interface CategorySpendingChartProps {
  transactions: Transaction[];
  onNavigateToMoney: () => void;
}

interface CategoryPoint {
  category: BudgetCategoryName;
  shortLabel: string;
  current: number;
  previous: number;
}

const SHORT_CATEGORY_LABELS: Record<BudgetCategoryName, string> = {
  "Dining & Groceries": "Dining",
  "Housing & Utilities": "Housing",
  "Textbooks & Study": "Study",
  Transit: "Transit",
  "Personal & Leisure": "Leisure",
  Other: "Other",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: CategoryPoint;
  }>;
  currentMonthLabel: string;
  prevMonthLabel: string;
}

function CategoryTooltip({
  active,
  payload,
  currentMonthLabel,
  prevMonthLabel,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const diff = point.current - point.previous;

  return (
    <div className="bg-white border border-violet-200 rounded-lg shadow-md px-3.5 py-2.5 text-xs space-y-1.5">
      <div className="font-semibold text-slate-900">{point.category}</div>
      <div className="flex items-center justify-between gap-5">
        <span className="text-slate-600">{currentMonthLabel}</span>
        <span className="font-mono font-semibold text-violet-700 tabular-nums">
          {formatCurrency(point.current)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-5">
        <span className="text-slate-600">{prevMonthLabel}</span>
        <span className="font-mono text-slate-700 tabular-nums">
          {formatCurrency(point.previous)}
        </span>
      </div>
      <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-5">
        <span className="text-slate-500">Change</span>
        <span
          className={`font-mono font-medium tabular-nums ${
            diff > 0
              ? "text-rose-600"
              : diff < 0
              ? "text-emerald-700"
              : "text-slate-500"
          }`}
        >
          {diff > 0
            ? `+${formatCurrency(diff)}`
            : diff < 0
            ? `-${formatCurrency(Math.abs(diff))}`
            : "No change"}
        </span>
      </div>
    </div>
  );
}

export function CategorySpendingChart({
  transactions,
  onNavigateToMoney,
}: CategorySpendingChartProps) {
  const now = new Date();
  const currentPrefix = getCurrentMonthPrefix(now);
  const prevPrefix = getPreviousMonthPrefix(now);
  const currentMonthLabel = formatMonthLabel(currentPrefix);
  const prevMonthLabel = formatMonthLabel(prevPrefix);

  const { chartData, currentTotal, prevTotal, pctChange } = useMemo(() => {
    const currentTotals = new Map<BudgetCategoryName, number>();
    const prevTotals = new Map<BudgetCategoryName, number>();

    BUDGET_CATEGORIES.forEach((cat) => {
      currentTotals.set(cat, 0);
      prevTotals.set(cat, 0);
    });

    transactions.forEach((tx) => {
      if (tx.type !== "expense" || tx.category === "Income") return;
      if (tx.date.startsWith(currentPrefix)) {
        currentTotals.set(
          tx.category,
          (currentTotals.get(tx.category) || 0) + tx.amount
        );
      } else if (tx.date.startsWith(prevPrefix)) {
        prevTotals.set(
          tx.category,
          (prevTotals.get(tx.category) || 0) + tx.amount
        );
      }
    });

    const data: CategoryPoint[] = BUDGET_CATEGORIES.map((cat) => ({
      category: cat,
      shortLabel: SHORT_CATEGORY_LABELS[cat],
      current: currentTotals.get(cat) || 0,
      previous: prevTotals.get(cat) || 0,
    }));

    const currSum = data.reduce((s, d) => s + d.current, 0);
    const prevSum = data.reduce((s, d) => s + d.previous, 0);
    const pct =
      prevSum > 0 ? ((currSum - prevSum) / prevSum) * 100 : null;

    return {
      chartData: data,
      currentTotal: currSum,
      prevTotal: prevSum,
      pctChange: pct,
    };
  }, [transactions, currentPrefix, prevPrefix]);

  return (
    <section className="bg-white border border-violet-200/80 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Monthly Spending by Category
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentMonthLabel} compared against {prevMonthLabel} in Naira (₦)
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToMoney}
          className="text-xs font-medium text-violet-700 hover:text-violet-900 whitespace-nowrap self-start sm:self-center"
        >
          Category Breakdown →
        </button>
      </div>

      {/* Summary & Inline Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-violet-100 text-xs">
        <div className="flex flex-wrap items-center gap-3 tabular-nums">
          <div>
            <span className="text-slate-500">{currentMonthLabel}: </span>
            <span className="font-mono font-semibold text-violet-900">
              {formatCurrency(currentTotal)}
            </span>
          </div>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <div>
            <span className="text-slate-500">{prevMonthLabel}: </span>
            <span className="font-mono font-medium text-slate-600">
              {formatCurrency(prevTotal)}
            </span>
          </div>
          {pctChange !== null && (
            <>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span
                className={`font-medium ${
                  pctChange > 0 ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                {pctChange > 0
                  ? `Up ${Math.abs(pctChange).toFixed(0)}% vs. last month`
                  : `Down ${Math.abs(pctChange).toFixed(0)}% vs. last month`}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-violet-600" />
            <span>{currentMonthLabel}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-xs bg-violet-200 border border-violet-300" />
            <span>{prevMonthLabel}</span>
          </span>
        </div>
      </div>

      {/* Recharts Category Comparison Bar Chart */}
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
              dataKey="shortLabel"
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
              content={
                <CategoryTooltip
                  currentMonthLabel={currentMonthLabel}
                  prevMonthLabel={prevMonthLabel}
                />
              }
              cursor={{ fill: "rgba(245, 243, 255, 0.7)" }}
            />
            <Bar
              dataKey="previous"
              name={prevMonthLabel}
              fill="#DDD6FE"
              radius={[5, 5, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="current"
              name={currentMonthLabel}
              fill="#7C3AED"
              radius={[5, 5, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
