"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  ShoppingBag,
  CreditCard,
  LoaderCircle,
  AlertCircle,
  ShieldCheck,
  PackageCheck,
  Save,
} from "lucide-react";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  type CartItem,
} from "@/lib/cart";

type PaymentMode = "CASH" | "CARD" | "UPI" | "BANK";

type AddressDetails = {
  houseNumber: string;
  street: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
};

type OrderResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  order?: {
    orderId?: number | string;
    orderStatus?: string;
    paymentStatus?: string;
    subtotal?: number;
    deliveryFee?: number;
    handlingFee?: number;
    total?: number;
  };
};

type SavedAddressResponse = {
  success?: boolean;
  message?: string;
  customerName?: string;
  details?: Partial<AddressDetails>;
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const FREE_DELIVERY_THRESHOLD = 499;
const DELIVERY_FEE = 39;
const HANDLING_FEE = 9;

const addressFields: {
  name: keyof AddressDetails;
  label: string;
  placeholder: string;
  required: boolean;
  type?: string;
  maxLength?: number;
  pattern?: string;
}[] = [
  {
    name: "houseNumber",
    label: "House / Door Number",
    placeholder: "e.g. No. 24, Flat 302",
    required: true,
  },
  {
    name: "street",
    label: "Street / Road",
    placeholder: "Enter street or road name",
    required: true,
  },
  {
    name: "area",
    label: "Area / Locality",
    placeholder: "Enter your area or locality",
    required: true,
  },
  {
    name: "landmark",
    label: "Landmark",
    placeholder: "Nearby landmark (optional)",
    required: false,
  },
  {
    name: "city",
    label: "City",
    placeholder: "Enter your city",
    required: true,
  },
  {
    name: "state",
    label: "State",
    placeholder: "Enter your state",
    required: true,
  },
  {
    name: "pincode",
    label: "PIN Code",
    placeholder: "6-digit PIN code",
    required: true,
    maxLength: 6,
    pattern: "[0-9]{6}",
  },
  {
    name: "phone",
    label: "Contact Number",
    placeholder: "10-digit mobile number",
    required: true,
    type: "tel",
    maxLength: 10,
    pattern: "[6-9][0-9]{9}",
  },
];

const initialAddress: AddressDetails = {
  houseNumber: "",
  street: "",
  area: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [address, setAddress] = useState<AddressDetails>(initialAddress);
  const [isAddressLoading, setIsAddressLoading] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressLoaded, setAddressLoaded] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [customerNotes, setCustomerNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | number | null>(null);

  // Load the cart and saved delivery details.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];

      setCart(Array.isArray(parsed) ? (parsed as CartItem[]) : []);
    } catch {
      setCart([]);
    } finally {
      setIsLoaded(true);
    }

    async function loadDeliveryDetails() {
      try {
        const response = await fetch(
          "/api/customer/delivery-details",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as SavedAddressResponse;

        if (response.status === 401 || response.status === 403) {
          setAddressMessage(
            "Log in with your customer account to retrieve saved delivery details."
          );
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to retrieve saved delivery details."
          );
        }

        if (result.details) {
          setAddress((current) => ({
            ...current,
            ...result.details,
          }));
        }

        setAddressLoaded(true);
      } catch (err) {
        setAddressMessage(
          err instanceof Error
            ? err.message
            : "Unable to load saved delivery details."
        );
      } finally {
        setIsAddressLoading(false);
      }
    }

    loadDeliveryDetails();
  }, []);

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const subtotal = cart.reduce(
    (total, item) =>
      total + Number(item.sellingPrice) * item.quantity,
    0
  );

  const deliveryFee =
    subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

  const handlingFee = HANDLING_FEE;
  const orderTotal = subtotal + deliveryFee + handlingFee;

  function updateAddress(
    field: keyof AddressDetails,
    value: string
  ) {
    setAddress((current) => ({
      ...current,
      [field]: value,
    }));

    setAddressMessage("");
  }

  function buildDeliveryAddress() {
    const addressLines = [
      address.houseNumber.trim(),
      address.street.trim(),
      address.area.trim(),
      address.landmark.trim()
        ? `Landmark: ${address.landmark.trim()}`
        : "",
      `${address.city.trim()}, ${address.state.trim()} - ${address.pincode.trim()}`,
      `Contact Number: ${address.phone.trim()}`,
    ];

    return addressLines.filter(Boolean).join("\n");
  }

  async function handleSaveAddress() {
    setAddressMessage("");

    const requiredFields: (keyof AddressDetails)[] = [
      "houseNumber",
      "street",
      "area",
      "city",
      "state",
      "pincode",
      "phone",
    ];

    const missingField = requiredFields.find(
      (field) => !address[field].trim()
    );

    if (missingField) {
      setAddressMessage(
        "Please complete all required delivery fields before saving."
      );
      return;
    }

    if (!/^[0-9]{6}$/.test(address.pincode)) {
      setAddressMessage("Please enter a valid 6-digit PIN code.");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(address.phone)) {
      setAddressMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSavingAddress(true);

    try {
      const response = await fetch(
        "/api/customer/delivery-details",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(address),
        }
      );

      const result =
        (await response.json()) as SavedAddressResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to save delivery details."
        );
      }

      setAddressLoaded(true);
      setAddressMessage(
        "Delivery details saved successfully for your future orders."
      );
    } catch (err) {
      setAddressMessage(
        err instanceof Error
          ? err.message
          : "Unable to save delivery details."
      );
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setRequiresLogin(false);

    if (cart.length === 0) {
      setError("Your cart is empty. Add medicines before placing an order.");
      return;
    }

    const invalidItem = cart.find(
      (item) =>
        item.quantity <= 0 ||
        item.quantity > item.availableQuantity
    );

    if (invalidItem) {
      setError(
        `The selected quantity for ${invalidItem.medicineName} is no longer available. Please update your cart.`
      );
      return;
    }

    if (isAddressLoading) {
      setError("Please wait while your delivery details are loading.");
      return;
    }

    const deliveryAddress = buildDeliveryAddress();

    const requiredFields: (keyof AddressDetails)[] = [
      "houseNumber",
      "street",
      "area",
      "city",
      "state",
      "pincode",
      "phone",
    ];

    const missingField = requiredFields.find(
      (field) => !address[field].trim()
    );

    if (missingField) {
      setError("Please complete all required delivery information.");
      return;
    }

    if (!/^[0-9]{6}$/.test(address.pincode)) {
      setError("Please enter a valid 6-digit PIN code.");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(address.phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save the latest delivery information before placing the order.
      const saveResponse = await fetch(
        "/api/customer/delivery-details",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(address),
        }
      );

      const saveResult =
        (await saveResponse.json()) as SavedAddressResponse;

      if (!saveResponse.ok || !saveResult.success) {
        throw new Error(
          saveResult.message ||
            "Unable to save delivery details. Please try again."
        );
      }

      const response = await fetch("/api/customer/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deliveryAddress,
          paymentMode,
          customerNotes: customerNotes.trim() || null,
          items: cart.map((item) => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
          })),
        }),
      });

      const result =
        (await response.json().catch(() => ({}))) as OrderResponse;

      if (response.status === 401 || response.status === 403) {
        setRequiresLogin(true);
        throw new Error(
          "Please log in with your customer account to place an order."
        );
      }

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
            result.error ||
            "Unable to place your order. Please try again."
        );
      }

      const createdOrderId = result.order?.orderId ?? null;

      localStorage.removeItem(CART_STORAGE_KEY);
      window.dispatchEvent(new Event(CART_UPDATED_EVENT));

      setCart([]);
      setOrderId(createdOrderId);
      setOrderPlaced(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoaded || isAddressLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F8FB]">
        <LoaderCircle
          className="animate-spin text-[#0D9488]"
          size={32}
        />
      </main>
    );
  }

  if (orderPlaced) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F8FB] px-5 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={45} strokeWidth={1.7} />
          </div>

          <h1 className="mt-6 text-2xl font-extrabold text-[#0B1F3A]">
            Order placed successfully!
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            Thank you for shopping with HospilLogix. Your order has
            been submitted successfully.
          </p>

          {orderId !== null && (
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Order reference
              </p>
              <p className="mt-2 text-xl font-extrabold text-[#0B1F3A]">
                #{orderId}
              </p>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-sm font-bold text-amber-900">
              Payment pending
            </p>
            <p className="mt-1 text-xs leading-6 text-amber-800">
              Your preferred payment method has been recorded. Payment
              gateway processing is not integrated yet. Please follow
              the pharmacy&apos;s instructions for payment and fulfilment.
            </p>
          </div>

          <Link
            href="/store"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D9488] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-teal-900/10 transition duration-200 hover:-translate-y-0.5 hover:bg-[#087d75] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-teal-100 active:translate-y-0"
          >
            <ShoppingBag size={17} />
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F5F8FB] px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-teal-50 text-[#0D9488]">
            <ShoppingBag size={38} />
          </div>

          <h1 className="mt-6 text-2xl font-extrabold text-[#0B1F3A]">
            Your cart is empty
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            Add medicines to your cart before placing an order.
          </p>

          <Link
            href="/store"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B1F3A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#16385f]"
          >
            <ArrowLeft size={17} />
            Browse Medicines
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F8FB]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between px-5">
          <Link href="/store" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B1F3A] text-white">
              <ShoppingBag size={22} />
            </span>

            <span>
              <span className="block text-xl font-extrabold tracking-tight text-[#0B1F3A]">
                Hospil<span className="text-[#0D9488]">Logix</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.13em] text-slate-500">
                SECURE CHECKOUT
              </span>
            </span>
          </Link>

          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-[#0D9488]"
          >
            <ArrowLeft size={16} />
            Back to Cart
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0D9488]">
            Almost there
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0B1F3A]">
            Checkout
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Enter your delivery details and review your order.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-2 text-[#0D9488]">
              <CheckCircle2 size={16} />
              Cart reviewed
            </span>
            <span className="h-px w-8 bg-slate-300" />
            <span className="inline-flex items-center gap-2 text-[#0B1F3A]">
              <MapPin size={16} />
              Delivery details
            </span>
            <span className="h-px w-8 bg-slate-300" />
            <span className="inline-flex items-center gap-2">
              <PackageCheck size={16} />
              Order confirmation
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid items-start gap-8 lg:grid-cols-[1fr_390px]"
        >
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-[#0D9488]">
                  <MapPin size={20} />
                </span>

                <div>
                  <h2 className="font-bold text-[#0B1F3A]">
                    Delivery Information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your saved delivery details are loaded automatically.
                  </p>
                </div>
              </div>

              {addressLoaded && (
                <div className="mb-5 flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 p-3 text-xs font-medium text-teal-800">
                  <CheckCircle2 size={16} />
                  Saved delivery information loaded. You can update it below.
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                {addressFields.map((field) => (
                  <div
                    key={field.name}
                    className={
                      field.name === "area" || field.name === "landmark"
                        ? "sm:col-span-2"
                        : ""
                    }
                  >
                    <label
                      htmlFor={field.name}
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-rose-500">*</span>
                      )}
                    </label>

                    <input
                      id={field.name}
                      name={field.name}
                      type={field.type || "text"}
                      required={field.required}
                      value={address[field.name]}
                      onChange={(event) =>
                        updateAddress(field.name, event.target.value)
                      }
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      pattern={field.pattern}
                      autoComplete={
                        field.name === "phone"
                          ? "tel"
                          : field.name === "pincode"
                            ? "postal-code"
                            : "street-address"
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0D9488] focus:bg-white focus:ring-2 focus:ring-teal-50"
                    />
                  </div>
                ))}
              </div>

              <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                Please verify your PIN code and contact number before
                placing the order.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={isSavingAddress}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0D9488] px-5 py-3 text-sm font-bold text-[#0D9488] transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingAddress ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {isSavingAddress ? "Saving..." : "Save for Future Orders"}
                </button>

                {addressMessage && (
                  <p className="text-xs font-medium text-slate-600">
                    {addressMessage}
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-[#0D9488]">
                  <CreditCard size={20} />
                </span>

                <div>
                  <h2 className="font-bold text-[#0B1F3A]">
                    Payment Method
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select your preferred payment method.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["CASH", "Cash"],
                    ["UPI", "UPI"],
                    ["CARD", "Debit / Credit Card"],
                    ["BANK", "Bank Transfer"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                      paymentMode === value
                        ? "border-[#0D9488] bg-teal-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMode"
                      value={value}
                      checked={paymentMode === value}
                      onChange={() => setPaymentMode(value)}
                      className="h-4 w-4 accent-[#0D9488]"
                    />

                    <span className="text-sm font-semibold text-slate-700">
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                Payment gateway processing is not integrated yet. This
                selection records your preferred payment method. Payment
                remains pending when the order is placed.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-bold text-[#0B1F3A]">
                Additional Notes
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Add optional delivery or order instructions.
              </p>

              <textarea
                name="customerNotes"
                rows={3}
                maxLength={1000}
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
                placeholder="Enter any additional instructions..."
                className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0D9488] focus:bg-white focus:ring-2 focus:ring-teal-50"
              />
            </section>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <div>
                  <p>{error}</p>

                  {requiresLogin && (
                    <Link
                      href="/login"
                      className="mt-2 inline-block font-bold underline"
                    >
                      Go to Login
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#0B1F3A]">
                Order Summary
              </h2>

              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-[#0D9488]">
                {totalItems} items
              </span>
            </div>

            <div className="mt-6 max-h-72 space-y-4 overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.medicineId}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0B1F3A]">
                      {item.medicineName}
                    </p>

                    {item.strength && (
                      <p className="mt-1 text-xs text-slate-500">
                        {item.strength}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-slate-500">
                      {currency.format(Number(item.sellingPrice))} × {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-bold text-slate-700">
                    {currency.format(
                      Number(item.sellingPrice) * item.quantity
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div className="my-6 border-t border-slate-100" />

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-700">
                  {currency.format(subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-sm text-slate-500">
                <span>Delivery fee</span>
                {deliveryFee === 0 ? (
                  <span className="font-semibold text-emerald-600">
                    Free
                  </span>
                ) : (
                  <span className="font-semibold text-slate-700">
                    {currency.format(deliveryFee)}
                  </span>
                )}
              </div>

              <div className="flex justify-between text-sm text-slate-500">
                <span>Handling fee</span>
                <span className="font-semibold text-slate-700">
                  {currency.format(handlingFee)}
                </span>
              </div>

              {subtotal < FREE_DELIVERY_THRESHOLD && (
                <p className="rounded-lg bg-teal-50 p-3 text-xs leading-5 text-teal-800">
                  Add {currency.format(FREE_DELIVERY_THRESHOLD - subtotal)} more
                  to qualify for free delivery.
                </p>
              )}
            </div>

            <div className="my-5 border-t border-slate-100" />

            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0B1F3A]">
                Order Total
              </span>

              <span className="text-xl font-extrabold text-[#0B1F3A]">
                {currency.format(orderTotal)}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || cart.length === 0}
              className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B1F3A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#16385f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <ShoppingBag size={18} />
                  Place Order
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={15} />
              Your order details are submitted securely.
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
