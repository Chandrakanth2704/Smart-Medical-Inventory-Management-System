"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  ShoppingCart,
  IndianRupee,
  ClipboardList,
  Package,
  Eye,
  X,
  Filter,
  RefreshCw,
} from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  status: "Active" | "Inactive";
};

type Medicine = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
};

type PurchaseItem = {
  stockId: string;
  medicineId: string;
  medicine: string;
  batchNo: string;
  inventoryBatchCode?: string;
  manufactureDate: string | null;
  expiryDate: string;
  quantity: number;
  purchaseRate: number;
  discount: number;
  total: number;
};

type Purchase = {
  id: string;
  invoice: string;
  date: string;
  supplier: string;
  createdBy: string;
  paymentMode: string;
  notes: string;
  itemCount: number;
  quantity: number;
  amount: number;
  items: PurchaseItem[];
};

type PurchaseFormItem = {
  medicineId: string;
  batchNo: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  purchaseRate: number;
  discount: number;
};

type NewSupplier = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
};

const emptyItem: PurchaseFormItem = {
  medicineId: "",
  batchNo: "",
  manufactureDate: "",
  expiryDate: "",
  quantity: 1,
  purchaseRate: 0,
  discount: 0,
};

const emptySupplier: NewSupplier = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
};

function getTodayDate() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-IN"
  );
}

