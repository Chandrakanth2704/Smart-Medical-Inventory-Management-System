"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  CartItem,
} from "@/lib/cart";

interface AddToCartButtonProps {
  medicine: {
    medicineId: number;
    medicineName: string;
    genericName: string | null;
    strength: string | null;
    sellingPrice: number;
    availableQuantity: number;
  };
}

function readCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function AddToCartButton({
  medicine,
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    const existingItem = readCart().find(
      (item) => item.medicineId === medicine.medicineId
    );

    setQuantity(existingItem?.quantity ?? 0);
  }, [medicine.medicineId]);

  function saveCart(updatedCart: CartItem[]) {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(updatedCart)
    );

    const updatedItem = updatedCart.find(
      (item) => item.medicineId === medicine.medicineId
    );

    setQuantity(updatedItem?.quantity ?? 0);

    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }

  function addToCart() {
    const cart = readCart();

    const existingItem = cart.find(
      (item) => item.medicineId === medicine.medicineId
    );

    if (existingItem) {
      existingItem.quantity = Math.min(
        existingItem.quantity + 1,
        medicine.availableQuantity
      );

      existingItem.availableQuantity = medicine.availableQuantity;
      existingItem.sellingPrice = medicine.sellingPrice;
    } else {
      cart.push({
        ...medicine,
        quantity: 1,
      });
    }

    saveCart(cart);
  }

  function increaseQuantity() {
    if (quantity >= medicine.availableQuantity) return;

    const cart = readCart();
    const item = cart.find(
      (entry) => entry.medicineId === medicine.medicineId
    );

    if (!item) {
      addToCart();
      return;
    }

    item.quantity = Math.min(
      item.quantity + 1,
      medicine.availableQuantity
    );

    saveCart(cart);
  }

  function decreaseQuantity() {
    const cart = readCart();

    const updatedCart = cart
      .map((item) => {
        if (item.medicineId !== medicine.medicineId) {
          return item;
        }

        return {
          ...item,
          quantity: item.quantity - 1,
        };
      })
      .filter((item) => item.quantity > 0);

    saveCart(updatedCart);
  }

  if (medicine.availableQuantity <= 0) {
    return (
      <button
        type="button"
        disabled
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-slate-300 px-3 py-2 text-xs font-bold text-white"
      >
        Currently Unavailable
      </button>
    );
  }

  return (
    <div className="mt-3">
      {quantity === 0 ? (
        <button
          type="button"
          onClick={addToCart}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0D9488] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#087d75]"
        >
          <ShoppingBag size={15} />
          Add to Cart
        </button>
      ) : (
        <div className="flex min-h-10 w-full items-center justify-between overflow-hidden rounded-lg border border-[#0D9488] bg-teal-50">
          <button
            type="button"
            onClick={decreaseQuantity}
            aria-label={`Remove one ${medicine.medicineName}`}
            className="grid h-10 w-12 place-items-center text-[#0D9488] transition hover:bg-teal-100"
          >
            <Minus size={17} />
          </button>

          <span className="text-sm font-extrabold text-[#0B1F3A]">
            {quantity}
          </span>

          <button
            type="button"
            onClick={increaseQuantity}
            disabled={quantity >= medicine.availableQuantity}
            aria-label={`Add one ${medicine.medicineName}`}
            className="grid h-10 w-12 place-items-center text-[#0D9488] transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
