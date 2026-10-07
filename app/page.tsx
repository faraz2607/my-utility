"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AuthScreen from "@/app/auth-screen";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bus,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Ellipsis,
  HeartPulse,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Music2,
  Pencil,
  Plus,
  Receipt,
  ReceiptText,
  Repeat2,
  Search,
  Settings as SettingsIcon,
  Shapes,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  Utensils,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";

type Expense = { id: string; title: string; amount: number; category: string; date: string; note?: string };
type User = { id: string; name: string; email: string };
type DatePreset = "Last 7 days" | "This month" | "Previous month" | "Custom range";
const categories = ["Food", "Transport", "Rent", "Shopping", "Bills", "Health", "Entertainment", "Other"];
const EXPENSES_PER_PAGE = 10;
const icons: Record<string, LucideIcon> = {
  Overview: LayoutDashboard,
  "Manage Expense": ReceiptText,
  Budget: WalletCards,
  "Saving goals": Target,
  Settings: SettingsIcon,
  Food: Utensils,
  Rent: House,
  Transport: Bus,
  Shopping: ShoppingBag,
  Bills: Receipt,
  Health: HeartPulse,
  Entertainment: Music2,
  Other: Shapes,
  Investments: TrendingUp,
  Subscriptions: Repeat2,
};
function AppIcon({ name, className, size = 16 }: { name: string; className?: string; size?: number }) {
  const Icon = icons[name] || Sparkles;
  return <Icon className={className} size={size} strokeWidth={1.8} aria-hidden="true" />;
}
const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const axisAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}-${month}-${year}` : value;
};

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Manage Expense");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [query, setQuery] = useState("");
  const [expensePage, setExpensePage] = useState(1);
  const [period, setPeriod] = useState<DatePreset>("This month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");

  const dateRange = useMemo(() => {
    const today = new Date(`${currentDate || "2000-01-07"}T12:00:00`);
    let from = currentDate || "2000-01-07";
    let to = currentDate || "2000-01-07";
    if (period === "Last 7 days") {
      const firstDay = new Date(today);
      firstDay.setDate(firstDay.getDate() - 6);
      from = dateKey(firstDay);
    } else if (period === "This month") {
      from = dateKey(new Date(today.getFullYear(), today.getMonth(), 1));
    } else if (period === "Previous month") {
      from = dateKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      to = dateKey(new Date(today.getFullYear(), today.getMonth(), 0));
    } else {
      from = customFrom;
      to = customTo;
    }
    return { from, to };
  }, [currentDate, customFrom, customTo, period]);

  const loadExpenses = useCallback(async () => {
    if (!user || !currentDate || !dateRange.from || !dateRange.to || dateRange.from > dateRange.to) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: dateRange.from, to: dateRange.to });
      const response = await fetch(`/api/expenses?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) {
        setUser(null);
        setExpenses([]);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not load expenses.");
      setExpenses(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to the database.");
    } finally {
      setLoading(false);
    }
  }, [currentDate, dateRange.from, dateRange.to, user]);

  useEffect(() => {
    if (currentDate && user) void loadExpenses();
  }, [currentDate, loadExpenses, user]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (response.ok) return response.json();
        if (response.status !== 401) {
          const data = await response.json();
          if (active) setAuthError(data.error || "The account service is unavailable.");
        }
        return null;
      })
      .then((data) => {
        if (active && data?.user) setUser(data.user);
      })
      .catch(() => {
        if (active) setAuthError("Could not reach the account service. Check your database and session settings.");
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString("en-CA"));
    if (window.matchMedia("(max-width: 760px)").matches) setSidebarOpen(false);
  }, []);

  function navigate(tab: string) {
    setActiveTab(tab);
    setModal(false);
    if (window.matchMedia("(max-width: 760px)").matches) setSidebarOpen(false);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setExpenses([]);
    setActiveTab("Manage Expense");
  }

  function choosePeriod(next: DatePreset) {
    if (next === "Custom range") {
      const now = new Date(`${currentDate || "2000-01-07"}T12:00:00`);
      setCustomFrom(dateKey(new Date(now.getFullYear(), now.getMonth(), 1)));
      setCustomTo(currentDate || "2000-01-07");
    }
    setPeriod(next);
    if (next !== "Custom range") setDateFilterOpen(false);
  }

  const visibleExpenses = useMemo(() => {
    const filtered = expenses.filter((expense) =>
      `${expense.title} ${expense.category} ${expense.note || ""}`.toLowerCase().includes(query.toLowerCase()),
    );
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, query]);
  const expensePageCount = Math.max(1, Math.ceil(visibleExpenses.length / EXPENSES_PER_PAGE));
  const pagedExpenses = useMemo(() => {
    const start = (expensePage - 1) * EXPENSES_PER_PAGE;
    return visibleExpenses.slice(start, start + EXPENSES_PER_PAGE);
  }, [expensePage, visibleExpenses]);

  useEffect(() => {
    setExpensePage(1);
  }, [query, dateRange.from, dateRange.to]);

  useEffect(() => {
    if (expensePage > expensePageCount) setExpensePage(expensePageCount);
  }, [expensePage, expensePageCount]);

  const total = visibleExpenses.reduce((sum, item) => sum + item.amount, 0);
  const chartDays = useMemo(() => {
    if (!dateRange.from || !dateRange.to || dateRange.from > dateRange.to) return [];
    const cursor = new Date(`${dateRange.from}T12:00:00`);
    const end = new Date(`${dateRange.to}T12:00:00`);
    const days: { key: string; label: string; amount: number }[] = [];
    while (cursor <= end) {
      const key = dateKey(cursor);
      days.push({ key, label: cursor.toLocaleDateString("en", { month: "short", day: "numeric" }), amount: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    const amounts = new Map<string, number>();
    visibleExpenses.forEach((expense) => amounts.set(expense.date, (amounts.get(expense.date) || 0) + expense.amount));
    days.forEach((day) => {
      day.amount = amounts.get(day.key) || 0;
    });
    return days;
  }, [dateRange.from, dateRange.to, visibleExpenses]);
  const maxDay = Math.max(1, ...chartDays.map((day) => day.amount));
  const graphWidth = Math.max(600, chartDays.length * 48 + 70);
  const graphLeft = 70;
  const graphRight = graphWidth - 30;
  const graphPoints = chartDays.map((day, index) => ({
    day,
    x: graphLeft + index * ((graphRight - graphLeft) / Math.max(1, chartDays.length - 1)),
    y: 150 - (day.amount / maxDay) * 110,
  }));
  const graphLine = graphPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const graphArea = graphLine ? `${graphLine} L ${graphPoints.at(-1)?.x || graphLeft} 150 L ${graphLeft} 150 Z` : "";
  const labelStep = Math.max(1, Math.ceil(chartDays.length / 9));
  const selectedDayExpenses = visibleExpenses.filter((expense) => expense.date === selectedDate);
  const selectedDayTotal = selectedDayExpenses.reduce((sum, item) => sum + item.amount, 0);
  const selectedDayCategories = categories
    .map((category) => ({
      category,
      amount: selectedDayExpenses
        .filter((item) => item.category === category)
        .reduce((sum, item) => sum + item.amount, 0),
    }))
    .filter((item) => item.amount > 0);

  useEffect(() => {
    setSelectedDate(dateRange.to);
  }, [dateRange.from, dateRange.to]);
  const categoryTotals = categories
    .map((category) => ({
      category,
      amount: visibleExpenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  function openNew() {
    setEditing(null);
    setModal(true);
  }
  function openEdit(expense: Expense) {
    setEditing(expense);
    setModal(true);
  }
  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get("title"),
      amount: form.get("amount"),
      category: form.get("category"),
      date: form.get("date"),
      note: form.get("note"),
    };
    try {
      const response = await fetch("/api/expenses", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save expense.");
      setModal(false);
      await loadExpenses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save expense.");
    } finally {
      setSaving(false);
    }
  }
  async function deleteExpense(expense: Expense) {
    setDeleting(true);
    try {
      const response = await fetch(`/api/expenses?id=${expense.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConfirmDelete(null);
      await loadExpenses();
    } catch (e) {
      setConfirmDelete(null);
      setError(e instanceof Error ? e.message : "Could not delete expense.");
    } finally {
      setDeleting(false);
    }
  }

  const nav = ["Overview", "Manage Expense", "Budget", "Saving goals"];
  if (authLoading)
    return (
      <main className="auth-loading">
        <span className="brand-mark">p</span>
        <span>Opening your personal space…</span>
      </main>
    );
  if (!user)
    return (
      <AuthScreen
        initialError={authError}
        onAuthenticated={(nextUser) => {
          setUser(nextUser);
          setAuthError("");
        }}
      />
    );
  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <a className="brand" href="#home">
          <span className="brand-mark">p</span>
          <span>
            pocket<span className="brand-light">wise</span>
          </span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {nav.map((item) => (
            <button
              key={item}
              onClick={() => navigate(item)}
              className={`nav-link ${activeTab === item ? "selected" : ""}`}
            >
              <span className="nav-icon">
                <AppIcon name={item} size={17} />
              </span>
              {item}
              {activeTab === item && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-divider" />
        <div className="sidebar-bottom">
          <button className="nav-link settings" onClick={() => navigate("Settings")}>
            <span className="nav-icon">
              <AppIcon name="Settings" size={17} />
            </span>
            Settings
          </button>
        </div>
      </aside>

      <main className={`main-area ${sidebarOpen ? "with-sidebar" : "without-sidebar"}`}>
        <header className="topbar">
          <button
            className="menu-toggle"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activeTab}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={17} />
            </button>
            <div className="account-menu-wrap" onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAccountMenuOpen(false);
            }}>
              <button
                className="top-avatar account-avatar"
                aria-label="Open account menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              >
                {user.name.slice(0, 1).toUpperCase()}
              </button>
              {accountMenuOpen && (
                <div className="account-menu" role="menu">
                  <div className="account-menu-user">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <button role="menuitem" onClick={() => { setAccountMenuOpen(false); void signOut(); }}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {activeTab === "Manage Expense" || activeTab === "Overview" ? (
          <div className="content-wrap">
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-dot" /> YOUR MONEY, AT A GLANCE
                </div>
                <h1>
                  {activeTab === "Overview" ? `Good to see you, ${user.name.split(" ")[0]}` : "Manage expense"}
                  <span className="heading-period">
                    <Sparkles size={16} />
                  </span>
                </h1>
                <p>
                  {activeTab === "Overview"
                    ? "Here's a little snapshot of where things stand."
                    : "A clearer picture of every little thing."}
                </p>
              </div>
              <div className="heading-actions">
                <div
                  className="date-filter-wrap"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDateFilterOpen(false);
                  }}
                >
                  <button
                    className="date-filter-button"
                    aria-expanded={dateFilterOpen}
                    onClick={() => setDateFilterOpen(!dateFilterOpen)}
                  >
                    <span className="date-filter-icon">
                      <CalendarDays size={15} />
                    </span>
                    {period}
                    <span className="date-filter-chevron">
                      <ChevronDown size={14} />
                    </span>
                  </button>
                  {dateFilterOpen && (
                    <div className="date-filter-menu">
                      <div className="date-filter-options">
                        {(["Last 7 days", "This month", "Previous month", "Custom range"] as DatePreset[]).map(
                          (option) => (
                            <button
                              key={option}
                              className={period === option ? "date-option active" : "date-option"}
                              onClick={() => choosePeriod(option)}
                            >
                              {option}
                              <span>{period === option ? <Check size={14} /> : null}</span>
                            </button>
                          ),
                        )}
                      </div>
                      {period === "Custom range" && (
                        <div className="custom-range-fields">
                          <div className="custom-range-summary">
                            Selected dates{" "}
                            <strong>
                              {formatDate(dateRange.from)} – {formatDate(dateRange.to)}
                            </strong>
                          </div>
                          <label>
                            FROM
                            <input
                              type="date"
                              value={customFrom}
                              max={customTo || undefined}
                              onChange={(event) => setCustomFrom(event.target.value)}
                            />
                          </label>
                          <label>
                            TO
                            <input
                              type="date"
                              value={customTo}
                              min={customFrom || undefined}
                              max={currentDate || undefined}
                              onChange={(event) => setCustomTo(event.target.value)}
                            />
                          </label>
                          <button
                            className="apply-range"
                            disabled={!customFrom || !customTo || customFrom > customTo}
                            onClick={() => setDateFilterOpen(false)}
                          >
                            Apply date range{" "}
                            <span>
                              <ArrowRight size={15} />
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {activeTab === "Manage Expense" && (
                  <button className="primary-button add-expense-button" onClick={openNew}>
                    <span>
                      <Plus size={16} />
                    </span>{" "}
                    Add expense
                  </button>
                )}
              </div>
            </div>
            {error && (
              <div className="error-banner">
                <span>!</span>
                {error}
                {error.includes("MONGODB_URI") && (
                  <span className="error-hint">
                    Create <code>.env.local</code> from <code>.env.example</code>, then restart the server.
                  </span>
                )}
                <button onClick={() => void loadExpenses()}>Retry</button>
              </div>
            )}
            <section className="summary-grid">
              <article className="summary-card total-card">
                <div className="card-top">
                  <span className="card-label">
                    TOTAL SPENT{" "}
                    <span className="tiny-info">
                      <CircleHelp size={12} />
                    </span>
                  </span>
                  <span className="card-icon peach">
                    <ArrowUpRight size={17} />
                  </span>
                </div>
                <div className="summary-value">{currency(total)}</div>
                <div className="summary-foot">
                  <span className="soft-pill">
                    <TrendingUp size={13} />
                    {visibleExpenses.length} entries
                  </span>
                  <span className="muted-copy">in selected period</span>
                </div>
                <div className="card-decoration" />
              </article>
              <article className="summary-card">
                <div className="card-top">
                  <span className="card-label">DAILY AVERAGE</span>
                  <span className="card-icon lavender">
                    <Activity size={17} />
                  </span>
                </div>
                <div className="summary-value">
                  {currency(
                    visibleExpenses.length ? total / Math.max(1, new Set(visibleExpenses.map((e) => e.date)).size) : 0,
                  )}
                </div>
                <div className="summary-foot">
                  <span className="muted-copy">per active spending day</span>
                </div>
                <div className="mini-spark">
                  <svg viewBox="0 0 120 36" preserveAspectRatio="none">
                    <path d="M1 30 C15 28 14 16 29 21 S47 28 57 14 S77 19 84 10 S103 15 119 3" />
                    <path
                      className="spark-fill"
                      d="M1 30 C15 28 14 16 29 21 S47 28 57 14 S77 19 84 10 S103 15 119 3 L119 36 L1 36Z"
                    />
                  </svg>
                </div>
              </article>
              <article className="summary-card">
                <div className="card-top">
                  <span className="card-label">TOP CATEGORY</span>
                  <span className="card-icon mint">
                    <Sparkles size={17} />
                  </span>
                </div>
                <div className="summary-value category-value">{categoryTotals[0]?.category || "—"}</div>
                <div className="summary-foot">
                  <span className="muted-copy">
                    {categoryTotals[0]
                      ? `${currency(categoryTotals[0].amount)} this period`
                      : "Your spending mix lives here"}
                  </span>
                </div>
                <div className="category-dots">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </article>
            </section>

            <section className="middle-grid">
              <article className="panel chart-panel line-chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Daily spending</h2>
                    <p>Choose a point to see that day’s category mix</p>
                  </div>
                  <span className="chart-range-unit">
                    {formatDate(dateRange.from)} – {formatDate(dateRange.to)}
                  </span>
                </div>
                <div className="line-day-summary" aria-live="polite">
                  <div>
                    <span className="line-day-date">{selectedDate ? formatDate(selectedDate) : "Select a date"}</span>
                    <strong>{currency(selectedDayTotal)}</strong>
                  </div>
                  <div className="line-day-categories">
                    {selectedDayCategories.length ? (
                      selectedDayCategories.map((item) => (
                        <span className={`line-category-chip`} key={item.category}>
                          <i className={`line-category-dot ${item.category.toLowerCase()}`} />
                          {item.category} <strong>{currency(item.amount)}</strong>
                        </span>
                      ))
                    ) : (
                      <span className="line-no-spend">No expenses recorded for this date</span>
                    )}
                  </div>
                </div>
                <div className="line-chart-scroll">
                  <svg
                    className="expense-line-graph"
                    viewBox={`0 0 ${graphWidth} 190`}
                    width={graphWidth}
                    height="190"
                    role="group"
                    aria-label="Daily expenses line graph"
                  >
                    <defs>
                      <linearGradient id="expense-area-gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#8877e4" stopOpacity=".2" />
                        <stop offset="100%" stopColor="#8877e4" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1={graphLeft} y1="40" x2={graphRight} y2="40" className="chart-grid-line" />
                    <line x1={graphLeft} y1="95" x2={graphRight} y2="95" className="chart-grid-line" />
                    <line x1={graphLeft} y1="150" x2={graphRight} y2="150" className="chart-grid-line" />
                    <text x="62" y="43" textAnchor="end" className="graph-axis-label">
                      {axisAmount(maxDay)}
                    </text>
                    <text x="62" y="98" textAnchor="end" className="graph-axis-label">
                      {axisAmount(maxDay / 2)}
                    </text>
                    <text x="62" y="153" textAnchor="end" className="graph-axis-label">
                      {axisAmount(0)}
                    </text>
                    {graphArea && <path d={graphArea} fill="url(#expense-area-gradient)" />}
                    {graphLine && <path d={graphLine} className="expense-line-path" />}
                    {graphPoints.map((point, index) => (
                      <g
                        key={point.day.key}
                        className="expense-line-point"
                        onMouseEnter={() => setSelectedDate(point.day.key)}
                      >
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={point.day.key === selectedDate ? 6 : 4}
                          className={point.day.key === selectedDate ? "selected-graph-point" : "graph-point"}
                          tabIndex={0}
                          role="button"
                          aria-label={`${point.day.key}: ${currency(point.day.amount)}`}
                          onFocus={() => setSelectedDate(point.day.key)}
                          onClick={() => setSelectedDate(point.day.key)}
                        />
                        {index % labelStep === 0 && (
                          <text x={point.x} y="174" textAnchor="middle" className="graph-date-label">
                            {point.day.label}
                          </text>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
              </article>
              <article className="panel category-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Spending by category</h2>
                    <p>Where it goes, at a glance</p>
                  </div>
                  <span className="more-button">
                    <Ellipsis size={19} />
                  </span>
                </div>
                <div className="category-list">
                  {categoryTotals.length ? (
                    categoryTotals.slice(0, 4).map((item, i) => (
                      <div className="category-row" key={item.category}>
                        <span className={`category-icon tone-${i}`}>
                          <AppIcon name={item.category} size={16} />
                        </span>
                        <span className="category-name">
                          {item.category}
                          <small>
                            {visibleExpenses.filter((e) => e.category === item.category).length} transactions
                          </small>
                        </span>
                        <strong>{currency(item.amount)}</strong>
                      </div>
                    ))
                  ) : (
                    <div className="category-empty">
                      <span>
                        <Sparkles size={17} />
                      </span>
                      <p>Add an expense to see your spending mix</p>
                    </div>
                  )}
                </div>
                {categoryTotals.length > 0 && (
                  <div className="category-progress">
                    {categoryTotals.slice(0, 5).map((item, i) => (
                      <i
                        key={item.category}
                        className={`progress-${i}`}
                        style={{ width: `${(item.amount / total) * 100}%` }}
                      />
                    ))}
                  </div>
                )}
              </article>
            </section>

            {activeTab === "Manage Expense" && (
              <section className="panel transactions-panel">
                <div className="transactions-head">
                  <div>
                    <h2>Expenses</h2>
                    <p>{visibleExpenses.length} entries in this date range</p>
                  </div>
                  <div className="transaction-tools">
                    <label className="search-box">
                      <span>
                        <Search size={15} />
                      </span>
                      <input
                        placeholder="Search expenses..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>TRANSACTION</th>
                        <th>CATEGORY</th>
                        <th>DATE</th>
                        <th>AMOUNT</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="table-empty">
                            Gathering your expenses…
                          </td>
                        </tr>
                      ) : visibleExpenses.length ? (
                        pagedExpenses.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="transaction-title">
                                <span className={`transaction-icon tone-${categories.indexOf(item.category) % 4}`}>
                                  <AppIcon name={item.category} size={16} />
                                </span>
                                <span>
                                  <strong>{item.title}</strong>
                                  <small>{item.note || item.category}</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="category-tag">{item.category}</span>
                            </td>
                            <td className="date-cell">{formatDate(item.date)}</td>
                            <td className="amount-cell">-{currency(item.amount)}</td>
                            <td>
                              <div className="row-actions">
                                <button aria-label="Edit expense" title="Edit" onClick={() => openEdit(item)}>
                                  <Pencil size={14} />
                                </button>
                                <button
                                  aria-label="Delete expense"
                                  title="Delete"
                                  onClick={() => setConfirmDelete(item)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="table-empty">
                            <span className="empty-illustration">
                              <Sparkles size={20} />
                            </span>
                            <strong>{query ? "Nothing found" : "A fresh start"}</strong>
                            <span>
                              {query ? "Try another search." : "Your expenses will show up here when you add one."}
                            </span>
                            {!query && (
                              <button className="text-button" onClick={openNew}>
                                Add your first expense{" "}
                                <span>
                                  <ArrowUpRight size={15} />
                                </span>
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {visibleExpenses.length > 0 && (
                  <div className="table-pagination" aria-label="Expense table pages">
                    <span>
                      Showing {(expensePage - 1) * EXPENSES_PER_PAGE + 1}–
                      {Math.min(expensePage * EXPENSES_PER_PAGE, visibleExpenses.length)} of {visibleExpenses.length}
                    </span>
                    <div>
                      <button
                        aria-label="Previous page"
                        disabled={expensePage === 1}
                        onClick={() => setExpensePage((page) => Math.max(1, page - 1))}
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span>Page {expensePage} of {expensePageCount}</span>
                      <button
                        aria-label="Next page"
                        disabled={expensePage >= expensePageCount}
                        onClick={() => setExpensePage((page) => Math.min(expensePageCount, page + 1))}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
            {activeTab === "Manage Expense" && (
              <footer className="page-footer">
                <span>
                  Made for a little more peace of mind
                </span>
                <span>YOUR PERSONAL FINANCE SPACE</span>
              </footer>
            )}
          </div>
        ) : (
          <div className="placeholder-page">
            <span className="placeholder-icon">
              <AppIcon name={activeTab} size={22} />
            </span>
            <div className="eyebrow">
              <span className="eyebrow-dot" /> A LITTLE SOMETHING, SOON
            </div>
            <h1>{activeTab}</h1>
            <p>We're making room for this in your personal finance space.</p>
            <button className="primary-button" onClick={() => setActiveTab("Manage Expense")}>
              Back to expenses{" "}
              <span>
                <ArrowRight size={15} />
              </span>
            </button>
          </div>
        )}
      </main>
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(false);
          }}
        >
          <form className="expense-modal" onSubmit={saveExpense}>
            <div className="modal-top">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-dot" /> KEEPING THINGS IN CHECK
                </div>
                <h2>{editing ? "Edit expense" : "Add an expense"}</h2>
                <p>Every little detail helps tell the story.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(false)} aria-label="Close">
                <X size={17} />
              </button>
            </div>
            <label className="field-label">
              WHAT WAS IT FOR?
              <input
                name="title"
                maxLength={80}
                required
                placeholder="e.g. Sunday brunch"
                defaultValue={editing?.title}
              />
            </label>
            <div className="form-row">
              <label className="field-label">
                AMOUNT
                <input
                  name="amount"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={editing?.amount}
                />
              </label>
              <label className="field-label">
                DATE
                <input name="date" required type="date" defaultValue={editing?.date || currentDate} />
              </label>
            </div>
            <label className="field-label">
              CATEGORY
              <select name="category" defaultValue={editing?.category || "Food"}>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              A NOTE, IF YOU LIKE{" "}
              <textarea
                name="note"
                maxLength={240}
                placeholder="Add a little context…"
                defaultValue={editing?.note || ""}
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={() => setModal(false)}>
                Cancel
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add expense"}
                <span>
                  <ArrowRight size={15} />
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
      {confirmDelete && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setConfirmDelete(null);
          }}
        >
          <section
            className="delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <span className="delete-symbol">
              <Trash2 size={18} />
            </span>
            <h2 id="delete-title">Delete this expense?</h2>
            <p id="delete-description">
              <strong>{confirmDelete.title}</strong> · {currency(confirmDelete.amount)} will be permanently removed from
              your records.
            </p>
            <div className="delete-actions">
              <button
                type="button"
                className="cancel-button"
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
              >
                Keep expense
              </button>
              <button
                type="button"
                className="delete-confirm-button"
                disabled={deleting}
                onClick={() => void deleteExpense(confirmDelete)}
              >
                {deleting ? "Deleting…" : "Delete expense"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
