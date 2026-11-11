import Link from "next/link";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  UserRound,
  Mail,
  Phone,
  ShieldCheck,
  LockKeyhole,
  Package,
  ArrowRight,
} from "lucide-react";

import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";
import DeliveryAddressForm from "./delivery-address-form";

export const instant = false;

interface CustomerProfileRow extends RowDataPacket {
  CustomerID: number | string;
  CustomerName: string;
  Email: string;
  Phone: string;
  Type: string;
  Status: string;
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#0D9488] shadow-sm">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-[#0B1F3A]">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

export default async function CustomerProfilePage() {
  await connection();

  const session = await requireRole(["CUSTOMER"]);

  if (!session) {
    redirect("/login");
  }

  const [customerRows] = await pool.execute<CustomerProfileRow[]>(
    `SELECT
       CustomerID,
       CustomerName,
       Email,
       Phone,
       Type,
       Status
     FROM customers
     WHERE UserID = ?
     LIMIT 1`,
    [session.userId]
  );

  const customer = customerRows[0];

  if (!customer) {
    notFound();
  }

  const initials = customer.CustomerName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  const isActive = customer.Status.toUpperCase() === "ACTIVE";

  return (
    <main className="min-h-screen bg-[#F5F8FB]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-5">
          <Link href="/store" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B1F3A] text-white">
              <Activity size={23} />
            </span>

            <span className="leading-tight">
              <span className="block text-xl font-extrabold tracking-tight text-[#0B1F3A]">
                Hospil<span className="text-[#0D9488]">Logix</span>
              </span>

              <span className="block text-[10px] font-semibold tracking-[0.13em] text-slate-500">
                CUSTOMER ACCOUNT
              </span>
            </span>
          </Link>

          <Link
            href="/store"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-[#0D9488] hover:bg-teal-50 hover:text-[#0D9488]"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Store</span>
            <span className="sm:hidden">Store</span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-9">
        {/* Page heading */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0D9488]">
            Customer Account
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0B1F3A]">
            My Profile
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View and manage your personal account information.
          </p>
        </div>

        {/* Customer profile card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#0B1F3A] px-6 py-8 text-white sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-extrabold text-[#5EE0D0]">
                {initials || <UserRound size={32} />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5EE0D0]">
                  Customer Profile
                </p>

                <h2 className="mt-2 break-words text-2xl font-extrabold">
                  {customer.CustomerName}
                </h2>

                <p className="mt-1 break-words text-sm text-slate-300">
                  {customer.Email}
                </p>
              </div>

              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${
                  isActive
                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                    : "border-rose-300/20 bg-rose-400/10 text-rose-200"
                }`}
              >
                <ShieldCheck size={15} />
                {customer.Status}
              </span>
            </div>
          </div>

          {/* Personal information */}
          <div className="p-5 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-extrabold text-[#0B1F3A]">
                Personal Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your registered customer account details.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                icon={<UserRound size={20} />}
                label="Customer ID"
                value={String(customer.CustomerID)}
              />

              <InfoCard
                icon={<UserRound size={20} />}
                label="Full Name"
                value={customer.CustomerName}
              />

              <InfoCard
                icon={<Mail size={20} />}
                label="Email Address"
                value={customer.Email}
              />

              <InfoCard
                icon={<Phone size={20} />}
                label="Phone Number"
                value={customer.Phone}
              />

              <InfoCard
                icon={<UserRound size={20} />}
                label="Username"
                value={session.username}
              />

              <InfoCard
                icon={<ShieldCheck size={20} />}
                label="Account Type"
                value={customer.Type}
              />

              <InfoCard
                icon={<ShieldCheck size={20} />}
                label="Account Status"
                value={customer.Status}
              />
            </div>
          </div>
        </section>

        {/* Delivery address */}
        <DeliveryAddressForm />

        {/* Account navigation */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-extrabold text-[#0B1F3A]">
            Account Management
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Order history */}
            <Link
              href="/customer/orders"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0D9488] hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-50 text-[#0D9488]">
                  <Package size={23} />
                </span>

                <div>
                  <h3 className="font-bold text-[#0B1F3A]">
                    Order History
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    View your previous orders and order details.
                  </p>
                </div>
              </div>

              <ArrowRight
                size={19}
                className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#0D9488]"
              />
            </Link>

            {/* Change password */}
            <Link
              href="/customer/change-password"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0D9488] hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <LockKeyhole size={23} />
                </span>

                <div>
                  <h3 className="font-bold text-[#0B1F3A]">
                    Change Password
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Update your account password securely.
                  </p>
                </div>
              </div>

              <ArrowRight
                size={19}
                className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#0D9488]"
              />
            </Link>
          </div>
        </section>
      </section>

      {/* Footer */}
      <footer className="mt-10 border-t border-slate-200 bg-white px-5 py-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row">
          <p>© HospilLogix. All rights reserved.</p>

          <Link
            href="/store"
            className="font-semibold transition hover:text-[#0D9488]"
          >
            Return to Store
          </Link>
        </div>
      </footer>
    </main>
  );
}
