"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  CreditCard,
  MapPin,
  Package,
  RefreshCw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

interface OrderItem {
  orderItemId: number;
  medicineId: number;
  medicineName: string | null;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

interface CustomerOrder {
  orderId: number;
  orderDate: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMode: string | null;
  deliveryAddress: string;
  customerNotes: string | null;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  handlingFee: number;
  total: number;
  itemCount: number;
}

interface OrdersResponse {
  success: boolean;
  message?: string;
  count?: number;
  orders?: CustomerOrder[];
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value || 0);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case "PLACED":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "CONFIRMED":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "PROCESSING":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "READY":
      return "bg-teal-50 text-teal-700 border-teal-200";

    case "COMPLETED":
      return "bg-green-50 text-green-700 border-green-200";

    case "CANCELLED":
    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function getPaymentStyle(status: string) {
  switch (status) {
    case "PAID":
      return "text-green-700 bg-green-50";

    case "FAILED":
    case "REFUNDED":
      return "text-red-700 bg-red-50";

    default:
      return "text-amber-700 bg-amber-50";
  }
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchOrders = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/customer/orders", {
        method: "GET",
        cache: "no-store",
      });

      const data: OrdersResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to retrieve your orders."
        );
      }

      const fetchedOrders = data.orders ?? [];

      setOrders(fetchedOrders);

      setExpandedOrderId((current) => {
        if (
          current !== null &&
          fetchedOrders.some((order) => order.orderId === current)
        ) {
          return current;
        }

        return null;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while retrieving orders."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        order.orderStatus === statusFilter;

      const searchValue = search.trim().toLowerCase();

      const matchesSearch =
        searchValue === "" ||
        String(order.orderId).includes(searchValue) ||
        order.items.some((item) =>
          (item.medicineName ?? "")
            .toLowerCase()
            .includes(searchValue)
        );

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const totalOrders = orders.length;

  const totalSpent = orders.reduce(
    (total, order) => total + order.total,
    0
  );

  const toggleOrder = (orderId: number) => {
    setExpandedOrderId((current) =>
      current === orderId ? null : orderId
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F8FB] text-[#0B1F3A]">
      {/* Header */}

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B1F3A] text-white">
              <ShoppingBag size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                HospilLogix
              </h1>
              <p className="text-xs text-gray-500">
                Smart Medical Inventory Management
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-[#0B1F3A] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back to Store */}

        <div className="mb-7">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1F3A] shadow-sm transition hover:border-[#0D9488] hover:bg-teal-50 hover:text-[#0D9488] focus:outline-none focus:ring-4 focus:ring-teal-100"
          >
            <ArrowLeft size={17} />
            Back to Store
          </Link>
        </div>

        {/* Page heading */}

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0D9488]">
            <Package size={17} />
            Customer Account
          </div>

          <h2 className="text-3xl font-bold text-[#0B1F3A]">
            My Orders
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            View and track your medicine orders and purchase history.
          </p>
        </div>

        {/* Summary cards */}

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Orders
                </p>

                <p className="mt-2 text-3xl font-bold text-[#0B1F3A]">
                  {loading ? "—" : totalOrders}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <ShoppingBag size={23} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Order Value
                </p>

                <p className="mt-2 text-3xl font-bold text-[#0D9488]">
                  {loading ? "—" : formatCurrency(totalSpent)}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-[#0D9488]">
                <CreditCard size={23} />
              </div>
            </div>
          </div>
        </div>

        {/* Search and filters */}

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <label
                htmlFor="order-search"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Search Orders
              </label>

              <input
                id="order-search"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by order ID or medicine name..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#0D9488] focus:bg-white focus:ring-2 focus:ring-[#0D9488]/10"
              />
            </div>

            <div>
              <label
                htmlFor="order-status"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Filter by Status
              </label>

              <select
                id="order-status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#0D9488] focus:bg-white"
              >
                <option value="ALL">All Orders</option>
                <option value="PLACED">Placed</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}

        {loading && (
          <div className="rounded-2xl border border-gray-100 bg-white py-20 text-center shadow-sm">
            <RefreshCw
              size={30}
              className="mx-auto animate-spin text-[#0D9488]"
            />

            <p className="mt-4 text-sm font-medium text-gray-600">
              Loading your orders...
            </p>
          </div>
        )}

        {/* Error */}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <AlertCircle
              size={36}
              className="mx-auto text-red-500"
            />

            <h3 className="mt-4 text-lg font-bold text-[#0B1F3A]">
              Unable to load orders
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              {error}
            </p>

            <button
              onClick={() => fetchOrders()}
              className="mt-5 rounded-xl bg-[#0D9488] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}

        {!loading && !error && orders.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-[#0D9488]">
              <ShoppingBag size={30} />
            </div>

            <h3 className="mt-5 text-xl font-bold text-[#0B1F3A]">
              No orders yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              Your medicine orders will appear here after you
              successfully place an order.
            </p>

            <Link
              href="/store"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#087d75]"
            >
              <ShoppingBag size={17} />
              Start Shopping
            </Link>
          </div>
        )}

        {/* No filter results */}

        {!loading &&
          !error &&
          orders.length > 0 &&
          filteredOrders.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
              <Package
                size={32}
                className="mx-auto text-gray-400"
              />

              <h3 className="mt-4 font-semibold text-[#0B1F3A]">
                No matching orders
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Try changing your search or status filter.
              </p>
            </div>
          )}

        {/* Orders list */}

        {!loading && !error && filteredOrders.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0B1F3A]">
                Order History
              </h3>

              <span className="text-sm text-gray-500">
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1 ? "order" : "orders"}
              </span>
            </div>

            {filteredOrders.map((order) => {
              const isExpanded =
                expandedOrderId === order.orderId;

              return (
                <div
                  key={order.orderId}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Order summary */}

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[#0D9488]">
                          <Package size={24} />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-base font-bold text-[#0B1F3A]">
                              Order #{order.orderId}
                            </h4>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
                                order.orderStatus
                              )}`}
                            >
                              {order.orderStatus}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <CalendarDays size={15} />
                              {formatDate(order.orderDate)}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <ShoppingBag size={15} />
                              {order.itemCount} items
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 lg:justify-end">
                        <div>
                          <p className="text-xs text-gray-500">
                            Order Total
                          </p>

                          <p className="mt-1 text-xl font-bold text-[#0B1F3A]">
                            {formatCurrency(order.total)}
                          </p>
                        </div>

                        <button
                          onClick={() => toggleOrder(order.orderId)}
                          aria-expanded={isExpanded}
                          aria-label={`${
                            isExpanded ? "Hide" : "View"
                          } order ${order.orderId} details`}
                          className="flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#16365D]"
                        >
                          {isExpanded ? "Hide Details" : "View Details"}

                          {isExpanded ? (
                            <ChevronUp size={17} />
                          ) : (
                            <ChevronDown size={17} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded order details */}

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/70 p-5 sm:p-6">
                      {/* Medicine details */}

                      <div className="mb-6">
                        <h5 className="mb-4 flex items-center gap-2 font-bold text-[#0B1F3A]">
                          <ShoppingBag
                            size={18}
                            className="text-[#0D9488]"
                          />
                          Ordered Medicines
                        </h5>

                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                          <table className="w-full min-w-[650px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                              <tr>
                                <th className="px-4 py-4 font-semibold">
                                  Medicine
                                </th>

                                <th className="px-4 py-4 font-semibold">
                                  Unit Price
                                </th>

                                <th className="px-4 py-4 font-semibold">
                                  Quantity
                                </th>

                                <th className="px-4 py-4 text-right font-semibold">
                                  Total
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                              {order.items.map((item) => (
                                <tr key={item.orderItemId}>
                                  <td className="px-4 py-4">
                                    <p className="font-semibold text-[#0B1F3A]">
                                      {item.medicineName ||
                                        "Medicine unavailable"}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                      {[
                                        item.genericName,
                                        item.strength,
                                        item.dosageForm,
                                      ]
                                        .filter(Boolean)
                                        .join(" • ") || "—"}
                                    </p>
                                  </td>

                                  <td className="px-4 py-4 text-gray-600">
                                    {formatCurrency(item.unitPrice)}
                                  </td>

                                  <td className="px-4 py-4 text-gray-600">
                                    {item.quantity}{" "}
                                    {item.unit || ""}
                                  </td>

                                  <td className="px-4 py-4 text-right font-semibold text-[#0B1F3A]">
                                    {formatCurrency(item.totalPrice)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Delivery information and payment */}

                      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                          <h5 className="mb-3 flex items-center gap-2 font-bold text-[#0B1F3A]">
                            <MapPin
                              size={18}
                              className="text-[#0D9488]"
                            />
                            Delivery Address
                          </h5>

                          <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
                            {order.deliveryAddress}
                          </p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-5">
                          <h5 className="mb-3 flex items-center gap-2 font-bold text-[#0B1F3A]">
                            <CreditCard
                              size={18}
                              className="text-[#0D9488]"
                            />
                            Payment Information
                          </h5>

                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-500">
                              Payment Mode
                            </span>

                            <span className="font-semibold text-[#0B1F3A]">
                              {order.paymentMode || "Not selected"}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-500">
                              Payment Status
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStyle(
                                order.paymentStatus
                              )}`}
                            >
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Order notes */}

                      {order.customerNotes && (
                        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
                          <h5 className="mb-2 font-bold text-[#0B1F3A]">
                            Order Notes
                          </h5>

                          <p className="text-sm text-gray-600">
                            {order.customerNotes}
                          </p>
                        </div>
                      )}

                      {/* Price summary */}

                      <div className="ml-auto max-w-md rounded-xl border border-gray-200 bg-white p-5">
                        <h5 className="mb-4 font-bold text-[#0B1F3A]">
                          Order Summary
                        </h5>

                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-500">
                              Subtotal
                            </span>

                            <span className="font-medium text-[#0B1F3A]">
                              {formatCurrency(order.subtotal)}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="flex items-center gap-2 text-gray-500">
                              <Truck size={15} />
                              Delivery Fee
                            </span>

                            <span className="font-medium text-[#0B1F3A]">
                              {order.deliveryFee === 0
                                ? "FREE"
                                : formatCurrency(order.deliveryFee)}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="text-gray-500">
                              Handling Fee
                            </span>

                            <span className="font-medium text-[#0B1F3A]">
                              {formatCurrency(order.handlingFee)}
                            </span>
                          </div>

                          <div className="border-t border-dashed border-gray-200 pt-3">
                            <div className="flex justify-between gap-4">
                              <span className="font-bold text-[#0B1F3A]">
                                Grand Total
                              </span>

                              <span className="text-lg font-bold text-[#0D9488]">
                                {formatCurrency(order.total)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Order status information */}

                      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {order.orderStatus === "COMPLETED" ? (
                          <CheckCircle2
                            size={16}
                            className="text-green-600"
                          />
                        ) : order.orderStatus === "CANCELLED" ||
                          order.orderStatus === "REJECTED" ? (
                          <XCircle
                            size={16}
                            className="text-red-500"
                          />
                        ) : (
                          <Clock3
                            size={16}
                            className="text-[#0D9488]"
                          />
                        )}

                        <span>
                          Current order status:{" "}
                          <strong className="text-[#0B1F3A]">
                            {order.orderStatus}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}

      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-gray-500 sm:px-6 lg:px-8">
          © 2026 HospilLogix. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
