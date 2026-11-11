"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Boxes,
  AlertTriangle,
  PackageCheck,
  CalendarClock,
  ArrowUpDown,
  X,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock3,
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";

type StockItem = {
  id: string;
  medicineId: string;
  medicine: string;
  category: string;
  dosageForm: string;
  batch: string;
  manufactureDate: string | null;
  expiryDate: string;
  quantity: number;
  reorderLevel: number;
  medicineStatus: "ACTIVE" | "INACTIVE";
};

type StockStatus =
  | "In Stock"
  | "Low Stock"
  | "Out of Stock"
  | "Expired"
  | "Expiring Soon";

type SortKey =
  | "medicine"
  | "category"
  | "quantity"
  | "reorderLevel"
  | "manufactureDate"
  | "expiryDate";

const adjustmentReasons = [
  "Stock received",
  "Damaged goods",
  "Expired goods",
  "Physical stock correction",
  "Other",
];

const PAGE_SIZE = 8;

function getDaysUntilExpiry(
  expiryDate: string,
  currentDate: Date | null
): number | null {
  if (!currentDate || !expiryDate) return null;

  const expiry = new Date(`${expiryDate}T00:00:00`);

  if (Number.isNaN(expiry.getTime())) return null;

  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiry.getTime() - today.getTime()) / 86400000
  );
}

