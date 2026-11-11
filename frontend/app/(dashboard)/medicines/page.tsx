"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Edit,
  Eye,
  Filter,
  Pill,
  Plus,
  Search,
  Trash2,
  X,
  CheckCircle2,
  ImagePlus,
} from "lucide-react";

type MedicineStatus = "Active" | "Inactive";

type Medicine = {
  id: number;
  categoryId: number;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  strength: string;
  price: number;
  reorderLevel: number;
  status: MedicineStatus;
  imageUrl: string | null;
};

type Category = {
  id: number;
  name: string;
  status: MedicineStatus;
};

type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: MedicineStatus;
};

type MedicineForm = {
  name: string;
  genericName: string;
  categoryId: string;
  manufacturer: string;
  strength: string;
  price: string;
  reorderLevel: string;
  status: "ACTIVE" | "INACTIVE";
  imageUrl: string;
};

type SupplierForm = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
};

type StockForm = {
  batchNo: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: string;
  purchaseRate: string;
};

type SuccessDetails = {
  medicine: {
    id: number;
    name: string;
    genericName: string;
    manufacturer: string;
    strength: string;
  };
  supplier: {
    id: number;
    name: string;
  };
  purchase: {
    id: number;
    date: string;
    invoice: string;
    paymentMode: string;
  };
  stock: {
    id: number;
    batchNo: string;
    inventoryBatchCode: string;
    manufactureDate: string | null;
    expiryDate: string;
    quantity: number;
    purchaseRate: number;
    totalAmount: number;
  };
};

const emptyForm: MedicineForm = {
  name: "",
  genericName: "",
  categoryId: "",
  manufacturer: "",
  strength: "",
  price: "",
  reorderLevel: "20",
  status: "ACTIVE",
  imageUrl: "",
};

const emptySupplierForm: SupplierForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
};

