import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { BUDGET_CATEGORIES } from "../data/defaultData";
import type {
  BudgetCategoryName,
  BudgetLimits,
  RecurringBill,
  Transaction,
} from "../types";
import {
  formatCurrency,
  formatFriendlyDate,
  formatISODate,
  getCurrentMonthPrefix,
  getDaysRemainingInMonth,
} from "../utils/dateUtils";

interface MoneyViewProps {
  transactions: Transaction[];
  budgetLimits: BudgetLimits;
  bills: RecurringBill[];
  onAddTransaction: (tx: Omit<Transaction, "id">) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateBudgetLimits: (limits: BudgetLimits) => void;
  onAddBill: (bill: Omit<RecurringBill, "id">) => void;
  onPayBill: (bill: RecurringBill) => void;
  onDeleteBill: (id: string) => void;
}

export function MoneyView({
  transactions,
  budgetLimits,
  bills,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateBudgetLimits,
  onAddBill,
  onPayBill,
  onDeleteBill,
}: MoneyViewProps) {
  const today = new Date();
  const todayISO = formatISODate(today);
  const monthPrefix = getCurrentMonthPrefix(today);
  const daysRemaining = getDaysRemainingInMonth(today);

  // Filters
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">(
    "all"
  );
  const [catFilter, setCatFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Log Transaction Form
  const [showTxForm, setShowTxForm] = useState(false);
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [txCategory, setTxCategory] =
    useState<BudgetCategoryName>("Dining & Groceries");
  const [txDate, setTxDate] = useState(todayISO);
  const [txNotes, setTxNotes] = useState("");

  // Edit Budgets Toggle
  const [editingBudgets, setEditingBudgets] = useState(false);
  const [draftLimits, setDraftLimits] = useState<BudgetLimits>(budgetLimits);

  // Add Bill Form
  const [showBillForm, setShowBillForm] = useState(false);
  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDay, setBillDueDay] = useState(15);
  const [billCategory, setBillCategory] =
    useState<BudgetCategoryName>("Housing & Utilities");

  const monthStats = useMemo(() => {
    const monthTxs = transactions.filter((t) => t.date.startsWith(monthPrefix));
    const spent = monthTxs
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const income = monthTxs
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const remaining = budgetLimits.monthlyCap - spent;
    const safeDaily = Math.max(0, remaining / daysRemaining);
    const netCashflow = income - spent;

    const byCategory = {} as Record<BudgetCategoryName, number>;
    BUDGET_CATEGORIES.forEach((cat) => {
      byCategory[cat] = monthTxs
        .filter((t) => t.type === "expense" && t.category === cat)
        .reduce((sum, t) => sum + t.amount, 0);
    });

    return { spent, income, remaining, safeDaily, netCashflow, byCategory };
  }, [transactions, budgetLimits, monthPrefix, daysRemaining]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (catFilter !== "All" && t.category !== catFilter) return false;
        if (
          q &&
          !t.title.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q) &&
          !(t.notes || "").toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, typeFilter, catFilter, searchQuery]);

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(txAmount);
    if (!txTitle.trim() || Number.isNaN(amt) || amt <= 0) return;
    onAddTransaction({
      title: txTitle.trim(),
      amount: amt,
      type: txType,
      category: txType === "income" ? "Income" : txCategory,
      date: txDate,
      notes: txNotes.trim() || undefined,
    });
    setTxTitle("");
    setTxAmount("");
    setTxNotes("");
    setShowTxForm(false);
  };

  const handleSaveBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBudgetLimits(draftLimits);
    setEditingBudgets(false);
  };

  const handleBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(billAmount);
    if (!billTitle.trim() || Number.isNaN(amt) || amt <= 0) return;
    onAddBill({
      title: billTitle.trim(),
      amount: amt,
      dueDay: Math.min(31, Math.max(1, Number(billDueDay) || 1)),
      category: billCategory,
    });
    setBillTitle("");
    setBillAmount("");
    setShowBillForm(false);
  };

  const handleDownloadCsv = () => {
    const header = "Date,Title,Type,Category,Amount (NGN),Notes\n";
    const rows = filteredTransactions
      .map(
        (t) =>
          `${t.date},"${t.title.replace(/"/g, '""')}",${t.type},"${t.category}",${
            t.type === "expense" ? -t.amount.toFixed(2) : t.amount.toFixed(2)
          },"${(t.notes || "").replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `termflow-ledger-${monthPrefix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 4-Column Financial Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Monthly Budget Remaining (NGN)
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
              monthStats.remaining < 0 ? "text-red-600" : "text-slate-900"
            }`}
          >
            {formatCurrency(monthStats.remaining)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Cap: {formatCurrency(budgetLimits.monthlyCap)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Spent This Month
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(monthStats.spent)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            {budgetLimits.monthlyCap > 0
              ? `${((monthStats.spent / budgetLimits.monthlyCap) * 100).toFixed(
                  0
                )}% of monthly cap`
              : "No cap set"}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Income & Stipends
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-green-700 tabular-nums">
            {formatCurrency(monthStats.income)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Net cashflow:{" "}
            {monthStats.netCashflow >= 0
              ? `+${formatCurrency(monthStats.netCashflow)}`
              : formatCurrency(monthStats.netCashflow)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Safe Daily Spend
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-violet-700 tabular-nums">
            {formatCurrency(monthStats.safeDaily)}
          </div>
          <div className="mt-1 text-xs text-slate-500 tabular-nums">
            Across {daysRemaining} days left in month
          </div>
        </div>
      </section>

      {/* Category Budgets + Recurring Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Category Budgets */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Category Budgets
              </h2>
              <p className="text-xs text-slate-500">
                Monthly spending breakdown against your target limits
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftLimits(budgetLimits);
                setEditingBudgets((v) => !v);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>{editingBudgets ? "Cancel" : "Edit Limits"}</span>
            </button>
          </div>

          {editingBudgets ? (
            <form onSubmit={handleSaveBudgets} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Overall Monthly Spending Cap (₦)
                </label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={draftLimits.monthlyCap}
                  onChange={(e) =>
                    setDraftLimits({
                      ...draftLimits,
                      monthlyCap: Number(e.target.value),
                    })
                  }
                  className="w-full sm:w-48 px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                {BUDGET_CATEGORIES.map((cat) => (
                  <div key={cat}>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {cat}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={draftLimits.categories[cat]}
                      onChange={(e) =>
                        setDraftLimits({
                          ...draftLimits,
                          categories: {
                            ...draftLimits.categories,
                            [cat]: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700"
                >
                  Save Budget Limits
                </button>
              </div>
            </form>
          ) : (
            <div className="divide-y divide-slate-200">
              {BUDGET_CATEGORIES.map((cat) => {
                const spent = monthStats.byCategory[cat] || 0;
                const cap = budgetLimits.categories[cat] || 0;
                const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
                const over = cap > 0 && spent > cap;
                const warn = !over && cap > 0 && spent / cap >= 0.85;

                const barColor = over
                  ? "bg-red-600"
                  : warn
                  ? "bg-amber-500"
                  : "bg-green-600";
                const statusLabel = over
                  ? "Over limit"
                  : warn
                  ? "Near limit"
                  : "On track";
                const statusColor = over
                  ? "text-red-600"
                  : warn
                  ? "text-amber-700"
                  : "text-green-700";

                return (
                  <div key={cat} className="px-5 py-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-900">{cat}</span>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="font-mono text-slate-900">
                          {formatCurrency(spent)}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="font-mono text-slate-500">
                          {formatCurrency(cap)}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className={`font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recurring Bills */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Recurring Bills
              </h2>
              <p className="text-xs text-slate-500">
                Monthly rent, subscriptions, and transit passes
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBillForm((v) => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showBillForm ? "Close" : "Add Bill"}</span>
            </button>
          </div>

          {showBillForm && (
            <form
              onSubmit={handleBillSubmit}
              className="p-4 border-b border-slate-200 bg-slate-50 space-y-3"
            >
              <input
                type="text"
                required
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                placeholder="Bill name (e.g., Campus Gym Membership)"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="Amount ₦"
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                />
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={billDueDay}
                  onChange={(e) => setBillDueDay(Number(e.target.value))}
                  placeholder="Due day"
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                />
                <select
                  value={billCategory}
                  onChange={(e) =>
                    setBillCategory(e.target.value as BudgetCategoryName)
                  }
                  className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  {BUDGET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Save Recurring Bill
              </button>
            </form>
          )}

          {bills.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-500">
              No recurring bills tracked yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {bills.map((bill) => {
                const isPaid = bill.lastPaidMonth === monthPrefix;
                return (
                  <div
                    key={bill.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {bill.title}
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums mt-0.5">
                        <span className="font-mono text-slate-700">
                          {formatCurrency(bill.amount)}
                        </span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>Due day {bill.dueDay}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>{bill.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPaid ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Paid</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onPayBill(bill)}
                          className="px-2.5 py-1 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteBill(bill.id)}
                        aria-label={`Delete ${bill.title}`}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Transaction Ledger */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Money Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Record expenses, paychecks, and allowance deposits in Nigerian Naira (₦ NGN)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTxForm((v) => !v)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showTxForm ? "Close" : "Log Transaction"}</span>
            </button>
          </div>
        </div>

        {showTxForm && (
          <form
            onSubmit={handleTxSubmit}
            className="p-5 border-b border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={txType}
                onChange={(e) =>
                  setTxType(e.target.value as "expense" | "income")
                }
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description
              </label>
              <input
                type="text"
                required
                value={txTitle}
                onChange={(e) => setTxTitle(e.target.value)}
                placeholder="e.g., Campus Bookstore"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Amount (NGN ₦)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                  ₦
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="2500"
                  className="w-full pl-6 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                disabled={txType === "income"}
                value={txType === "income" ? "Income" : txCategory}
                onChange={(e) =>
                  setTxCategory(e.target.value as BudgetCategoryName)
                }
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              >
                {txType === "income" ? (
                  <option value="Income">Income</option>
                ) : (
                  BUDGET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div className="sm:col-span-1">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
              >
                Save
              </button>
            </div>
          </form>
        )}

        {/* Filters Row */}
        <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(["all", "expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize ${
                  typeFilter === t
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "all" ? "All Entries" : `${t}s`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              aria-label="Filter category"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="All">All Categories</option>
              <option value="Income">Income</option>
              {BUDGET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="relative flex-1 sm:w-52">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledger..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-slate-500">
            No transactions match your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-5 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-5 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatFriendlyDate(tx.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {tx.title}
                      </div>
                      {tx.notes && (
                        <div className="text-xs text-slate-500">{tx.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {tx.category}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono text-sm font-medium tabular-nums whitespace-nowrap ${
                        tx.type === "income"
                          ? "text-green-700"
                          : "text-slate-900"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        aria-label={`Delete ${tx.title}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
