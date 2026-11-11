"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserRound,
  ChevronDown,
  Package,
  LockKeyhole,
  LogOut,
} from "lucide-react";

interface StoreAccountMenuProps {
  profileCompletion: number;
}

export default function StoreAccountMenu({
  profileCompletion,
}: StoreAccountMenuProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const completion = Math.min(
    100,
    Math.max(0, Math.round(profileCompletion))
  );

  const circumference = 2 * Math.PI * 19;
  const strokeOffset =
    circumference - (completion / 100) * circumference;

  async function handleLogout() {
    setIsLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to log out.");
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to log out. Please try again."
      );

      setIsLoggingOut(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen((previous) => !previous);
          setError("");
        }}
        aria-label={`Open customer account menu. Profile ${completion}% complete`}
        aria-expanded={isOpen}
        title={`Profile completion: ${completion}%`}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-[#0B1F3A] shadow-sm transition hover:border-[#0D9488] hover:bg-teal-50 focus:outline-none focus:ring-4 focus:ring-teal-100"
      >
        {/* Profile icon with circular completion ring */}
        <span className="relative grid h-11 w-11 place-items-center">
          <svg
            viewBox="0 0 44 44"
            className="absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            {/* Background ring */}
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="3"
            />

            {/* Profile completion ring */}
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              stroke="#0D9488"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              className="transition-all duration-500 ease-in-out"
            />
          </svg>

          {/* Profile icon */}
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E8F5F3] text-[#0D9488]">
            <UserRound size={19} />
          </span>

          {/* Completion percentage */}
          <span className="absolute -bottom-1 -right-2 rounded-md border border-white bg-[#0B1F3A] px-1 py-0.5 text-[8px] font-bold leading-none text-white shadow-sm">
            {completion}%
          </span>
        </span>

        <ChevronDown
          size={16}
          className={`hidden text-slate-500 transition-transform sm:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            <div className="border-b border-slate-100 bg-[#F5F8FB] px-4 py-4">
              <p className="text-sm font-bold text-[#0B1F3A]">
                Customer Account
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Manage your HospilLogix account
              </p>

              {/* Profile completion information */}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    Profile completion
                  </span>

                  <span className="text-sm font-extrabold text-[#0D9488]">
                    {completion}%
                  </span>
                </div>

                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-label="Profile completion"
                  aria-valuenow={completion}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-[#0D9488] transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>

                <p className="mt-2 text-[11px] text-slate-500">
                  {completion === 100
                    ? "Your profile is complete."
                    : "Complete your profile to make future orders easier."}
                </p>
              </div>
            </div>

            <div className="p-2">
              <Link
                href="/customer/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-[#0D9488]"
              >
                <UserRound size={18} />
                My Profile
              </Link>

              <Link
                href="/customer/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-[#0D9488]"
              >
                <Package size={18} />
                Order History
              </Link>

              <Link
                href="/customer/change-password"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-[#0D9488]"
              >
                <LockKeyhole size={18} />
                Change Password
              </Link>
            </div>

            <div className="border-t border-slate-100 p-2">
              {error && (
                <p className="px-3 py-2 text-xs text-rose-600">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={18} />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}