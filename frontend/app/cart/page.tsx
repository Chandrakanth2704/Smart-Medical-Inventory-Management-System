"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Pill,
  ShoppingCart,
  Truck,
  ShieldCheck,
  PackageCheck,
  CircleCheck,
} from "lucide-react";
import { CART_STORAGE_KEY, CartItem } from "@/lib/cart";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const FREE_DELIVERY_THRESHOLD = 499;
const DELIVERY_CHARGE = 39;
const HANDLING_CHARGE = 9;

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);

      if (storedCart) {
        const parsed: unknown = JSON.parse(storedCart);

        if (Array.isArray(parsed)) {
          const validItems = parsed.filter(
            (item): item is CartItem =>
              item !== null &&
              typeof item === "object" &&
              Number.isSafeInteger(item.medicineId) &&
              item.medicineId > 0 &&
              typeof item.medicineName === "string" &&
              typeof item.sellingPrice === "number" &&
              Number.isFinite(item.sellingPrice) &&
              item.sellingPrice >= 0 &&
              typeof item.availableQuantity === "number" &&
              Number.isSafeInteger(item.availableQuantity) &&
              item.availableQuantity >= 0 &&
              typeof item.quantity === "number" &&
              Number.isSafeInteger(item.quantity) &&
              item.quantity > 0
          );

          setCart(validItems);
        }
      }
    } catch (error) {
      console.error("Unable to read cart:", error);
      setCart([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  function updateCart(updatedCart: CartItem[]) {
    setCart(updatedCart);
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(updatedCart)
    );
    window.dispatchEvent(new Event("cart-updated"));
  }

  function increaseQuantity(medicineId: number) {
    const updatedCart = cart.map((item) => {
      if (item.medicineId !== medicineId) return item;

      return {
        ...item,
        quantity: Math.min(
          item.quantity + 1,
          item.availableQuantity
        ),
      };
    });

    updateCart(updatedCart);
  }

  function decreaseQuantity(medicineId: number) {
    const updatedCart = cart.map((item) => {
      if (item.medicineId !== medicineId) return item;

      return {
        ...item,
        quantity: Math.max(1, item.quantity - 1),
      };
    });

    updateCart(updatedCart);
  }

  function removeItem(medicineId: number) {
    const updatedCart = cart.filter(
      (item) => item.medicineId !== medicineId
    );

    updateCart(updatedCart);
  }

  function clearCart() {
    updateCart([]);
  }

  const totalItems = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + item.sellingPrice * item.quantity,
        0
      ),
    [cart]
  );

  const deliveryCharge =
    subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_CHARGE;

  const handlingCharge =
    cart.length > 0 ? HANDLING_CHARGE : 0;

  const estimatedTotal =
    subtotal + deliveryCharge + handlingCharge;

  const remainingForFreeDelivery = Math.max(
    0,
    FREE_DELIVERY_THRESHOLD - subtotal
  );

  const freeDeliveryProgress = Math.min(
    100,
    (subtotal / FREE_DELIVERY_THRESHOLD) * 100
  );

  if (!loaded) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F8FB]">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-teal-50 text-[#0D9488]">
            <ShoppingCart size={24} />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading your cart...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F8FB]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B1F3A] text-white shadow-sm">
              <Activity size={23} />
            </span>

            <span className="leading-tight">
              <span className="block text-xl font-extrabold tracking-tight text-[#0B1F3A]">
                Hospil<span className="text-[#0D9488]">Logix</span>
              </span>

              <span className="block text-[10px] font-semibold tracking-[0.13em] text-slate-500">
                YOUR HEALTHCARE STORE
              </span>
            </span>
          </Link>

          <Link
            href="/store"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-[#0D9488]"
          >
            <ArrowLeft size={16} />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#0B1F3A] px-5 py-11 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#5EE0D0]">
            <ShoppingBag size={15} />
            Your Shopping Cart
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Review Your Cart
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Check your selected medicines, update quantities, and
            review your order before proceeding to delivery.
          </p>

          {cart.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 font-semibold">
                {totalItems} {totalItems === 1 ? "Item" : "Items"}
              </span>

              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 font-semibold">
                {currency.format(subtotal)} Subtotal
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Cart Content */}
      <section className="mx-auto max-w-7xl px-5 py-9 sm:py-11">
        {cart.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-teal-50 text-[#0D9488]">
              <ShoppingCart size={36} />
            </span>

            <h2 className="mt-5 text-xl font-bold text-[#0B1F3A]">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
              You haven't added any medicines to your cart yet.
              Explore our store and select the products you need.
            </p>

            <Link
              href="/store"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#087d75] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
            >
              <ShoppingBag size={17} />
              Explore Medicines
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
            {/* Cart Items */}
            <div className="space-y-5">
              {/* Free Delivery Progress */}
              <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-[#0D9488]">
                    <Truck size={21} />
                  </span>

                  <div className="min-w-0 flex-1">
                    {remainingForFreeDelivery > 0 ? (
                      <>
                        <p className="text-sm font-bold text-[#0B1F3A]">
                          Add {currency.format(remainingForFreeDelivery)} more for free delivery
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Free delivery on orders of ₹499 or above.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-2 text-sm font-bold text-[#0D9488]">
                          <CircleCheck size={17} />
                          You've unlocked free delivery!
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Your order qualifies for free delivery.
                        </p>
                      </>
                    )}

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#0D9488] transition-all duration-500"
                        style={{ width: `${freeDeliveryProgress}%` }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-400">
                      <span>₹0</span>
                      <span>₹499 Free Delivery</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cart Heading */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#0B1F3A]">
                    Your Items
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {cart.length} different {cart.length === 1 ? "product" : "products"} in your cart
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearCart}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 size={14} />
                  Clear Cart
                </button>
              </div>

              {/* Individual Items */}
              {cart.map((item) => {
                const atStockLimit =
                  item.quantity >= item.availableQuantity;

                return (
                  <article
                    key={item.medicineId}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md sm:p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      {/* Medicine Icon */}
                      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#E9F7F5] to-[#F1F5F9] text-[#0D9488]">
                        <Pill size={36} strokeWidth={1.5} />
                      </div>

                      {/* Medicine Information */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-[#0B1F3A]">
                            {item.medicineName}
                          </h3>

                          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-[#0D9488]">
                            In Cart
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.genericName || "Generic name not specified"}
                        </p>

                        {item.strength && (
                          <p className="mt-1 text-xs text-slate-500">
                            Strength: {item.strength}
                          </p>
                        )}

                        <p className="mt-3 text-sm font-bold text-[#0D9488]">
                          {currency.format(item.sellingPrice)}
                          <span className="ml-1 text-xs font-normal text-slate-400">
                            per unit
                          </span>
                        </p>
                      </div>

                      {/* Quantity and Price */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:min-w-[220px] sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(item.medicineId)}
                              disabled={item.quantity <= 1}
                              aria-label={`Decrease ${item.medicineName} quantity`}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-white hover:text-[#0D9488] disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Minus size={15} />
                            </button>

                            <span className="min-w-7 text-center text-sm font-bold text-[#0B1F3A]">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => increaseQuantity(item.medicineId)}
                              disabled={atStockLimit}
                              aria-label={`Increase ${item.medicineName} quantity`}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-white hover:text-[#0D9488] disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Plus size={15} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.medicineId)}
                            aria-label={`Remove ${item.medicineName} from cart`}
                            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-base font-extrabold text-[#0B1F3A]">
                            {currency.format(
                              item.sellingPrice * item.quantity
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {item.quantity} × {currency.format(item.sellingPrice)}
                          </p>

                          {atStockLimit && (
                            <p className="mt-1 text-[10px] font-semibold text-amber-600">
                              Maximum available quantity
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Continue Shopping */}
              <Link
                href="/store"
                className="inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#0D9488] transition hover:gap-3 hover:text-[#087d75]"
              >
                <ArrowLeft size={16} />
                Continue Shopping
              </Link>
            </div>

            {/* Order Summary */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#0B1F3A]">
                  Order Summary
                </h2>

                <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-[#0D9488]">
                  <ShoppingBag size={18} />
                </span>
              </div>

              <div className="mt-6 space-y-4 border-b border-slate-100 pb-5">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Total Products</span>
                  <span className="font-semibold text-slate-800">
                    {cart.length}
                  </span>
                </div>

                <div className="flex justify-between text-sm text-slate-500">
                  <span>Total Quantity</span>
                  <span className="font-semibold text-slate-800">
                    {totalItems}
                  </span>
                </div>

                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {currency.format(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm text-slate-500">
                  <span>Delivery Charge</span>
                  {deliveryCharge === 0 ? (
                    <span className="font-bold text-[#0D9488]">
                      FREE
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-800">
                      {currency.format(deliveryCharge)}
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-sm text-slate-500">
                  <span>Handling Charge</span>
                  <span className="font-semibold text-slate-800">
                    {currency.format(handlingCharge)}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between py-5">
                <span className="font-bold text-[#0B1F3A]">
                  Estimated Total
                </span>

                <span className="text-xl font-extrabold text-[#0D9488]">
                  {currency.format(estimatedTotal)}
                </span>
              </div>

              {/* Checkout Button */}
              <Link
                href="/checkout"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0D9488] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#087d75] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
              >
                Continue to Delivery
                <ShoppingBag size={17} />
              </Link>

              {/* Trust Information */}
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck size={16} className="shrink-0 text-[#0D9488]" />
                  Secure order processing
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <PackageCheck size={16} className="shrink-0 text-[#0D9488]" />
                  Stock availability verification
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CircleCheck size={16} className="shrink-0 text-[#0D9488]" />
                  Transparent order charges
                </div>
              </div>

              <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">
                Final availability and pricing will be verified when
                your order is submitted.
              </p>
            </aside>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-5 py-7">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 text-xs text-slate-500">
          <p>© HospilLogix. All rights reserved.</p>

          <Link
            href="/store"
            className="font-semibold transition hover:text-[#0D9488]"
          >
            Explore Store
          </Link>
        </div>
      </footer>
    </main>
  );
}
