"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  ShoppingBag,
  IndianRupee,
  Receipt,
  Users,
  Eye,
  X,
  Filter,
  Trash2,
  RefreshCw,
} from "lucide-react";

type PaymentMode = "CASH" | "CARD" | "UPI" | "BANK";

type Sale = {
  id: number;
  invoice: string;
  customer: string;
  date: string;
  items: number;
  quantity: number;
  amount: number;
  paymentMode: PaymentMode;
};

type Customer = {
  id: string;
  name: string;
  type: "REGULAR" | "WALK_IN";
};

type StockItem = {
  stockId: string;
  medicineId: string;
  name: string;
  strength: string | null;
  batch: string;
  expiryDate: string;
  stock: number;
  price: number;
};

type SaleItem = {
  stockId: string;
  quantity: number;
  discount: number;
};

type SalesResponse = {
  sales: Sale[];
  customers: Customer[];
  stock: StockItem[];
  message?: string;
};

function getLocalDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function formatPaymentMode(mode: PaymentMode) {
  const labels: Record<PaymentMode, string> = {
    CASH: "Cash",
    CARD: "Card",
    UPI: "UPI",
    BANK: "Bank Transfer",
  };

  return labels[mode];
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [saleDate, setSaleDate] = useState(getLocalDate());
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");

  const [items, setItems] = useState<SaleItem[]>([
    { stockId: "", quantity: 1, discount: 0 },
  ]);

  const [message, setMessage] = useState("");

  const loadSalesData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await fetch("/api/sales", {
        method: "GET",
        cache: "no-store",
      });

      const data: SalesResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load sales data.");
      }

      setSales(data.sales || []);
      setCustomers(data.customers || []);
      setStock(data.stock || []);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load sales data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return sales;

    return sales.filter(
      (sale) =>
        sale.invoice.toLowerCase().includes(query) ||
        sale.customer.toLowerCase().includes(query)
    );
  }, [sales, search]);

  const totalRevenue = sales.reduce(
    (sum, sale) => sum + sale.amount,
    0
  );

  const totalUnitsSold = sales.reduce(
    (sum, sale) => sum + sale.quantity,
    0
  );

  const saleTotal = items.reduce((sum, item) => {
    const selectedStock = stock.find(
      (entry) => entry.stockId === item.stockId
    );

    if (!selectedStock) return sum;

    return (
      sum +
      Math.max(
        0,
        selectedStock.price * item.quantity - item.discount
      )
    );
  }, 0);

  function resetForm() {
    setCustomerId("");
    setSaleDate(getLocalDate());
    setPaymentMode("UPI");
    setItems([{ stockId: "", quantity: 1, discount: 0 }]);
    setMessage("");
  }

  function updateItem(
    index: number,
    field: keyof SaleItem,
    value: string | number
  ) {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { stockId: "", quantity: 1, discount: 0 },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function saveSale() {
    setMessage("");

    if (!saleDate) {
      setMessage("Please select a sale date.");
      return;
    }

    if (saleDate > getLocalDate()) {
      setMessage("Sale date cannot be in the future.");
      return;
    }

    if (items.length === 0) {
      setMessage("Add at least one medicine.");
      return;
    }

    if (
      items.some(
        (item) =>
          !item.stockId ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.discount) ||
          item.discount < 0
      )
    ) {
      setMessage("Select valid batches, quantities and discounts.");
      return;
    }

    const stockCounts = new Map<string, number>();

    for (const item of items) {
      stockCounts.set(
        item.stockId,
        (stockCounts.get(item.stockId) || 0) + item.quantity
      );
    }

    for (const [stockId, quantity] of stockCounts) {
      const selectedStock = stock.find(
        (entry) => entry.stockId === stockId
      );

      if (!selectedStock) {
        setMessage("A selected stock batch could not be found.");
        return;
      }

      if (selectedStock.expiryDate < saleDate) {
        setMessage(
          `${selectedStock.name} (${selectedStock.batch}) is expired.`
        );
        return;
      }

      if (selectedStock.stock < quantity) {
        setMessage(
          `Insufficient stock for ${selectedStock.name}. Available: ${selectedStock.stock}.`
        );
        return;
      }
    }

    for (const item of items) {
      const selectedStock = stock.find(
        (entry) => entry.stockId === item.stockId
      );

      if (
        selectedStock &&
        item.discount > selectedStock.price * item.quantity
      ) {
        setMessage(
          `Discount exceeds the item value for ${selectedStock.name}.`
        );
        return;
      }
    }

    try {
      setSaving(true);

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customerId ? Number(customerId) : null,
          saleDate,
          paymentMode,
          items: items.map((item) => ({
            stockId: Number(item.stockId),
            quantity: item.quantity,
            discount: item.discount,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to complete sale.");
      }

      setModalOpen(false);
      resetForm();

      await loadSalesData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to complete sale."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">
            Dashboard / Sales
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Sales Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage customer sales, invoices and medicine billing.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadSalesData}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          >
            <Plus size={18} />
            New Sale
          </button>
        </div>
      </div>

      {pageError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {pageError}
          <button
            onClick={loadSalesData}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Sales",
            value: loading ? "..." : sales.length,
            icon: ShoppingBag,
            color: "blue",
          },
          {
            label: "Recorded Sales",
            value: loading ? "..." : sales.length,
            icon: Receipt,
            color: "green",
          },
          {
            label: "Units Sold",
            value: loading ? "..." : totalUnitsSold,
            icon: Users,
            color: "orange",
          },
          {
            label: "Total Revenue",
            value: loading
              ? "..."
              : `₹${totalRevenue.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`,
            icon: IndianRupee,
            color: "violet",
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  card.color === "blue"
                    ? "bg-blue-50 text-blue-600"
                    : card.color === "green"
                      ? "bg-emerald-50 text-emerald-600"
                      : card.color === "orange"
                        ? "bg-orange-50 text-orange-600"
                        : "bg-violet-50 text-violet-600"
                }`}
              >
                <Icon size={21} />
              </div>

              <p className="mt-5 text-sm text-slate-500">
                {card.label}
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {card.value}
              </h2>
            </div>
          );
        })}
      </section>

      {/* Sales register */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-bold text-slate-800">
              Sales Register
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Showing {filteredSales.length} of {sales.length} sales
            </p>
          </div>

          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice or customer..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 sm:w-72"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Invoice</th>
                <th className="px-4 py-4">Customer</th>
                <th className="px-4 py-4">Sale Date</th>
                <th className="px-4 py-4">Items</th>
                <th className="px-4 py-4">Quantity</th>
                <th className="px-4 py-4">Amount</th>
                <th className="px-4 py-4">Payment</th>
                <th className="px-4 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-slate-50/70"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                    {sale.invoice}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {sale.customer}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {new Date(
                      `${sale.date}T00:00:00`
                    ).toLocaleDateString("en-IN")}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {sale.items}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {sale.quantity}
                  </td>

                  <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                    ₹
                    {sale.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {formatPaymentMode(sale.paymentMode)}
                  </td>

                  <td className="px-4 py-4">
                    <button
                      onClick={() => setSelectedSale(sale)}
                      title="View sale"
                      className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && filteredSales.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-sm text-slate-400"
                  >
                    {search
                      ? "No matching sales records found."
                      : "No sales records available yet."}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-sm text-slate-400"
                  >
                    Loading sales records...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* New sale modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Create New Sale
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Select a customer and add medicine batches to the invoice.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Customer
                </span>

                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">Walk-in Customer</option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                      {customer.type === "WALK_IN"
                        ? " (Walk-in)"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Sale Date
                </span>

                <input
                  type="date"
                  value={saleDate}
                  max={getLocalDate()}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Payment Mode
                </span>

                <select
                  value={paymentMode}
                  onChange={(e) =>
                    setPaymentMode(e.target.value as PaymentMode)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </label>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                Medicine Items
              </h3>

              <button
                onClick={addItem}
                className="flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
              >
                <Plus size={15} />
                Add Medicine
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {items.map((item, index) => {
                const selectedStock = stock.find(
                  (entry) => entry.stockId === item.stockId
                );

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        Item {index + 1}
                      </p>

                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="text-xs font-medium text-slate-600">
                          Medicine / Batch
                        </span>

                        <select
                          value={item.stockId}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "stockId",
                              e.target.value
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                        >
                          <option value="">
                            Select medicine batch
                          </option>

                          {stock.map((entry) => (
                            <option
                              key={entry.stockId}
                              value={entry.stockId}
                            >
                              {entry.name}
                              {entry.strength
                                ? ` ${entry.strength}`
                                : ""}
                              {" — "}
                              Batch: {entry.batch}
                              {" — "}
                              Stock: {entry.stock}
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedStock && (
                        <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 sm:col-span-2">
                          <div className="grid grid-cols-2 gap-2">
                            <p>
                              <strong>Batch:</strong>{" "}
                              {selectedStock.batch}
                            </p>

                            <p>
                              <strong>Expiry:</strong>{" "}
                              {selectedStock.expiryDate}
                            </p>

                            <p>
                              <strong>Available:</strong>{" "}
                              {selectedStock.stock}
                            </p>

                            <p>
                              <strong>Price:</strong> ₹
                              {selectedStock.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}

                      <label className="block">
                        <span className="text-xs font-medium text-slate-600">
                          Quantity
                        </span>

                        <input
                          type="number"
                          min="1"
                          max={selectedStock?.stock ?? undefined}
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-medium text-slate-600">
                          Discount (₹)
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "discount",
                              Number(e.target.value)
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                        />
                      </label>
                    </div>

                    <p className="mt-3 text-right text-sm font-semibold text-slate-700">
                      Item Total: ₹
                      {selectedStock
                        ? Math.max(
                            0,
                            selectedStock.price * item.quantity -
                              item.discount
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-between rounded-xl bg-blue-50 p-4">
              <span className="font-semibold text-slate-700">
                Sale Total
              </span>

              <span className="text-xl font-bold text-blue-700">
                ₹
                {saleTotal.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {message && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {message}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={saveSale}
                disabled={saving || loading || stock.length === 0}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale details modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Sale Details
              </h2>

              <button
                onClick={() => setSelectedSale(null)}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Invoice</span>
                <span className="font-semibold text-slate-800">
                  {selectedSale.invoice}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Customer</span>
                <span className="font-semibold text-slate-800">
                  {selectedSale.customer}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Sale Date</span>
                <span className="font-semibold text-slate-800">
                  {selectedSale.date}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Items</span>
                <span className="font-semibold text-slate-800">
                  {selectedSale.items}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Quantity</span>
                <span className="font-semibold text-slate-800">
                  {selectedSale.quantity}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Payment</span>
                <span className="font-semibold text-slate-800">
                  {formatPaymentMode(selectedSale.paymentMode)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-t border-slate-100 pt-4">
                <span className="text-slate-500">Total Amount</span>
                <span className="text-lg font-bold text-blue-700">
                  ₹
                  {selectedSale.amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedSale(null)}
              className="mt-7 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
