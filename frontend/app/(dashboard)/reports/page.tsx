"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  IndianRupee,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  FileBarChart,
  Pill,
  RefreshCw,
} from "lucide-react";

type ReportPeriod = "Weekly" | "Monthly" | "Yearly";
type ReportType = "All Transactions" | "Sales" | "Purchases";

type SalesData = {
  month: string;
  sales: number;
  purchases: number;
};

type InventoryData = {
  name: string;
  value: number;
};

type TopMedicine = {
  name: string;
  category: string;
  quantity: number;
  revenue: number;
};

type Transaction = {
  id: string;
  type: "Sale" | "Purchase";
  party: string;
  date: string;
  amount: number;
};

type ReportResponse = {
  period: ReportPeriod;
  reportStats: {
    sales: number;
    purchases: number;
    grossDifference: number;
    orders: number;
    purchaseCount: number;
    unitsSold: number;
  };
  salesData: SalesData[];
  inventoryData: InventoryData[];
  topMedicines: TopMedicine[];
  recentTransactions: Transaction[];
  inventoryInsights: {
    totalMedicines: number;
    totalBatches: number;
    totalUnits: number;
    lowStockMedicines: number;
    outOfStockMedicines: number;
    expiredBatches: number;
  };
  message?: string;
};

const emptyReport: ReportResponse = {
  period: "Yearly",
  reportStats: {
    sales: 0,
    purchases: 0,
    grossDifference: 0,
    orders: 0,
    purchaseCount: 0,
    unitsSold: 0,
  },
  salesData: [],
  inventoryData: [],
  topMedicines: [],
  recentTransactions: [],
  inventoryInsights: {
    totalMedicines: 0,
    totalBatches: 0,
    totalUnits: 0,
    lowStockMedicines: 0,
    outOfStockMedicines: 0,
    expiredBatches: 0,
  },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const formatNumber = (value: number) =>
  value.toLocaleString("en-IN");

const inventoryColors: Record<string, string> = {
  "In Stock": "bg-green-500",
  "Low Stock": "bg-orange-400",
  "Out of Stock": "bg-red-500",
};

const inventoryChartColors: Record<string, string> = {
  "In Stock": "#22c55e",
  "Low Stock": "#fb923c",
  "Out of Stock": "#ef4444",
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("Yearly");
  const [reportType, setReportType] =
    useState<ReportType>("All Transactions");

  const [report, setReport] = useState<ReportResponse>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/reports?period=${period}`,
        {
          method: "GET",
          cache: "no-store",
          signal,
        }
      );

      const data: ReportResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load report data."
        );
      }

      setReport(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load report data."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [period]);

  useEffect(() => {
    const controller = new AbortController();

    loadReports(controller.signal);

    return () => controller.abort();
  }, [loadReports]);

  const filteredTransactions = useMemo(() => {
    if (reportType === "All Transactions") {
      return report.recentTransactions;
    }

    const requiredType =
      reportType === "Sales" ? "Sale" : "Purchase";

    return report.recentTransactions.filter(
      (transaction) => transaction.type === requiredType
    );
  }, [report.recentTransactions, reportType]);

  // Only medicine counts are included in this chart.
  // Expired batches are displayed separately in Inventory Insights.
  const inventoryChartData = useMemo(
    () =>
      report.inventoryData.filter(
        (item) => item.name !== "Expired"
      ),
    [report.inventoryData]
  );

  const inventoryTotal = inventoryChartData.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const inventoryGradient = useMemo(() => {
    if (inventoryTotal === 0) {
      return "#e2e8f0 0% 100%";
    }

    let currentPercentage = 0;

    const segments = inventoryChartData.map((item) => {
      const percentage =
        (item.value / inventoryTotal) * 100;

      const start = currentPercentage;
      const end = currentPercentage + percentage;

      currentPercentage = end;

      return `${
        inventoryChartColors[item.name] || "#94a3b8"
      } ${start}% ${end}%`;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [inventoryChartData, inventoryTotal]);

  const chartMaximum = Math.max(
    1,
    ...report.salesData.flatMap((item) => [
      item.sales,
      item.purchases,
    ])
  );

  function downloadCSV() {
    if (filteredTransactions.length === 0) {
      return;
    }

    const headers = [
      "Transaction ID",
      "Type",
      "Party",
      "Date",
      "Amount",
    ];

    const rows = filteredTransactions.map((transaction) => [
      transaction.id,
      transaction.type,
      transaction.party,
      transaction.date,
      transaction.amount,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `medical-inventory-report-${period.toLowerCase()}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  const stats = report.reportStats;
  const insights = report.inventoryInsights;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Reports & Analytics
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor business performance and inventory insights.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => loadReports()}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            onClick={downloadCSV}
            disabled={loading || filteredTransactions.length === 0}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDownToLine size={17} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}

          <button
            onClick={() => loadReports()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarDays size={18} className="text-blue-600" />
          Report Period
        </div>

        <div className="flex flex-wrap gap-2">
          {(["Weekly", "Monthly", "Yearly"] as ReportPeriod[]).map(
            (item) => (
              <button
                key={item}
                onClick={() => setPeriod(item)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  period === item
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={
            loading ? "..." : formatCurrency(stats.sales)
          }
          subtitle={`${formatNumber(stats.unitsSold)} units sold`}
          icon={<IndianRupee size={21} />}
          color="blue"
        />

        <StatCard
          title="Total Purchases"
          value={
            loading ? "..." : formatCurrency(stats.purchases)
          }
          subtitle={`${formatNumber(stats.purchaseCount)} purchase records`}
          icon={<ShoppingCart size={21} />}
          color="purple"
        />

        <StatCard
          title="Gross Difference"
          value={
            loading
              ? "..."
              : formatCurrency(stats.grossDifference)
          }
          subtitle="Sales minus purchases"
          icon={<TrendingUp size={21} />}
          color="green"
        />

        <StatCard
          title="Total Sales Orders"
          value={
            loading ? "..." : formatNumber(stats.orders)
          }
          subtitle="Recorded sales transactions"
          icon={<Activity size={21} />}
          color="orange"
        />
      </div>

      {/* Sales and purchase chart */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">
                Sales & Purchase Overview
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Monthly financial performance for the current year
              </p>
            </div>

            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                Sales
              </span>

              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="h-2.5 w-2.5 rounded-sm bg-purple-400" />
                Purchases
              </span>
            </div>
          </div>

          <div className="mt-7 flex h-64 items-end justify-between gap-2 border-b border-slate-100 px-1">
            {loading ? (
              <div className="flex w-full items-center justify-center text-sm text-slate-400">
                Loading financial data...
              </div>
            ) : report.salesData.length === 0 ? (
              <div className="flex w-full items-center justify-center text-sm text-slate-400">
                No financial data available.
              </div>
            ) : (
              report.salesData.map((item) => (
                <div
                  key={item.month}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <div className="flex h-[90%] w-full items-end justify-center gap-1">
                    <div
                      title={`Sales: ${formatCurrency(item.sales)}`}
                      style={{
                        height: `${(item.sales / chartMaximum) * 100}%`,
                        minHeight: item.sales > 0 ? "2px" : "0",
                      }}
                      className="w-[45%] max-w-5 rounded-t-sm bg-blue-500 transition hover:bg-blue-600"
                    />

                    <div
                      title={`Purchases: ${formatCurrency(item.purchases)}`}
                      style={{
                        height: `${(item.purchases / chartMaximum) * 100}%`,
                        minHeight: item.purchases > 0 ? "2px" : "0",
                      }}
                      className="w-[45%] max-w-5 rounded-t-sm bg-purple-400 transition hover:bg-purple-500"
                    />
                  </div>

                  <span className="pb-2 text-[10px] text-slate-400 sm:text-xs">
                    {item.month}
                  </span>
                </div>
              ))
            )}
          </div>

          <p className="mt-3 text-right text-xs text-slate-400">
            Values shown in INR
          </p>
        </div>

        {/* Inventory status */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">
            Inventory Status
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Current active medicine stock distribution
          </p>

          <div className="mt-7 flex justify-center">
            <div
              className="relative flex h-44 w-44 items-center justify-center rounded-full"
              style={{ background: inventoryGradient }}
            >
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-3xl font-bold text-slate-800">
                  {loading ? "..." : formatNumber(inventoryTotal)}
                </span>

                <span className="text-xs text-slate-400">
                  Active Medicines
                </span>
              </div>
            </div>
          </div>

          <div className="mt-7 space-y-3">
            {inventoryChartData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 text-slate-500">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      inventoryColors[item.name] || "bg-slate-400"
                    }`}
                  />
                  {item.name}
                </span>

                <span className="font-semibold text-slate-700">
                  {loading ? "..." : formatNumber(item.value)}
                </span>
              </div>
            ))}

            {!loading && inventoryChartData.length === 0 && (
              <p className="text-center text-sm text-slate-400">
                No inventory records available.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top medicines */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-800">
              Top Selling Medicines
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Medicines ranked by quantity sold
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Medicine</th>
                  <th className="px-5 py-3">Quantity</th>
                  <th className="px-5 py-3">Revenue</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {report.topMedicines.map((medicine) => (
                  <tr key={medicine.name}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Pill size={17} />
                        </div>

                        <div>
                          <p className="font-medium text-slate-700">
                            {medicine.name}
                          </p>

                          <p className="text-xs text-slate-400">
                            {medicine.category}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-600">
                      {formatNumber(medicine.quantity)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {formatCurrency(medicine.revenue)}
                    </td>
                  </tr>
                ))}

                {!loading && report.topMedicines.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      No medicine sales available for this period.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      Loading medicine sales...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory alerts */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-800">
              Inventory Insights
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Items that require attention
            </p>
          </div>

          <div className="space-y-4 p-5">
            <InsightRow
              icon={<AlertTriangle size={19} />}
              title="Low Stock Medicines"
              description={`${formatNumber(insights.lowStockMedicines)} medicines are at or below reorder level.`}
              value={loading ? "..." : formatNumber(insights.lowStockMedicines)}
              color="orange"
            />

            <InsightRow
              icon={<Package size={19} />}
              title="Out of Stock"
              description={`${formatNumber(insights.outOfStockMedicines)} active medicines currently have zero stock.`}
              value={loading ? "..." : formatNumber(insights.outOfStockMedicines)}
              color="red"
            />

            <InsightRow
              icon={<Boxes size={19} />}
              title="Expired Batches"
              description={`${formatNumber(insights.expiredBatches)} expired batches have remaining quantity.`}
              value={loading ? "..." : formatNumber(insights.expiredBatches)}
              color="slate"
            />

            <InsightRow
              icon={<FileBarChart size={19} />}
              title="Inventory Records"
              description={`${formatNumber(insights.totalBatches)} stock batches recorded in the database.`}
              value={loading ? "..." : formatNumber(insights.totalBatches)}
              color="blue"
            />
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-800">
              Recent Transactions
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Sales and purchase records for the selected period
            </p>
          </div>

          <select
            value={reportType}
            onChange={(e) =>
              setReportType(e.target.value as ReportType)
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none"
          >
            <option>All Transactions</option>
            <option>Sales</option>
            <option>Purchases</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Transaction ID</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Customer / Supplier</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((transaction, index) => (
                <tr
                  key={`${transaction.id}-${index}`}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-semibold text-slate-700">
                    {transaction.id}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        transaction.type === "Sale"
                          ? "bg-green-50 text-green-700"
                          : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {transaction.party}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {new Date(
                      `${transaction.date}T00:00:00`
                    ).toLocaleDateString("en-IN")}
                  </td>

                  <td className="px-5 py-4 text-right font-semibold text-slate-700">
                    {formatCurrency(transaction.amount)}
                  </td>
                </tr>
              ))}

              {!loading && filteredTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No transactions available for this selection.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-slate-400"
                  >
                    Loading transactions...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  const styles: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>

        <div className={`rounded-lg p-2.5 ${styles[color]}`}>
          {icon}
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold text-slate-800">
        {value}
      </p>

      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <ArrowUpRight size={13} />
        {subtitle}
      </p>
    </div>
  );
}

function InsightRow({
  icon,
  title,
  description,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: string;
  color: string;
}) {
  const styles: Record<string, string> = {
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`rounded-lg p-2.5 ${styles[color]}`}>
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700">
            {title}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <span className="text-lg font-bold text-slate-700">
        {value}
      </span>
    </div>
  );
}
