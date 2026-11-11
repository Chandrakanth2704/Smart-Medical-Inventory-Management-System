"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Heart,
  Loader2,
  Package,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import AddToCartButton from "@/app/store/add-to-cart-button";

type WishlistItem = {
  WishlistID: number;
  MedicineID: number;
  MedicineName: string;
  GenericName: string | null;
  Manufacturer: string | null;
  Strength: string | null;
  DosageForm: string | null;
  Unit: string;
  SellingPrice: number;
  CategoryName: string;
  AvailableQuantity: number;
  SavedAt: string;
};

type WishlistResponse = {
  success: boolean;
  items?: WishlistItem[];
  message?: string;
};

export default function WishlistPage() {
  const router = useRouter();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchWishlist = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/customer/wishlist", {
        method: "GET",
        cache: "no-store",
      });

      const data: WishlistResponse = await response.json();

      if (response.status === 401) {
        router.push("/login?next=%2Fwishlist");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load your wishlist.");
      }

      setItems(data.items || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your wishlist."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const removeFromWishlist = async (wishlistId: number) => {
    try {
      setRemovingId(wishlistId);
      setError("");

      const response = await fetch(
        `/api/customer/wishlist/${wishlistId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login?next=%2Fwishlist");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to remove this medicine.");
      }

      setItems((currentItems) =>
        currentItems.filter((item) => item.WishlistID !== wishlistId)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while removing the medicine."
      );
    } finally {
      setRemovingId(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(price));

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
              <span className="text-gray-800">My Wishlist</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100">
                <Heart className="h-6 w-6 text-pink-600" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  My Wishlist
                </h1>
                <p className="text-sm text-gray-500">
                  Medicines you have saved for later.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/store"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            <ShoppingBag className="h-4 w-4" />
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
              onClick={fetchWishlist}
              className="ml-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">
              Loading your saved medicines...
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Bookmark className="h-8 w-8 text-gray-400" />
            </div>

            <h2 className="text-lg font-semibold text-gray-900">
              Your wishlist is empty
            </h2>

            <p className="mt-2 max-w-md text-sm text-gray-500">
              You have not saved any medicines yet. Browse the store and save
              medicines you may want to purchase later.
            </p>

            <Link
              href="/store"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <ShoppingBag className="h-4 w-4" />
              Browse Medicines
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  {items.length}
                </span>{" "}
                {items.length === 1 ? "medicine" : "medicines"} saved
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const availableQuantity = Number(item.AvailableQuantity || 0);
                const medicineId = Number(item.MedicineID);
                const wishlistId = Number(item.WishlistID);
                const sellingPrice = Number(item.SellingPrice);

                return (
                  <article
                    key={wishlistId}
                    className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromWishlist(wishlistId)}
                        disabled={removingId === wishlistId}
                        aria-label={`Remove ${item.MedicineName} from wishlist`}
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingId === wishlistId ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    <div className="flex-1">
                      <Link
                        href={`/store/${medicineId}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {item.MedicineName}
                      </Link>

                      {item.GenericName && (
                        <p className="mt-1 text-sm text-gray-500">
                          {item.GenericName}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.CategoryName && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {item.CategoryName}
                          </span>
                        )}

                        {item.Strength && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                            {item.Strength}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-gray-600">
                        {item.Manufacturer && (
                          <p>
                            <span className="font-medium text-gray-700">
                              Manufacturer:
                            </span>{" "}
                            {item.Manufacturer}
                          </p>
                        )}

                        {item.DosageForm && (
                          <p>
                            <span className="font-medium text-gray-700">
                              Dosage Form:
                            </span>{" "}
                            {item.DosageForm}
                          </p>
                        )}

                        <p>
                          <span className="font-medium text-gray-700">
                            Availability:
                          </span>{" "}
                          {availableQuantity > 0 ? (
                            <span className="font-medium text-green-600">
                              {availableQuantity} {item.Unit || "units"} in
                              stock
                            </span>
                          ) : (
                            <span className="font-medium text-red-600">
                              Out of stock
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-gray-100 pt-4">
                      <p className="mb-3 text-xl font-bold text-gray-900">
                        {formatPrice(sellingPrice)}
                      </p>

                      {availableQuantity > 0 ? (
                        <AddToCartButton
                          medicine={{
                            medicineId,
                            medicineName: item.MedicineName,
                            genericName: item.GenericName,
                            strength: item.Strength,
                            sellingPrice,
                            availableQuantity,
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full cursor-not-allowed rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-400"
                        >
                          Currently Unavailable
                        </button>
                      )}

                      <Link
                        href={`/store/${medicineId}`}
                        className="mt-3 block text-center text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View Medicine Details
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