function paymentLabel(value: string) {
  const labels: Record<string, string> = {
    CASH: "Cash",
    CARD: "Card",
    UPI: "UPI",
    BANK: "Bank Transfer",
    CREDIT: "Credit",
  };

  return labels[value] ?? value;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] =
    useState<Purchase | null>(null);

  const [supplierMode, setSupplierMode] = useState<"existing" | "new">(
    "existing"
  );
  const [supplierId, setSupplierId] = useState("");
  const [newSupplier, setNewSupplier] =
    useState<NewSupplier>({ ...emptySupplier });

  const [purchaseDate, setPurchaseDate] = useState(getTodayDate());
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [invoice, setInvoice] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseFormItem[]>([
    { ...emptyItem },
  ]);
  const [formMessage, setFormMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const [purchaseResponse, supplierResponse, medicineResponse] =
        await Promise.all([
          fetch("/api/purchases", { cache: "no-store" }),
          fetch("/api/suppliers", { cache: "no-store" }),
          fetch("/api/medicines", { cache: "no-store" }),
        ]);

      const [purchaseData, supplierData, medicineData] = await Promise.all([
        purchaseResponse.json(),
        supplierResponse.json(),
        medicineResponse.json(),
      ]);

      if (!purchaseResponse.ok) {
        throw new Error(
          purchaseData.message || "Unable to load purchases."
        );
      }

      if (!supplierResponse.ok) {
        throw new Error(
          supplierData.message || "Unable to load suppliers."
        );
      }

      if (!medicineResponse.ok) {
        throw new Error(
          medicineData.message || "Unable to load medicines."
        );
      }

      setPurchases(purchaseData.purchases ?? []);
      setSuppliers(supplierData.suppliers ?? []);
      setMedicines(medicineData.medicines ?? []);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load purchase information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.status === "Active"),
    [suppliers]
  );

  const activeMedicines = useMemo(
    () => medicines.filter((medicine) => medicine.status === "Active"),
    [medicines]
  );

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();

    return purchases.filter((purchase) => {
      const matchesSearch =
        purchase.invoice.toLowerCase().includes(query) ||
        purchase.supplier.toLowerCase().includes(query) ||
        purchase.items.some((item) =>
          item.medicine.toLowerCase().includes(query)
        );

      const matchesPayment =
        paymentFilter === "All" ||
        purchase.paymentMode === paymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [purchases, search, paymentFilter]);

  const totalPurchases = purchases.length;

  const totalQuantity = purchases.reduce(
    (sum, purchase) => sum + purchase.quantity,
    0
  );

  const totalAmount = purchases.reduce(
    (sum, purchase) => sum + purchase.amount,
    0
  );

  const totalItems = purchases.reduce(
    (sum, purchase) => sum + purchase.itemCount,
    0
  );

  const purchaseTotal = items.reduce(
    (sum, item) =>
      sum +
      item.quantity * item.purchaseRate -
      item.discount,
    0
  );

  function resetForm() {
    setSupplierMode("existing");
    setSupplierId("");
    setNewSupplier({ ...emptySupplier });
    setPurchaseDate(getTodayDate());
    setPaymentMode("UPI");
    setInvoice("");
    setNotes("");
    setItems([{ ...emptyItem }]);
    setFormMessage("");
  }

  function updateSupplier(
    field: keyof NewSupplier,
    value: string
  ) {
    setNewSupplier((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateItem(
    index: number,
    field: keyof PurchaseFormItem,
    value: string | number
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  function addItem() {
    setItems((current) => [...current, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  async function savePurchase() {
    setFormMessage("");

    if (supplierMode === "existing" && !supplierId) {
      setFormMessage("Please select a supplier.");
      return;
    }

    if (supplierMode === "new" && !newSupplier.name.trim()) {
      setFormMessage("Please enter the supplier name.");
      return;
    }

    if (
      supplierMode === "new" &&
      newSupplier.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newSupplier.email.trim())
    ) {
      setFormMessage("Please enter a valid supplier email address.");
      return;
    }

    if (!purchaseDate) {
      setFormMessage("Please select a purchase date.");
      return;
    }

    if (items.length === 0) {
      setFormMessage("Add at least one medicine item.");
      return;
    }

    for (const item of items) {
      if (
        !item.medicineId ||
        !item.batchNo.trim() ||
        !item.expiryDate ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.purchaseRate) ||
        item.purchaseRate < 0 ||
        !Number.isFinite(item.discount) ||
        item.discount < 0
      ) {
        setFormMessage(
          "Complete every item with valid medicine, batch, expiry, quantity and rate."
        );
        return;
      }

      if (item.expiryDate < purchaseDate) {
        setFormMessage(
          "A batch expiry date cannot be earlier than the purchase date."
        );
        return;
      }

      if (
        item.manufactureDate &&
        item.manufactureDate > item.expiryDate
      ) {
        setFormMessage(
          "Manufacture date cannot be later than the expiry date."
        );
        return;
      }

      if (
        item.discount >
        item.quantity * item.purchaseRate
      ) {
        setFormMessage(
          "An item's discount cannot exceed its total value."
        );
        return;
      }
    }

    setSaving(true);

    try {
      const payload = {
        ...(supplierMode === "existing"
          ? { supplierId: Number(supplierId) }
          : {
              newSupplier: {
                name: newSupplier.name.trim(),
                contactPerson:
                  newSupplier.contactPerson.trim() || null,
                phone: newSupplier.phone.trim() || null,
                email: newSupplier.email.trim() || null,
                address: newSupplier.address.trim() || null,
              },
            }),
        invoice: invoice.trim() || null,
        purchaseDate,
        paymentMode,
        notes: notes.trim() || null,
        items: items.map((item) => ({
          medicineId: Number(item.medicineId),
          batchNo: item.batchNo.trim(),
          manufactureDate: item.manufactureDate || null,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          purchaseRate: item.purchaseRate,
          discount: item.discount,
        })),
      };

      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save purchase.");
      }

      setModalOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : "Unable to save purchase."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">
            Dashboard / Purchases
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Purchase Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Record medicine purchases and update inventory batches.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            disabled={activeMedicines.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            New Purchase
          </button>
        </div>
      </div>

      {pageError && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-red-700">{pageError}</p>
          <button
            onClick={loadData}
            className="text-sm font-semibold text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Purchases",
            value: totalPurchases.toLocaleString("en-IN"),
            icon: ShoppingCart,
            style: "bg-blue-50 text-blue-600",
          },
          {
            label: "Purchase Items",
            value: totalItems.toLocaleString("en-IN"),
            icon: ClipboardList,
            style: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Units Purchased",
            value: totalQuantity.toLocaleString("en-IN"),
            icon: Package,
            style: "bg-orange-50 text-orange-600",
          },
          {
            label: "Total Purchase Value",
            value: formatCurrency(totalAmount),
            icon: IndianRupee,
            style: "bg-violet-50 text-violet-600",
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.style}`}
              >
                <Icon size={21} />
              </div>
              <p className="mt-5 text-sm text-slate-500">
                {card.label}
              </p>
              <h2 className="mt-1 break-words text-2xl font-bold text-slate-900">
                {card.value}
              </h2>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-bold text-slate-800">
              Purchase Register
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Showing {filteredPurchases.length} of {purchases.length} purchases
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoice, supplier or medicine..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 sm:w-72"
              />
            </div>

            <div className="relative">
              <Filter
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(event.target.value)
                }
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-blue-400 sm:w-44"
              >
                <option value="All">All Payments</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Invoice</th>
                <th className="px-4 py-4">Supplier</th>
                <th className="px-4 py-4">Purchase Date</th>
                <th className="px-4 py-4">Items</th>
                <th className="px-4 py-4">Quantity</th>
                <th className="px-4 py-4">Amount</th>
                <th className="px-4 py-4">Payment</th>
                <th className="px-4 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    Loading purchase records...
                  </td>
                </tr>
              ) : filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => (
                  <tr
                    key={purchase.id}
                    className="hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {purchase.invoice || `Purchase #${purchase.id}`}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {purchase.supplier}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDate(purchase.date)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {purchase.itemCount}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {purchase.quantity}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                      {formatCurrency(purchase.amount)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {paymentLabel(purchase.paymentMode)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelectedPurchase(purchase)}
                        title="View purchase"
                        className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-14 text-center"
                  >
                    <ShoppingCart
                      size={32}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      {purchases.length === 0
                        ? "No purchases recorded yet."
                        : "No matching purchases found."}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {purchases.length === 0
                        ? "Recorded purchases will appear here."
                        : "Try changing your search or payment filter."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {!loading && activeMedicines.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            No active medicines available
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Add an active medicine before recording a purchase.
          </p>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Create New Purchase
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Enter supplier, invoice and medicine batch details.
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

            <div className="mt-5">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSupplierMode("existing");
                    setFormMessage("");
                  }}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${
                    supplierMode === "existing"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Existing Supplier
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSupplierMode("new");
                    setSupplierId("");
                    setFormMessage("");
                  }}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${
                    supplierMode === "new"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Plus size={15} className="mr-1 inline" />
                  Add New Supplier
                </button>
              </div>

              {supplierMode === "existing" ? (
                <label className="mt-4 block">
                  <span className="text-sm font-medium text-slate-700">
                    Select Supplier
                  </span>
                  <select
                    value={supplierId}
                    onChange={(event) => setSupplierId(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="">Select supplier</option>
                    {activeSuppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {activeSuppliers.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No existing active suppliers. Choose Add New Supplier.
                    </p>
                  )}
                </label>
              ) : (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    New Supplier Details
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    The supplier will be registered automatically when you save this purchase.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        Supplier Name *
                      </span>
                      <input
                        value={newSupplier.name}
                        onChange={(event) =>
                          updateSupplier("name", event.target.value)
                        }
                        maxLength={150}
                        placeholder="Enter supplier name"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        Contact Person
                      </span>
                      <input
                        value={newSupplier.contactPerson}
                        onChange={(event) =>
                          updateSupplier("contactPerson", event.target.value)
                        }
                        maxLength={100}
                        placeholder="Enter contact person"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        Phone
                      </span>
                      <input
                        value={newSupplier.phone}
                        onChange={(event) =>
                          updateSupplier("phone", event.target.value)
                        }
                        maxLength={20}
                        placeholder="Enter phone number"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        Email
                      </span>
                      <input
                        type="email"
                        value={newSupplier.email}
                        onChange={(event) =>
                          updateSupplier("email", event.target.value)
                        }
                        maxLength={150}
                        placeholder="Enter email address"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="text-sm font-medium text-slate-700">
                        Address
                      </span>
                      <textarea
                        value={newSupplier.address}
                        onChange={(event) =>
                          updateSupplier("address", event.target.value)
                        }
                        rows={2}
                        placeholder="Enter supplier address"
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Invoice Number
                </span>
                <input
                  value={invoice}
                  onChange={(event) => setInvoice(event.target.value)}
                  maxLength={100}
                  placeholder="Enter supplier invoice number"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Purchase Date
                </span>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(event) => setPurchaseDate(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Payment Mode
                </span>
                <select
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Notes
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  maxLength={5000}
                  placeholder="Optional purchase notes"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />
              </label>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">
                Medicine Items
              </h3>
              <button
                onClick={addItem}
                className="flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
              >
                <Plus size={15} />
                Add Item
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      Item {index + 1}
                    </p>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-slate-600">
                        Medicine
                      </span>
                      <select
                        value={item.medicineId}
                        onChange={(event) =>
                          updateItem(index, "medicineId", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="">Select medicine</option>
                        {activeMedicines.map((medicine) => (
                          <option key={medicine.id} value={medicine.id}>
                            {medicine.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">
                        Manufacturer Batch Number
                      </span>
                      <input
                        value={item.batchNo}
                        onChange={(event) =>
                          updateItem(index, "batchNo", event.target.value)
                        }
                        maxLength={80}
                        placeholder="Enter manufacturer's batch number"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">
                        Manufacture Date
                      </span>
                      <input
                        type="date"
                        value={item.manufactureDate}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "manufactureDate",
                            event.target.value
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">
                        Expiry Date
                      </span>
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(event) =>
                          updateItem(index, "expiryDate", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">
                        Quantity
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "quantity",
                            Number(event.target.value)
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">
                        Purchase Rate (₹)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.purchaseRate}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "purchaseRate",
                            Number(event.target.value)
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">
                        Discount (₹)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "discount",
                            Number(event.target.value)
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                      />
                    </label>
                  </div>

                  <p className="mt-3 text-right text-sm font-semibold text-slate-700">
                    Item Total:{" "}
                    {formatCurrency(
                      item.quantity * item.purchaseRate - item.discount
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-between rounded-xl bg-blue-50 p-4">
              <span className="font-semibold text-slate-700">
                Purchase Total
              </span>
              <span className="text-xl font-bold text-blue-700">
                {formatCurrency(purchaseTotal)}
              </span>
            </div>

            {formMessage && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {formMessage}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={savePurchase}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <RefreshCw size={15} className="animate-spin" />
                )}
                {saving ? "Saving..." : "Save Purchase"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPurchase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Purchase Details
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedPurchase.invoice || `Purchase #${selectedPurchase.id}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Supplier</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedPurchase.supplier}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Purchase Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(selectedPurchase.date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Payment Mode</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {paymentLabel(selectedPurchase.paymentMode)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Recorded By</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedPurchase.createdBy}
                </p>
              </div>
            </div>

            <h3 className="mt-6 font-bold text-slate-800">
              Purchased Items
            </h3>

            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[750px] text-left">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Medicine / Batch</th>
                    <th className="px-4 py-3">Inventory Code</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPurchase.items.map((item, index) => (
                    <tr key={`${item.stockId}-${index}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">
                          {item.medicine}
                        </p>
                        <p className="text-xs text-slate-500">
                          Manufacturer Batch: {item.batchNo}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-blue-50 px-2 py-1 font-mono text-xs font-semibold text-blue-700">
                          {item.inventoryBatchCode || "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(item.expiryDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatCurrency(item.purchaseRate)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedPurchase.notes && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {selectedPurchase.notes}
                </p>
              </div>
            )}

            <div className="mt-5 flex justify-between border-t border-slate-100 pt-4">
              <span className="font-semibold text-slate-700">
                Total Purchase Amount
              </span>
              <span className="text-xl font-bold text-blue-700">
                {formatCurrency(selectedPurchase.amount)}
              </span>
            </div>

            <button
              onClick={() => setSelectedPurchase(null)}
              className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
