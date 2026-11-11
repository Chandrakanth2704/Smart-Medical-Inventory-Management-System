"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  type CartItem,
} from "@/lib/cart";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function FloatingCartBar() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    function updateCart() {
      try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        const parsed: unknown = stored ? JSON.parse(stored) : [];

        setCart(Array.isArray(parsed) ? (parsed as CartItem[]) : []);
      } catch {
        setCart([]);
      }
    }

    updateCart();

    window.addEventListener(CART_UPDATED_EVENT, updateCart);
    window.addEventListener("storage", updateCart);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, updateCart);
      window.removeEventListener("storage", updateCart);
    };
  }, []);

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const subtotal = cart.reduce(
    (total, item) => total + item.sellingPrice * item.quantity,
    0
  );

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4 pointer-events-none">
      <Link
        href="/cart"
        className="pointer-events-auto mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border border-white/30 bg-[#0B1F3A]/90 px-4 py-4 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-xl transition-all duration-300 hover:bg-[#0B1F3A]/95 sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0D9488] text-white shadow-lg shadow-teal-950/20">
            <ShoppingBag size={22} strokeWidth={2} />

            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full border border-[#0B1F3A] bg-white px-1 text-[10px] font-extrabold text-[#0B1F3A]">
              {totalItems}
            </span>
          </span>

          <span className="min-w-0">
            <span className="block text-sm font-extrabold tracking-wide text-white">
              View Cart
            </span>

            <span className="block truncate text-xs font-semibold text-slate-100">
              {totalItems} {totalItems === 1 ? "item" : "items"} added
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="text-sm font-extrabold tracking-wide text-white sm:text-base">
            {currency.format(subtotal)}
          </span>

          <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/20 bg-white/15 text-white transition group-hover:bg-white/25">
            <ArrowRight size={19} strokeWidth={2.2} />
          </span>
        </div>
      </Link>
    </div>
  );
}
