"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";

interface SaveToWishlistButtonProps {
  medicineId: number;
}

interface WishlistItem {
  WishlistID: number;
  MedicineID: number | string;
}

interface WishlistResponse {
  success: boolean;
  items?: WishlistItem[];
  message?: string;
}

export default function SaveToWishlistButton({
  medicineId,
}: SaveToWishlistButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [wishlistId, setWishlistId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkWishlist() {
      try {
        const response = await fetch("/api/customer/wishlist", {
          cache: "no-store",
        });

        if (response.status === 401) {
          return;
        }

        const data: WishlistResponse = await response.json();

        if (!response.ok || !data.success) {
          return;
        }

        const savedItem = (data.items || []).find(
          (item) => Number(item.MedicineID) === medicineId
        );

        if (!cancelled) {
          setIsSaved(!!savedItem);
          setWishlistId(savedItem ? Number(savedItem.WishlistID) : null);
        }
      } catch (error) {
        console.error("Check wishlist error:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkWishlist();

    return () => {
      cancelled = true;
    };
  }, [medicineId]);

  async function toggleWishlist() {
    if (isSaving || isLoading) return;

    setIsSaving(true);
    setMessage("");

    try {
      if (isSaved) {
        if (wishlistId === null) {
          setMessage("Unable to identify this saved medicine.");
          return;
        }

        const response = await fetch(
          `/api/customer/wishlist/${wishlistId}`,
          {
            method: "DELETE",
          }
        );

        const data = await response.json();

        if (response.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent("/wishlist")}`;
          return;
        }

        if (!response.ok || !data.success) {
          setMessage(data.message || "Unable to remove medicine.");
          return;
        }

        setIsSaved(false);
        setWishlistId(null);
        setMessage("Removed from your wishlist.");
      } else {
        const response = await fetch("/api/customer/wishlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ medicineId }),
        });

        const data = await response.json();

        if (response.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent("/wishlist")}`;
          return;
        }

        if (!response.ok || !data.success) {
          setMessage(data.message || "Unable to save medicine.");
          return;
        }

        setIsSaved(true);
        setMessage(
          data.alreadySaved
            ? "Already in your wishlist."
            : "Added to your wishlist."
        );

        // Retrieve the WishlistID for the next removal.
        const refreshResponse = await fetch("/api/customer/wishlist", {
          cache: "no-store",
        });

        if (refreshResponse.ok) {
          const refreshData: WishlistResponse =
            await refreshResponse.json();

          if (refreshData.success) {
            const savedItem = (refreshData.items || []).find(
              (item) => Number(item.MedicineID) === medicineId
            );

            setWishlistId(
              savedItem ? Number(savedItem.WishlistID) : null
            );
          }
        }
      }
    } catch (error) {
      console.error("Toggle wishlist error:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggleWishlist}
        disabled={isLoading || isSaving}
        aria-label={
          isSaved
            ? "Remove medicine from wishlist"
            : "Add medicine to wishlist"
        }
        aria-pressed={isSaved}
        className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isSaved
            ? "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100"
            : "border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
        }`}
      >
        {isSaving ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Heart size={15} className={isSaved ? "fill-current" : ""} />
        )}

        {isLoading
          ? "Checking..."
          : isSaving
            ? isSaved
              ? "Removing..."
              : "Saving..."
            : isSaved
              ? "Remove from Wishlist"
              : "Add to Wishlist"}
      </button>

      {message && (
        <p
          role="status"
          className="mt-1 text-center text-xs text-slate-500"
        >
          {message}
        </p>
      )}
    </div>
  );
}
