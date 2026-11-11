"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Building2,
  Users,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  Eye,
  X,
  Filter,
} from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: "Active" | "Inactive";
};

type SupplierForm = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: "Active" | "Inactive";
};

const emptyForm: SupplierForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  status: "Active",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [pageError, setPageError] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadSuppliers() {
    try {
      setPageError("");

      const response = await fetch("/api/suppliers", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load suppliers.");
      }

      setSuppliers(data.suppliers || []);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load suppliers."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const query = search.toLowerCase();

      const matchesSearch =
        supplier.name.toLowerCase().includes(query) ||
        supplier.contactPerson.toLowerCase().includes(query) ||
        supplier.email.toLowerCase().includes(query) ||
        supplier.phone.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || supplier.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, search, statusFilter]);

  const activeCount = suppliers.filter(
    (supplier) => supplier.status === "Active"
  ).length;

  const inactiveCount = suppliers.length - activeCount;

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setModalOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingId(supplier.id);

    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      status: supplier.status,
    });

    setMessage("");
    setModalOpen(true);
  }

  async function saveSupplier() {
    if (
      !form.name.trim() ||
      !form.contactPerson.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.address.trim()
    ) {
      setMessage("Please fill in all required fields.");
      return;
    }

    if (!/^[0-9]{10}$/.test(form.phone.trim())) {
      setMessage("Enter a valid 10-digit phone number.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setMessage("Enter a valid email address.");
      return;
    }

    const duplicateEmail = suppliers.some(
      (supplier) =>
        supplier.email.toLowerCase() === form.email.trim().toLowerCase() &&
        supplier.id !== editingId
    );

    if (duplicateEmail) {
      setMessage("A supplier with this email already exists.");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");

      const url =
        editingId !== null
          ? `/api/suppliers/${editingId}`
          : "/api/suppliers";

      const response = await fetch(url, {
        method: editingId !== null ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          contactPerson: form.contactPerson.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save supplier.");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      setMessage("");

      await loadSuppliers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save supplier."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSupplier(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this supplier?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete supplier.");
      }

      window.alert(data.message);
      await loadSuppliers();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to delete supplier."
      );
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">Dashboard / Suppliers</p>

          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Supplier Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage supplier details and maintain supplier records.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Supplier
        </button>
      </div>

      {/* Loading and error messages */}
      {pageError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {/* Summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Suppliers",
            value: suppliers.length,
            icon: Building2,
            color: "blue",
          },
          {
            label: "Active Suppliers",
            value: activeCount,
            icon: Users,
            color: "green",
          },
          {
            label: "Inactive Suppliers",
            value: inactiveCount,
            icon: Building2,
            color: "orange",
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  card.color === "blue"
                    ? "bg-blue-50 text-blue-600"
                    : card.color === "green"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-orange-50 text-orange-600"
                }`}
              >
                <Icon size={21} />
              </div>

              <p className="mt-5 text-sm text-slate-500">
                {card.label}
              </p>

              <h2 className="mt-1 text-3xl font-bold text-slate-900">
                {card.value}
              </h2>
            </div>
          );
        })}
      </section>

      {/* Supplier list */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-bold text-slate-800">
              Supplier Directory
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Showing {filteredSuppliers.length} of {suppliers.length} suppliers
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search suppliers..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 sm:w-64"
              />
            </div>

            <div className="relative">
              <Filter
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-blue-400 sm:w-40"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-4 py-4">Contact Person</th>
                <th className="px-4 py-4">Phone</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-slate-400"
                  >
                    Loading suppliers...
                  </td>
                </tr>
              ) : (
                <>
                  {filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Building2 size={19} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {supplier.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Supplier #{String(supplier.id).padStart(3, "0")}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {supplier.contactPerson || "—"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {supplier.phone || "—"}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {supplier.email || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            supplier.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {supplier.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewSupplier(supplier)}
                            title="View supplier"
                            className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Eye size={17} />
                          </button>

                          <button
                            onClick={() => openEditModal(supplier)}
                            title="Edit supplier"
                            className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => deleteSupplier(supplier.id)}
                            title="Delete supplier"
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-slate-400"
                      >
                        No suppliers found.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId !== null ? "Edit Supplier" : "Add New Supplier"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Enter the supplier information below.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {[
                { label: "Supplier Name", key: "name", type: "text" },
                { label: "Contact Person", key: "contactPerson", type: "text" },
                { label: "Phone Number", key: "phone", type: "tel" },
                { label: "Email Address", key: "email", type: "email" },
                { label: "Address", key: "address", type: "text" },
              ].map((field) => (
                <label key={field.key} className="block">
                  <span className="text-sm font-medium text-slate-700">
                    {field.label}
                  </span>

                  <input
                    type={field.type}
                    value={form[field.key as keyof SupplierForm]}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                  />
                </label>
              ))}

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Status
                </span>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      status: e.target.value as "Active" | "Inactive",
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

            {message && (
              <p className="mt-4 text-sm text-red-600">
                {message}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                disabled={isSaving}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={saveSupplier}
                disabled={isSaving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? "Saving..."
                  : editingId !== null
                    ? "Save Changes"
                    : "Add Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Supplier Modal */}
      {viewSupplier && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Supplier Details
              </h2>

              <button
                onClick={() => setViewSupplier(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Building2 size={23} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  {viewSupplier.name}
                </h3>

                <p className="text-xs text-slate-500">
                  Supplier #{String(viewSupplier.id).padStart(3, "0")}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <Users size={17} className="text-slate-400" />
                {viewSupplier.contactPerson || "Not provided"}
              </div>

              <div className="flex items-center gap-3">
                <Phone size={17} className="text-slate-400" />
                {viewSupplier.phone || "Not provided"}
              </div>

              <div className="flex items-center gap-3">
                <Mail size={17} className="text-slate-400" />
                {viewSupplier.email || "Not provided"}
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={17} className="text-slate-400" />
                {viewSupplier.address || "Not provided"}
              </div>

              <div className="flex items-center gap-3">
                <Building2 size={17} className="text-slate-400" />
                Status: {viewSupplier.status}
              </div>
            </div>

            <button
              onClick={() => setViewSupplier(null)}
              className="mt-7 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
