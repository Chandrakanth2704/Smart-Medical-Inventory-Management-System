import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { requireRole } from "@/lib/auth";
import ChangePasswordForm from "../profile/change-password-form";

export const instant = false;

export default async function ChangePasswordPage() {
  await connection();

  const session = await requireRole(["CUSTOMER"]);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F5F8FB] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">

        <Link
          href="/store"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#0B1F3A] transition hover:text-[#0D9488]"
        >
          <ArrowLeft size={18} />
          Back to Store
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D9488]/10 text-[#0D9488]">
            <LockKeyhole size={28} />
          </div>

          <h1 className="text-3xl font-bold text-[#0B1F3A]">
            Change Password
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Update your account password to keep your account secure.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-[#F5F8FB] p-4">
            <ShieldCheck
              size={22}
              className="mt-0.5 shrink-0 text-[#0D9488]"
            />

            <div>
              <h2 className="font-semibold text-[#0B1F3A]">
                Account Security
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Choose a strong password that you have not used before.
              </p>
            </div>
          </div>

          <ChangePasswordForm />
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link
            href="/customer/profile"
            className="font-medium text-[#0D9488] hover:underline"
          >
            My Profile
          </Link>

          <Link
            href="/customer/orders"
            className="font-medium text-[#0D9488] hover:underline"
          >
            Order History
          </Link>
        </div>

      </div>
    </main>
  );
}
