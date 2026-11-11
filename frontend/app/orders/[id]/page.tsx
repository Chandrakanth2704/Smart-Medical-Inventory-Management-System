"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Package,
  XCircle,
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
  orders?: CustomerOrder[];
  message?: string;
};

const statusSteps = [
  "PLACED",
  "CONFIRMED",
  "PROCESSING",
  "READY",
  "COMPLETED",
];

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
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function OrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrder = useCallback(async () => {
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      setError("Invalid order number.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/customer/orders", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(`/orders/${orderId}`)}`;
        return;
      }

      const data: OrdersResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to retrieve order details.");
      }

      const selectedOrder = (data.orders || []).find(
        (item) => Number(item.orderId) === orderId
      );

      if (!selectedOrder) {
        setError("Order not found.");
        return;
      }

      setOrder(selectedOrder);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while retrieving the order."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const isTerminal =
    order?.orderStatus === "CANCELLED" ||
    order?.orderStatus === "REJECTED";

  const currentStep = order
    ? statusSteps.indexOf(order.orderStatus)
    : -1;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            Back to My Orders
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">
              Loading order details...
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-white p-8 text-center"
          >
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-3 text-lg font-semibold text-gray-900">
              Unable to display order
            </h1>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <Link
              href="/orders"
              className="mt-5 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Return to My Orders
            </Link>
          </div>
        ) : order ? (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-500">Order tracking</p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">
                  Order #{order.orderId}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Placed on {formatDate(order.orderDate)}
                </p>
              </div>

              <button
                type="button"
                onClick={fetchOrder}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Refresh Status
              </button>
            </div>

            <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Order Progress
                  </h2>
                  <p className="text-sm text-gray-500">
                    Current status: {formatStatus(order.orderStatus)}
                  </p>
                </div>
              </div>

              {isTerminal ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle size={20} />
                    <p className="font-semibold">
                      Order {formatStatus(order.orderStatus)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-red-600">
                    This order will not progress through the normal order
                    workflow.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {statusSteps.map((step, index) => {
                    const completed = index <= currentStep;
                    const current = index === currentStep;

                    return (
                      <div key={step} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              completed
                                ? "bg-blue-600 text-white"
                                : "border-2 border-gray-200 bg-white text-gray-400"
                            }`}
                          >
                            {completed ? (
                              <CheckCircle2 size={19} />
                            ) : (
                              <Clock size={17} />
                            )}
                          </div>

                          {index !== statusSteps.length - 1 && (
                            <div
                              className={`mt-1 min-h-7 w-0.5 ${
                                index < currentStep
                                  ? "bg-blue-600"
                                  : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>

                        <div className="pb-5">
                          <p
                            className={`font-semibold ${
                              completed
                                ? "text-gray-900"
                                : "text-gray-400"
                            }`}
                          >
                            {formatStatus(step)}
                            {current && (
                              <span className="ml-2 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                Current
                              </span>
                            )}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {step === "PLACED" &&
                              "Your order has been successfully placed."}
                            {step === "CONFIRMED" &&
                              "Your order has been confirmed."}
                            {step === "PROCESSING" &&
                              "Your order is being prepared."}
                            {step === "READY" &&
                              "Your order is ready for collection or delivery."}
                            {step === "COMPLETED" &&
                              "Your order has been completed."}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-3 border-t border-gray-100 pt-4 text-xs text-gray-500">
                The progress indicator reflects the current order status.
                Previous status-change dates are not recorded in the current
                database.
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="mb-4 font-semibold text-gray-900">
                  Medicine Details
                </h2>

                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div
                      key={item.orderItemId}
                      className="flex justify-between gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.medicineName || "Medicine"}
                        </p>
                        {item.genericName && (
                          <p className="mt-1 text-xs text-gray-500">
                            {item.genericName}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          {item.strength || ""}
                          {item.dosageForm ? ` · ${item.dosageForm}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatPrice(item.totalPrice)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatPrice(item.unitPrice)} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="space-y-6">
                <section className="rounded-xl border border-gray-200 bg-white p-5">
                  <h2 className="mb-4 font-semibold text-gray-900">
                    Payment Summary
                  </h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery fee</span>
                      <span>{formatPrice(order.deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Handling fee</span>
                      <span>{formatPrice(order.handlingFee)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-3 font-bold text-gray-900">
                      <span>Total amount</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                      {order.paymentMode || "Payment mode not specified"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        order.paymentStatus === "PAID"
                          ? "bg-green-50 text-green-700"
                          : order.paymentStatus === "FAILED" ||
                              order.paymentStatus === "REFUNDED"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin size={19} className="text-blue-600" />
                    <h2 className="font-semibold text-gray-900">
                      Delivery Address
                    </h2>
                  </div>

                  <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
                    {order.deliveryAddress}
                  </p>

                  {order.customerNotes && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-xs font-semibold text-gray-700">
                        Your order notes
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                        {order.customerNotes}
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