const emptyStockForm: StockForm = {
  batchNo: "",
  manufactureDate: "",
  expiryDate: "",
  quantity: "",
  purchaseRate: "",
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Medicine | null>(null);
  const [form, setForm] = useState<MedicineForm>(emptyForm);

  const [supplierMode, setSupplierMode] = useState<"EXISTING" | "NEW">(
    "EXISTING"
  );
  const [supplierId, setSupplierId] = useState("");
  const [supplierForm, setSupplierForm] =
    useState<SupplierForm>(emptySupplierForm);

  const [stockForm, setStockForm] = useState<StockForm>(emptyStockForm);
  const [purchaseDate, setPurchaseDate] = useState(getTodayDate());
  const [invoice, setInvoice] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [successDetails, setSuccessDetails] =
    useState<SuccessDetails | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/medicines", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load medicines.");
      }

      setMedicines(result.medicines || []);
      setCategories(result.categories || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the database."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      setSupplierLoading(true);

      const response = await fetch("/api/suppliers", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load suppliers.");
      }

      const activeSuppliers: Supplier[] = (result.suppliers || []).filter(
        (supplier: Supplier) => supplier.status === "Active"
      );

      setSuppliers(activeSuppliers);

      if (activeSuppliers.length > 0) {
        setSupplierId(activeSuppliers[0].id);
        setSupplierMode("EXISTING");
      } else {
        setSupplierId("");
        setSupplierMode("NEW");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load suppliers."
      );
    } finally {
      setSupplierLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter((medicine) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        medicine.name.toLowerCase().includes(searchValue) ||
        medicine.genericName.toLowerCase().includes(searchValue) ||
        medicine.manufacturer.toLowerCase().includes(searchValue);

      const matchesCategory =
        category === "All" || medicine.category === category;

      const matchesStatus =
        status === "All" || medicine.status === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [medicines, search, category, status]);

  const activeCount = medicines.filter(
    (medicine) => medicine.status === "Active"
  ).length;

  const inactiveCount = medicines.filter(
    (medicine) => medicine.status === "Inactive"
  ).length;

  const openAddModal = () => {
    const firstActiveCategory = categories.find(
      (item) => item.status === "Active"
    );

    setEditingId(null);
    setForm({
      ...emptyForm,
      categoryId: firstActiveCategory
        ? String(firstActiveCategory.id)
        : "",
    });

    setSupplierForm(emptySupplierForm);
    setStockForm(emptyStockForm);
    setPurchaseDate(getTodayDate());
    setInvoice("");
    setPaymentMode("CASH");
    setNotes("");
    setSupplierId("");
    setSupplierMode("EXISTING");

    setError("");
    setSuccess("");
    setSuccessDetails(null);
    setModalOpen(true);

    loadSuppliers();
  };

  const openEditModal = (medicine: Medicine) => {
    setEditingId(medicine.id);

    setForm({
      name: medicine.name,
      genericName: medicine.genericName,
      categoryId: String(medicine.categoryId),
      manufacturer: medicine.manufacturer,
      strength: medicine.strength,
      price: String(medicine.price),
      reorderLevel: String(medicine.reorderLevel),
      status: medicine.status === "Active" ? "ACTIVE" : "INACTIVE",
      imageUrl: "",
    });

    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setSupplierForm(emptySupplierForm);
    setStockForm(emptyStockForm);
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.categoryId) {
      setError("Please select a medicine category.");
      return;
    }

    const price = Number(form.price);
    const reorderLevel = Number(form.reorderLevel);
    const categoryId = Number(form.categoryId);

    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid selling price.");
      return;
    }

    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
      setError("Reorder level must be a non-negative whole number.");
      return;
    }

    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
      setError("Please select a valid category.");
      return;
    }

    const medicineData = {
      name: form.name.trim(),
      genericName: form.genericName.trim() || null,
      categoryId,
      manufacturer: form.manufacturer.trim() || null,
      strength: form.strength.trim() || null,
      price,
      reorderLevel,
      status: form.status,
    };

    if (!medicineData.name) {
      setError("Medicine name is required.");
      return;
    }

    const imageUrl = form.imageUrl.trim();

    if (imageUrl) {
      try {
        const parsedImageUrl = new URL(imageUrl);

        if (parsedImageUrl.protocol !== "https:") {
          setError("Medicine image URL must use HTTPS.");
          return;
        }
      } catch {
        setError("Please enter a valid medicine image URL.");
        return;
      }
    }

    let requestBody: Record<string, unknown>;

    if (editingId !== null) {
      requestBody = medicineData;
    } else {
      if (supplierMode === "EXISTING" && !supplierId) {
        setError("Please select an existing supplier.");
        return;
      }

      if (supplierMode === "NEW") {
        if (
          !supplierForm.name.trim() ||
          !supplierForm.contactPerson.trim() ||
          !supplierForm.phone.trim() ||
          !supplierForm.email.trim() ||
          !supplierForm.address.trim()
        ) {
          setError("Please complete all new supplier details.");
          return;
        }

        if (!/^[0-9]{10}$/.test(supplierForm.phone.trim())) {
          setError("Supplier phone number must contain exactly 10 digits.");
          return;
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierForm.email.trim())
        ) {
          setError("Please enter a valid supplier email address.");
          return;
        }
      }

      const quantity = Number(stockForm.quantity);
      const purchaseRate = Number(stockForm.purchaseRate);

      if (!stockForm.batchNo.trim()) {
        setError("Manufacturer batch number is required.");
        return;
      }

      if (!stockForm.expiryDate) {
        setError("Please select the expiry date.");
        return;
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        setError("Stock quantity must be a positive whole number.");
        return;
      }

      if (!Number.isFinite(purchaseRate) || purchaseRate < 0) {
        setError("Enter a valid purchase rate.");
        return;
      }

      if (!purchaseDate) {
        setError("Please select the purchase date.");
        return;
      }

      if (stockForm.expiryDate < purchaseDate) {
        setError("Expiry date cannot be earlier than the purchase date.");
        return;
      }

      if (
        stockForm.manufactureDate &&
        stockForm.manufactureDate > stockForm.expiryDate
      ) {
        setError("Manufacture date cannot be later than expiry date.");
        return;
      }

      requestBody = {
        medicine: medicineData,
        ...(supplierMode === "EXISTING"
          ? { supplierId: Number(supplierId) }
          : {
              newSupplier: {
                name: supplierForm.name.trim(),
                contactPerson: supplierForm.contactPerson.trim(),
                phone: supplierForm.phone.trim(),
                email: supplierForm.email.trim(),
                address: supplierForm.address.trim(),
              },
            }),
        purchaseDate,
        invoice: invoice.trim() || null,
        paymentMode,
        notes: notes.trim() || null,
        stock: {
          batchNo: stockForm.batchNo.trim(),
          manufactureDate: stockForm.manufactureDate || null,
          expiryDate: stockForm.expiryDate,
          quantity,
          purchaseRate,
        },
      };
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        editingId !== null
          ? `/api/medicines/${editingId}`
          : "/api/medicines",
        {
          method: editingId !== null ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save medicine.");
      }

      const savedMedicineId =
        editingId !== null ? editingId : result.medicine?.id;

      if (!savedMedicineId) {
        throw new Error(
          "Medicine was saved, but its ID could not be retrieved."
        );
      }

      let imageUploadWarning = "";

      // Upload the image to MongoDB GridFS after the medicine is saved.
      // An image upload failure does not undo the successful MySQL save.
      if (imageUrl) {
        try {
          const imageResponse = await fetch(
            `/api/medicines/${savedMedicineId}/images`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: imageUrl,
                altText: `${form.name.trim()} medicine image`,
              }),
            }
          );

          const imageResult = await imageResponse.json();

          if (!imageResponse.ok) {
            imageUploadWarning =
              imageResult.message ||
              "The medicine was saved, but its image could not be uploaded.";
          }
        } catch {
          imageUploadWarning =
            "The medicine was saved, but the image upload failed.";
        }
      }

      if (editingId === null) {
        setModalOpen(false);
        setEditingId(null);
        setForm(emptyForm);

        setSuccessDetails(result);
        await loadData();

        if (imageUploadWarning) {
          setSuccess(imageUploadWarning);
        }
      } else {
        setModalOpen(false);
        setEditingId(null);
        setForm(emptyForm);

        setSuccess(
          imageUploadWarning ||
            result.message ||
            "Medicine updated successfully."
        );

        await loadData();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save medicine."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteMedicine = async (medicine: Medicine) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${medicine.name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(`/api/medicines/${medicine.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete medicine.");
      }

      setSuccess(result.message || "Medicine deleted successfully.");

      if (selected?.id === medicine.id) {
        setSelected(null);
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete medicine."
      );
    }
  };

  const closeSuccessPopup = () => {
    setSuccessDetails(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-5 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <ArrowLeft size={14} />
              Dashboard / Medicines
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Medicine Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your medicine catalogue and product information.
            </p>
          </div>

          <button
            onClick={openAddModal}
            disabled={
              loading ||
              categories.filter((item) => item.status === "Active").length === 0
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            Add Medicine
          </button>
        </div>

        {error && !modalOpen && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {categories.filter((item) => item.status === "Active").length === 0 &&
          !loading && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              There are no active medicine categories. Add or activate a
              category before creating a medicine.
            </div>
          )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Medicines",
              value: medicines.length,
              color: "blue",
            },
            {
              label: "Active Medicines",
              value: activeCount,
              color: "green",
            },
            {
              label: "Inactive Medicines",
              value: inactiveCount,
              color: "orange",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{item.label}</p>

              <h2
                className={`mt-2 text-3xl font-bold ${
                  item.color === "blue"
                    ? "text-blue-600"
                    : item.color === "green"
                      ? "text-emerald-600"
                      : "text-orange-600"
                }`}
              >
                {loading ? "—" : item.value}
              </h2>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-bold text-slate-800">
                Medicine Catalogue
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Showing {filteredMedicines.length} of {medicines.length} medicines
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search medicine..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-400 sm:w-52"
                />
              </div>

              <div className="relative">
                <Filter
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs outline-none focus:border-blue-400 sm:w-44"
                >
                  <option value="All">All Categories</option>

                  {categories.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                      {item.status === "Inactive" ? " (Inactive)" : ""}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-blue-400"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">Medicine</th>
                  <th className="px-4 py-4 font-semibold">Category</th>
                  <th className="px-4 py-4 font-semibold">Manufacturer</th>
                  <th className="px-4 py-4 font-semibold">Strength</th>
                  <th className="px-4 py-4 font-semibold">Selling Price</th>
                  <th className="px-4 py-4 font-semibold">Reorder Level</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-sm text-slate-400"
                    >
                      Loading medicines from the database...
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredMedicines.map((medicine) => (
                      <tr
                        key={medicine.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50 text-blue-600">
                              {medicine.imageUrl ? (
                                <img
                                  src={medicine.imageUrl}
                                  alt={medicine.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Pill size={19} />
                              )}
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-slate-800">
                                {medicine.name}
                              </p>

                              <p className="mt-1 text-[10px] text-slate-400">
                                {medicine.genericName || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {medicine.category}
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {medicine.manufacturer || "—"}
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {medicine.strength || "—"}
                        </td>

                        <td className="px-4 py-4 text-xs font-semibold text-slate-800">
                          ₹{medicine.price.toFixed(2)}
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          {medicine.reorderLevel} units
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              medicine.status === "Active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {medicine.status}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelected(medicine)}
                              title="View"
                              className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              onClick={() => openEditModal(medicine)}
                              title="Edit"
                              className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                            >
                              <Edit size={16} />
                            </button>

                            <button
                              onClick={() => deleteMedicine(medicine)}
                              title="Delete"
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredMedicines.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-12 text-center text-sm text-slate-400"
                        >
                          No medicines match your search.
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-400">
            Displaying {filteredMedicines.length} medicine records
          </div>
        </div>
      </div>

      {/* Add / Edit Medicine Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  {editingId !== null ? "Edit Medicine" : "Add New Medicine"}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {editingId !== null
                    ? "Update the medicine information."
                    : "Enter medicine, supplier and initial stock information."}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[72vh] space-y-6 overflow-y-auto p-5">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Medicine Details */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Pill size={17} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Medicine Details
                      </h3>
                      <p className="text-xs text-slate-400">
                        Basic information about the medicine.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      {
                        label: "Medicine Name",
                        key: "name",
                        placeholder: "Enter medicine name",
                        required: true,
                      },
                      {
                        label: "Generic Name",
                        key: "genericName",
                        placeholder: "Enter generic name",
                      },
                      {
                        label: "Manufacturer",
                        key: "manufacturer",
                        placeholder: "Enter manufacturer",
                      },
                      {
                        label: "Strength",
                        key: "strength",
                        placeholder: "e.g. 500mg",
                      },
                      {
                        label: "Selling Price (₹)",
                        key: "price",
                        placeholder: "Enter selling price",
                        type: "number",
                        required: true,
                      },
                      {
                        label: "Reorder Level",
                        key: "reorderLevel",
                        placeholder: "Enter reorder level",
                        type: "number",
                        required: true,
                      },
                    ].map((field) => (
                      <label key={field.key} className="block">
                        <span className="mb-2 block text-xs font-semibold text-slate-600">
                          {field.label}
                        </span>

                        <input
                          required={field.required}
                          min={field.type === "number" ? "0" : undefined}
                          step={field.key === "price" ? "0.01" : "1"}
                          type={field.type || "text"}
                          value={form[field.key as keyof MedicineForm] as string}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              [field.key]: event.target.value,
                            })
                          }
                          placeholder={field.placeholder}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        />
                      </label>
                    ))}

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-slate-600">
                        Category
                      </span>

                      <select
                        required
                        value={form.categoryId}
                        onChange={(event) =>
                          setForm({ ...form, categoryId: event.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                      >
                        <option value="">Select Category</option>

                        {categories.map((item) => (
                          <option
                            key={item.id}
                            value={item.id}
                            disabled={item.status === "Inactive"}
                          >
                            {item.name}
                            {item.status === "Inactive" ? " (Inactive)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-slate-600">
                        Status
                      </span>

                      <select
                        value={form.status}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            status: event.target.value as
                              | "ACTIVE"
                              | "INACTIVE",
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </label>

                    {/* Medicine Image URL */}
                    <div className="sm:col-span-2">
                      <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <ImagePlus size={15} />
                          Medicine Image URL
                        </span>

                        <input
                          type="url"
                          value={form.imageUrl}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              imageUrl: event.target.value,
                            })
                          }
                          placeholder="https://example.com/medicine-image.jpg"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        />

                        <p className="mt-1 text-xs text-slate-400">
                          Enter an HTTPS image URL. The image will be stored
                          in MongoDB GridFS after saving the medicine.
                        </p>
                      </label>

                      {form.imageUrl.trim() && (
                        <div className="mt-3 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                            <img
                              src={form.imageUrl}
                              alt="Medicine image preview"
                              className="h-full w-full object-contain"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              Image Preview
                            </p>
                            <p className="mt-1 break-all text-xs text-slate-400">
                              {form.imageUrl}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Supplier Details - Add Mode Only */}
                {editingId === null && (
                  <>
                    <div className="border-t border-slate-100" />

                    <section>
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-800">
                          Supplier Details
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Choose an existing supplier or add a new supplier.
                        </p>
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => setSupplierMode("EXISTING")}
                          className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                            supplierMode === "EXISTING"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Existing Supplier
                        </button>

                        <button
                          type="button"
                          onClick={() => setSupplierMode("NEW")}
                          className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                            supplierMode === "NEW"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Add New Supplier
                        </button>
                      </div>

                      {supplierMode === "EXISTING" ? (
                        <div>
                          <label className="mb-2 block text-xs font-semibold text-slate-600">
                            Select Supplier
                          </label>

                          <select
                            value={supplierId}
                            onChange={(event) =>
                              setSupplierId(event.target.value)
                            }
                            disabled={supplierLoading || suppliers.length === 0}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50"
                          >
                            <option value="">
                              {supplierLoading
                                ? "Loading suppliers..."
                                : suppliers.length === 0
                                  ? "No active suppliers available"
                                  : "Select Supplier"}
                            </option>

                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name} — {supplier.contactPerson}
                              </option>
                            ))}
                          </select>

                          {suppliers.length === 0 && !supplierLoading && (
                            <p className="mt-2 text-xs text-amber-600">
                              No active suppliers found. Select Add New Supplier
                              to create one.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {[
                            {
                              label: "Supplier Name",
                              key: "name",
                              placeholder: "Enter supplier name",
                            },
                            {
                              label: "Contact Person",
                              key: "contactPerson",
                              placeholder: "Enter contact person",
                            },
                            {
                              label: "Phone Number",
                              key: "phone",
                              placeholder: "10-digit phone number",
                            },
                            {
                              label: "Email Address",
                              key: "email",
                              placeholder: "Enter email address",
                              type: "email",
                            },
                          ].map((field) => (
                            <label key={field.key} className="block">
                              <span className="mb-2 block text-xs font-semibold text-slate-600">
                                {field.label}
                              </span>

                              <input
                                required
                                type={field.type || "text"}
                                maxLength={field.key === "phone" ? 10 : undefined}
                                value={
                                  supplierForm[
                                    field.key as keyof SupplierForm
                                  ]
                                }
                                onChange={(event) =>
                                  setSupplierForm({
                                    ...supplierForm,
                                    [field.key]: event.target.value,
                                  })
                                }
                                placeholder={field.placeholder}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                              />
                            </label>
                          ))}

                          <label className="block sm:col-span-2">
                            <span className="mb-2 block text-xs font-semibold text-slate-600">
                              Supplier Address
                            </span>

                            <textarea
                              required
                              rows={2}
                              value={supplierForm.address}
                              onChange={(event) =>
                                setSupplierForm({
                                  ...supplierForm,
                                  address: event.target.value,
                                })
                              }
                              placeholder="Enter supplier address"
                              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                            />
                          </label>
                        </div>
                      )}
                    </section>

                    <div className="border-t border-slate-100" />

                    {/* Stock Details */}
                    <section>
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-800">
                          Initial Stock Details
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Enter the batch and quantity received from the supplier.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Manufacturer Batch Number
                          </span>

                          <input
                            required
                            value={stockForm.batchNo}
                            onChange={(event) =>
                              setStockForm({
                                ...stockForm,
                                batchNo: event.target.value,
                              })
                            }
                            placeholder="Enter batch number"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Quantity Received
                          </span>

                          <input
                            required
                            type="number"
                            min="1"
                            step="1"
                            value={stockForm.quantity}
                            onChange={(event) =>
                              setStockForm({
                                ...stockForm,
                                quantity: event.target.value,
                              })
                            }
                            placeholder="Enter quantity"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Manufacture Date
                          </span>

                          <input
                            type="date"
                            value={stockForm.manufactureDate}
                            max={stockForm.expiryDate || undefined}
                            onChange={(event) =>
                              setStockForm({
                                ...stockForm,
                                manufactureDate: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Expiry Date
                          </span>

                          <input
                            required
                            type="date"
                            min={purchaseDate || undefined}
                            value={stockForm.expiryDate}
                            onChange={(event) =>
                              setStockForm({
                                ...stockForm,
                                expiryDate: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Purchase Rate per Unit (₹)
                          </span>

                          <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            value={stockForm.purchaseRate}
                            onChange={(event) =>
                              setStockForm({
                                ...stockForm,
                                purchaseRate: event.target.value,
                              })
                            }
                            placeholder="Enter purchase rate"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          />
                        </label>
                      </div>
                    </section>

                    <div className="border-t border-slate-100" />

                    {/* Purchase Details */}
                    <section>
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-slate-800">
                          Purchase Details
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Record the purchase transaction for this stock.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Purchase Date
                          </span>

                          <input
                            required
                            type="date"
                            value={purchaseDate}
                            onChange={(event) =>
                              setPurchaseDate(event.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Invoice Number
                          </span>

                          <input
                            value={invoice}
                            onChange={(event) => setInvoice(event.target.value)}
                            placeholder="Enter invoice number (optional)"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Payment Mode
                          </span>

                          <select
                            required
                            value={paymentMode}
                            onChange={(event) =>
                              setPaymentMode(event.target.value)
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          >
                            <option value="CASH">Cash</option>
                            <option value="CARD">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="BANK">Bank Transfer</option>
                            <option value="CREDIT">Credit</option>
                          </select>
                        </label>

                        <label className="block sm:col-span-2">
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            Purchase Notes
                          </span>

                          <textarea
                            rows={2}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Additional purchase notes (optional)"
                            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          />
                        </label>
                      </div>
                    </section>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || supplierLoading}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Add Medicine & Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medicine Added Successfully Popup */}
      {successDetails && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={36} />
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                Medicine Added Successfully!
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Medicine, supplier, purchase and stock details have been saved.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Medicine Information
                </p>

                <h3 className="text-base font-bold text-slate-900">
                  {successDetails.medicine.name}
                </h3>

                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p>
                    Medicine ID:{" "}
                    <strong>{successDetails.medicine.id}</strong>
                  </p>
                  <p>
                    Generic Name:{" "}
                    <strong>
                      {successDetails.medicine.genericName || "—"}
                    </strong>
                  </p>
                  <p>
                    Manufacturer:{" "}
                    <strong>
                      {successDetails.medicine.manufacturer || "—"}
                    </strong>
                  </p>
                  <p>
                    Strength:{" "}
                    <strong>{successDetails.medicine.strength || "—"}</strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Supplier
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {successDetails.supplier.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Supplier ID: {successDetails.supplier.id}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Stock Batch
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {successDetails.stock.batchNo}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Inventory Code:{" "}
                    {successDetails.stock.inventoryBatchCode}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Stock Information
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400">Quantity Added</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {successDetails.stock.quantity} units
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Purchase Rate</p>
                    <p className="mt-1 font-bold text-slate-800">
                      ₹{Number(successDetails.stock.purchaseRate).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Manufacture Date</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {successDetails.stock.manufactureDate || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Expiry Date</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {successDetails.stock.expiryDate}
                    </p>
                  </div>

                  <div className="col-span-2 border-t border-slate-100 pt-3">
                    <p className="text-slate-400">Total Purchase Amount</p>
                    <p className="mt-1 text-lg font-bold text-emerald-600">
                      ₹{Number(successDetails.stock.totalAmount).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Purchase Record
                </p>

                <div className="space-y-1 text-xs text-slate-600">
                  <p>
                    Purchase ID:{" "}
                    <strong>{successDetails.purchase.id}</strong>
                  </p>
                  <p>
                    Purchase Date:{" "}
                    <strong>{successDetails.purchase.date}</strong>
                  </p>
                  <p>
                    Invoice Number:{" "}
                    <strong>{successDetails.purchase.invoice || "—"}</strong>
                  </p>
                  <p>
                    Payment Mode:{" "}
                    <strong>{successDetails.purchase.paymentMode}</strong>
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={closeSuccessPopup}
              className="mt-5 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* View Medicine Modal */}
      {selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">
                Medicine Details
              </h2>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-3 rounded-xl bg-blue-50 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-blue-600">
                {selected.imageUrl ? (
                  <img
                    src={selected.imageUrl}
                    alt={selected.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Pill size={24} />
                )}
              </div>

              <div>
                <h3 className="font-bold text-slate-800">
                  {selected.name}
                </h3>

                <p className="text-xs text-slate-500">
                  {selected.genericName || "No generic name"}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {[
                ["Category", selected.category],
                ["Manufacturer", selected.manufacturer || "—"],
                ["Strength", selected.strength || "—"],
                ["Selling Price", `₹${selected.price.toFixed(2)}`],
                ["Reorder Level", `${selected.reorderLevel} units`],
                ["Status", selected.status],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-slate-100 pb-3"
                >
                  <span className="text-slate-500">{label}</span>
                  <strong className="text-slate-800">{value}</strong>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelected(null)}
              className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