function getStatus(
  item: StockItem,
  currentDate: Date | null
): StockStatus {
  const daysLeft = getDaysUntilExpiry(item.expiryDate, currentDate);

  if (daysLeft !== null && daysLeft < 0) {
    return "Expired";
  }

  if (item.quantity === 0) {
    return "Out of Stock";
  }

  if (item.quantity <= item.reorderLevel) {
    return "Low Stock";
  }

  if (daysLeft !== null && daysLeft <= 90) {
    return "Expiring Soon";
  }

  return "In Stock";
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClasses(status: StockStatus) {
  switch (status) {
    case "In Stock":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400";

    case "Low Stock":
      return "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-400";

    case "Out of Stock":
    case "Expired":
      return "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-500/10 dark:text-red-400";

    case "Expiring Soon":
      return "bg-orange-50 text-orange-700 ring-orange-600/10 dark:bg-orange-500/10 dark:text-orange-400";
  }
}

function getProgressWidth(quantity: number, reorderLevel: number) {
  if (reorderLevel <= 0) return quantity > 0 ? 100 : 0;

  return Math.min(100, Math.round((quantity / (reorderLevel * 3)) * 100));
}

export default function InventoryPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("Stock received");
  const [remarks, setRemarks] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("medicine");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
  }, []);

  const fetchInventory = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch("/api/inventory", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to fetch inventory.");
      }

      setStock(Array.isArray(data.stock) ? data.stock : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to fetch inventory records."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const filteredStock = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return stock.filter((item) => {
      const matchesSearch =
        item.medicine.toLowerCase().includes(searchText) ||
        item.batch.toLowerCase().includes(searchText) ||
        item.category.toLowerCase().includes(searchText) ||
        item.dosageForm?.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        getStatus(item, currentDate) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [stock, search, statusFilter, currentDate]);

  const sortedStock = useMemo(() => {
    return [...filteredStock].sort((a, b) => {
      const first = a[sortKey];
      const second = b[sortKey];

      let comparison = 0;

      if (sortKey === "quantity" || sortKey === "reorderLevel") {
        comparison = Number(first) - Number(second);
      } else {
        comparison = String(first ?? "").localeCompare(
          String(second ?? ""),
          undefined,
          { numeric: true, sensitivity: "base" }
        );
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredStock, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedStock.length / PAGE_SIZE));

  const paginatedStock = sortedStock.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const totalUnits = stock.reduce((sum, item) => sum + item.quantity, 0);

  const lowStock = stock.filter(
    (item) => getStatus(item, currentDate) === "Low Stock"
  ).length;

  const outOfStock = stock.filter(
    (item) => getStatus(item, currentDate) === "Out of Stock"
  ).length;

  const expired = stock.filter(
    (item) => getStatus(item, currentDate) === "Expired"
  ).length;

  const expiringSoon = stock.filter((item) => {
    const days = getDaysUntilExpiry(item.expiryDate, currentDate);
    return days !== null && days >= 0 && days <= 90;
  }).length;

  const selectedItem = stock.find((item) => item.id === selectedStockId);

  function openAdjustment(item?: StockItem) {
    setSelectedStockId(item?.id ?? "");
    setAdjustment("");
    setReason("Stock received");
    setRemarks("");
    setMessage("");
    setAdjustmentOpen(true);
  }

  function closeAdjustment() {
    if (saving) return;

    setAdjustmentOpen(false);
    setSelectedStockId("");
    setAdjustment("");
    setRemarks("");
    setMessage("");
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  async function applyAdjustment() {
    const amount = Number(adjustment);

    if (!selectedItem) {
      setMessage("Select a stock batch.");
      return;
    }

    if (
      !adjustment.trim() ||
      !Number.isSafeInteger(amount) ||
      amount === 0
    ) {
      setMessage("Enter a valid non-zero whole number.");
      return;
    }

    if (selectedItem.quantity + amount < 0) {
      setMessage("Stock quantity cannot become negative.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockId: selectedItem.id,
          quantityChange: amount,
          reason,
          remarks: remarks.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save stock adjustment."
        );
      }

      setAdjustmentOpen(false);
      setSelectedStockId("");
      setAdjustment("");
      setRemarks("");

      await fetchInventory(true);
      setMessage("Stock adjustment saved successfully.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to save stock adjustment."
      );
    } finally {
      setSaving(false);
    }
  }

  const summaryCards = [
    {
      label: "Total Stock Units",
      value: totalUnits.toLocaleString("en-IN"),
      icon: Boxes,
      color: "blue",
      description: "Across all batches",
    },
    {
      label: "Low Stock Batches",
      value: lowStock,
      icon: AlertTriangle,
      color: "amber",
      description: "At or below reorder level",
    },
    {
      label: "Out of Stock",
      value: outOfStock,
      icon: PackageCheck,
      color: "red",
      description: "Batches with zero quantity",
    },
    {
      label: "Expiring Within 90 Days",
      value: expiringSoon,
      icon: CalendarClock,
      color: "orange",
      description: "Upcoming expiry dates",
    },
    {
      label: "Expired Batches",
      value: expired,
      icon: Clock3,
      color: "violet",
      description: "Past expiry date",
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  };

  function SortButton({
    column,
    children,
  }: {
    column: SortKey;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={() => handleSort(column)}
        className="group inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-teal-700 dark:hover:text-teal-400"
      >
        {children}
        {sortKey === column ? (
          sortDirection === "asc" ? (
            <ArrowUp size={13} />
          ) : (
            <ArrowDown size={13} />
          )
        ) : (
          <ArrowUpDown
            size={12}
            className="opacity-40 transition-opacity group-hover:opacity-100"
          />
        )}
      </button>
    );
  }

  return (
    <div className="inventory-page mx-auto max-w-[1600px] space-y-7">
      <style jsx global>{`
        @keyframes inventoryFadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes inventoryFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes inventorySlideIn {
          from {
            opacity: 0;
            transform: translateX(28px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .inventory-enter {
          animation: inventoryFadeUp 450ms ease-out both;
        }

        .inventory-enter-1 {
          animation-delay: 60ms;
        }

        .inventory-enter-2 {
          animation-delay: 120ms;
        }

        .inventory-enter-3 {
          animation-delay: 180ms;
        }

        .inventory-enter-4 {
          animation-delay: 240ms;
        }

        .inventory-enter-5 {
          animation-delay: 300ms;
        }

        .inventory-modal-backdrop {
          animation: inventoryFadeIn 180ms ease-out both;
        }

        .inventory-drawer {
          animation: inventorySlideIn 250ms ease-out both;
        }

        .inventory-card {
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease;
        }

        .inventory-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
        }

        @media (prefers-reduced-motion: reduce) {
          .inventory-enter,
          .inventory-modal-backdrop,
          .inventory-drawer {
            animation: none !important;
          }

          .inventory-card {
            transition: none !important;
          }

          .inventory-card:hover {
            transform: none;
          }
        }
      `}</style>

      {/* Page heading */}
      <section className="inventory-enter flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            <span>Administration</span>
            <span>/</span>
            <span className="text-teal-600 dark:text-teal-400">
              Inventory
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Stock Management
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Monitor stock levels, batch quantities and medicine expiry dates
            from your inventory database.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fetchInventory(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-teal-300 hover:bg-teal-50/50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => openAdjustment()}
            disabled={stock.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/15 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            Adjust Stock
          </button>
        </div>
      </section>

      {/* Notifications */}
      {error && (
        <div className="inventory-enter flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={19}
              className="mt-0.5 shrink-0 text-red-600"
            />
            <p className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchInventory()}
            className="shrink-0 text-sm font-semibold text-red-700 underline dark:text-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {message && !adjustmentOpen && (
        <div className="inventory-enter flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 size={18} />
          {message}
          <button
            type="button"
            onClick={() => setMessage("")}
            className="ml-auto rounded-lg p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className={`inventory-card inventory-enter inventory-enter-${index + 1} rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorClasses[card.color]}`}
                >
                  <Icon size={21} />
                </div>

                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  Live data
                </span>
              </div>

              <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">
                {card.label}
              </p>

              <div className="mt-1 flex items-end justify-between gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {loading ? (
                    <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  ) : (
                    card.value
                  )}
                </h2>
              </div>

              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                {card.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Stock register */}
      <section className="inventory-enter inventory-enter-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800 xl:flex-row xl:items-center">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400">
                <Package size={18} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">
                  Stock Register
                </h2>

                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {loading
                    ? "Loading database records..."
                    : `Showing ${filteredStock.length} matching batches from ${stock.length} records`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search medicine, category or batch..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-10 pr-9 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900 sm:w-72"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="relative">
              <Filter
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-10 pr-9 text-sm text-slate-700 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:w-48"
              >
                <option value="All">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
                setSortKey("medicine");
                setSortDirection("asc");
                setPage(1);
              }}
              title="Reset filters"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <RotateCcw size={15} />
              <span className="sm:hidden">Reset filters</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="sticky top-0 z-10 bg-slate-50/90 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 backdrop-blur dark:bg-slate-800/90 dark:text-slate-500">
              <tr>
                <th className="px-6 py-4">
                  <SortButton column="medicine">Medicine / Batch</SortButton>
                </th>
                <th className="px-4 py-4">
                  <SortButton column="category">Category</SortButton>
                </th>
                <th className="px-4 py-4">
                  <SortButton column="quantity">Quantity</SortButton>
                </th>
                <th className="px-4 py-4">
                  <SortButton column="reorderLevel">Reorder Level</SortButton>
                </th>
                <th className="px-4 py-4">
                  <SortButton column="manufactureDate">Manufactured</SortButton>
                </th>
                <th className="px-4 py-4">
                  <SortButton column="expiryDate">Expiry Date</SortButton>
                </th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-6">
                        <div className="h-4 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedStock.length > 0 ? (
                paginatedStock.map((item, index) => {
                  const status = getStatus(item, currentDate);
                  const daysLeft = getDaysUntilExpiry(
                    item.expiryDate,
                    currentDate
                  );
                  const progress = getProgressWidth(
                    item.quantity,
                    item.reorderLevel
                  );

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-teal-50/40 dark:hover:bg-teal-500/[0.04]"
                      style={{
                        animation: `inventoryFadeUp 350ms ease-out ${index * 35}ms both`,
                      }}
                    >
                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {item.medicine}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          Batch: {item.batch}
                        </p>
                        {item.dosageForm && (
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                            {item.dosageForm}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-5 text-sm text-slate-600 dark:text-slate-300">
                        {item.category}
                      </td>

                      <td className="px-4 py-5">
                        <p
                          className={`text-sm font-bold ${
                            item.quantity <= item.reorderLevel
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {item.quantity.toLocaleString("en-IN")}
                        </p>

                        <div className="mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.quantity === 0
                                ? "bg-red-500"
                                : item.quantity <= item.reorderLevel
                                  ? "bg-amber-500"
                                  : "bg-teal-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-5 text-sm text-slate-600 dark:text-slate-300">
                        {item.reorderLevel}
                      </td>

                      <td className="px-4 py-5 text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(item.manufactureDate)}
                      </td>

                      <td className="px-4 py-5">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {formatDate(item.expiryDate)}
                        </p>

                        {daysLeft !== null && (
                          <p
                            className={`mt-1 text-[11px] font-medium ${
                              daysLeft < 0
                                ? "text-red-600 dark:text-red-400"
                                : daysLeft <= 90
                                  ? "text-orange-600 dark:text-orange-400"
                                  : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            {daysLeft < 0
                              ? `Expired ${Math.abs(daysLeft)} days ago`
                              : daysLeft === 0
                                ? "Expires today"
                                : `${daysLeft} days remaining`}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${getStatusClasses(status)}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => openAdjustment(item)}
                          title="Adjust stock"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-teal-700 dark:hover:bg-teal-500/10 dark:hover:text-teal-400"
                        >
                          <ArrowUpDown size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <Boxes size={27} />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {stock.length === 0
                        ? "No stock records found"
                        : "No matching stock records"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {stock.length === 0
                        ? "Stock batches will appear here when they are added to the database."
                        : "Try changing your search or status filters."}
                    </p>

                    {stock.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("All");
                        }}
                        className="mt-4 text-sm font-semibold text-teal-700 hover:underline dark:text-teal-400"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && sortedStock.length > 0 && (
          <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, sortedStock.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {sortedStock.length}
              </span>{" "}
              batches
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="min-w-20 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Inventory alerts */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="inventory-enter inventory-enter-3 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle size={20} />
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                Reorder Monitoring
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {loading
                  ? "Checking stock levels..."
                  : lowStock === 0 && outOfStock === 0
                    ? "No batches are currently at or below their reorder levels."
                    : `${lowStock} low-stock batch(es) and ${outOfStock} out-of-stock batch(es) require attention.`}
              </p>
            </div>
          </div>
        </div>

        <div className="inventory-enter inventory-enter-4 rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50 to-white p-5 dark:border-orange-900/40 dark:from-orange-950/30 dark:to-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
              <CalendarClock size={20} />
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                Expiry Monitoring
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {loading
                  ? "Checking batch expiry dates..."
                  : `${expiringSoon} batch(es) expire within 90 days and ${expired} batch(es) have already expired.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stock adjustment drawer */}
      {adjustmentOpen && (
        <div
          className="inventory-modal-backdrop fixed inset-0 z-[100] flex justify-end bg-slate-950/45 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAdjustment();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjustment-title"
            className="inventory-drawer flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">
                  Inventory operation
                </p>

                <h2
                  id="adjustment-title"
                  className="mt-1 text-xl font-bold text-slate-900 dark:text-white"
                >
                  Adjust Stock
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Record a stock quantity correction.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAdjustment}
                disabled={saving}
                className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Close adjustment panel"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-5 px-6 py-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Select medicine batch
                </label>

                <select
                  value={selectedStockId}
                  onChange={(event) =>
                    setSelectedStockId(event.target.value)
                  }
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Select a batch</option>

                  {stock.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.medicine} — {item.batch}
                    </option>
                  ))}
                </select>
              </div>

              {selectedItem && (
                <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 dark:border-teal-900/50 dark:bg-teal-950/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {selectedItem.medicine}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Batch: {selectedItem.batch}
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-teal-700 dark:bg-slate-900 dark:text-teal-400">
                      {getStatus(selectedItem, currentDate)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Current quantity
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedItem.quantity}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Reorder level
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedItem.reorderLevel}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Quantity change
                </label>

                <input
                  type="number"
                  step="1"
                  value={adjustment}
                  onChange={(event) => setAdjustment(event.target.value)}
                  disabled={saving}
                  placeholder="Enter a positive or negative number"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />

                <p className="mt-2 text-xs leading-5 text-slate-400 dark:text-slate-500">
                  Positive values add stock. Negative values remove stock.
                  The final quantity cannot be negative.
                </p>

                {selectedItem && adjustment.trim() !== "" && (
                  <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Expected quantity:{" "}
                    {Number.isSafeInteger(Number(adjustment))
                      ? selectedItem.quantity + Number(adjustment)
                      : "Invalid quantity"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Reason
                </label>

                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {adjustmentReasons.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Remarks
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>

                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  disabled={saving}
                  rows={4}
                  maxLength={500}
                  placeholder="Add additional information..."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />

                <p className="mt-1 text-right text-[11px] text-slate-400">
                  {remarks.length}/500
                </p>
              </div>

              {message && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {message}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/70">
              <button
                type="button"
                onClick={closeAdjustment}
                disabled={saving}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={applyAdjustment}
                disabled={
                  saving ||
                  stock.length === 0 ||
                  !selectedStockId ||
                  !adjustment.trim()
                }
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/15 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <RefreshCw size={15} className="animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Adjustment"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
