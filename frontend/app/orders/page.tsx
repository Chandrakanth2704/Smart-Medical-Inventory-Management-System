"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Loader2,
  Package,
  ShoppingBag,
} from "lucide-react";

type OrderItem = {
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
};

type CustomerOrder = {
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
};

type OrdersResponse = {
  success: boolean;
  count?: number;
  orders?: CustomerOrder[];
  message?: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusStyle(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-green-50 text-green-700";
    case "READY":
      return "bg-emerald-50 text-emerald-700";
    case "PROCESSING":
      return "bg-blue-50 text-blue-700";
    case "CONFIRMED":
      return "bg-indigo-50 text-indigo-700";
    case "CANCELLED":
    case "REJECTED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function paymentStyle(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-50 text-green-700";
    case "FAILED":
    case "REFUNDED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/customer/orders", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login?next=%2Forders";
        return;
      }

      const data: OrdersResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to retrieve your orders.");
      }

      setOrders(data.orders || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while retrieving your orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Link href="/store" className="hover:text-blue-600">
                Store
              </Link>
              <span>/</span>
              <span className="text-gray-800">My Orders</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  My Orders
                </h1>
                <p className="text-sm text-gray-500">
                  View your purchases and track order progress.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/store"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <ShoppingBag size={17} />
            Continue Shopping
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={fetchOrders}
              className="ml-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              No orders yet
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Your medicine orders will appear here after you complete a
              purchase.
            </p>
            <Link
              href="/store"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <ShoppingBag size={17} />
              Browse Medicines
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">
                {orders.length}
              </span>{" "}
              {orders.length === 1 ? "order" : "orders"} found
            </div>

            <div className="space-y-5">
              {orders.map((order) => (
                <article
                  key={order.orderId}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Order number</p>
                      <h2 className="mt-1 text-lg font-bold text-gray-900">
                        #{order.orderId}
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Placed on {formatDate(order.orderDate)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle(order.orderStatus)}`}
                      >
                        {order.orderStatus}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${paymentStyle(order.paymentStatus)}`}
                      >
                        Payment: {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <div>
                      <p className="mb-3 text-sm font-semibold text-gray-800">
                        Order items
                      </p>

                      <div className="space-y-3">
                        {order.items.map((item) => (
                          <div
                            key={item.orderItemId}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <div>
                              <p className="font-medium text-gray-800">
                                {item.medicineName || "Medicine"}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                Quantity: {item.quantity}
                                {item.strength ? ` · ${item.strength}` : ""}
                              </p>
                            </div>
                            <p className="whitespace-nowrap font-medium text-gray-800">
                              {formatPrice(item.totalPrice)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <p className="mt-3 text-xs text-gray-500">
                        {order.itemCount} total units
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="mb-3 text-sm font-semibold text-gray-800">
                        Order summary
                      </p>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-3 text-gray-600">
                          <span>Subtotal</span>
                          <span>{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-gray-600">
                          <span>Delivery fee</span>
                          <span>{formatPrice(order.deliveryFee)}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-gray-600">
                          <span>Handling fee</span>
                          <span>{formatPrice(order.handlingFee)}</span>
                        </div>
                        <div className="flex justify-between gap-3 border-t border-gray-200 pt-3 font-bold text-gray-900">
                          <span>Total</span>
                          <span>{formatPrice(order.total)}</span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-gray-500">
                        Payment mode: {order.paymentMode || "Not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="line-clamp-2 text-xs text-gray-500">
                      Delivery address: {order.deliveryAddress}
                    </p>

                    <Link
                      href={`/orders/${order.orderId}`}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Track Order
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
