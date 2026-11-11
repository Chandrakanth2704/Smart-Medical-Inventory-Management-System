"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  MapPin,
  Save,
  Pencil,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type DeliveryDetails = {
  houseNumber: string;
  street: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
};

const initialDetails: DeliveryDetails = {
  houseNumber: "",
  street: "",
  area: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
};

const fields: {
  name: keyof DeliveryDetails;
  label: string;
  placeholder: string;
  required: boolean;
  maxLength?: number;
  pattern?: string;
  type?: string;
}[] = [
  {
    name: "houseNumber",
    label: "House / Door Number",
    placeholder: "e.g. No. 24, Flat 302",
    required: true,
    maxLength: 100,
  },
  {
    name: "street",
    label: "Street / Road",
    placeholder: "Enter street or road",
    required: true,
    maxLength: 150,
  },
  {
    name: "area",
    label: "Area / Locality",
    placeholder: "Enter your area or locality",
    required: true,
    maxLength: 150,
  },
  {
    name: "landmark",
    label: "Landmark",
    placeholder: "Nearby landmark (optional)",
    required: false,
    maxLength: 150,
  },
  {
    name: "city",
    label: "City",
    placeholder: "Enter your city",
    required: true,
    maxLength: 100,
  },
  {
    name: "state",
    label: "State",
    placeholder: "Enter your state",
    required: true,
    maxLength: 100,
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

export default function DeliveryAddressForm() {
  const [details, setDetails] =
    useState<DeliveryDetails>(initialDetails);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  useEffect(() => {
    async function loadAddress() {
      try {
        const response = await fetch(
          "/api/customer/delivery-details",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load delivery details."
          );
        }

        const savedDetails = {
          ...initialDetails,
          ...(result.details ?? {}),
        };

        setDetails(savedDetails);

        const hasAddress = Boolean(
          savedDetails.houseNumber &&
            savedDetails.street &&
            savedDetails.area &&
            savedDetails.city &&
            savedDetails.state &&
            savedDetails.pincode &&
            savedDetails.phone
        );

        setHasSavedAddress(hasAddress);
        setIsEditing(!hasAddress);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load delivery details."
        );
        setMessageType("error");
        setIsEditing(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadAddress();
  }, []);

  function updateField(
    field: keyof DeliveryDetails,
    value: string
  ) {
    setDetails((current) => ({
      ...current,
      [field]: value,
    }));

    setMessage("");
    setMessageType("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (!/^[0-9]{6}$/.test(details.pincode)) {
      setMessage("Please enter a valid 6-digit PIN code.");
      setMessageType("error");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(details.phone)) {
      setMessage("Please enter a valid 10-digit mobile number.");
      setMessageType("error");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/customer/delivery-details",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(details),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to save delivery address."
        );
      }

      setHasSavedAddress(true);
      setIsEditing(false);
      setMessage("Your delivery address has been saved successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save your delivery address."
      );
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 py-8 text-sm font-medium text-slate-500">
          <LoaderCircle
            size={20}
            className="animate-spin text-[#0D9488]"
          />
          Loading delivery information...
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-[#0D9488]">
            <MapPin size={22} />
          </span>

          <div>
            <h2 className="text-lg font-extrabold text-[#0B1F3A]">
              Delivery Address
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Save your address to use it automatically during checkout.
            </p>
          </div>
        </div>

        {hasSavedAddress && !isEditing && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setMessage("");
              setMessageType("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0D9488] px-4 py-2.5 text-sm font-bold text-[#0D9488] transition hover:bg-teal-50"
          >
            <Pencil size={16} />
            Edit Address
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {!isEditing && hasSavedAddress ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-teal-800">
                <CheckCircle2 size={18} />
                Delivery address saved
              </div>

              <div className="mt-3 space-y-1 text-sm leading-6 text-slate-700">
                <p>{details.houseNumber}</p>
                <p>{details.street}</p>
                <p>{details.area}</p>
                {details.landmark && (
                  <p>Landmark: {details.landmark}</p>
                )}
                <p>
                  {details.city}, {details.state} - {details.pincode}
                </p>
                <p className="pt-2 font-semibold">
                  Contact: {details.phone}
                </p>
              </div>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              This address will be automatically filled in when you
              proceed to checkout. You can edit it whenever necessary.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={
                    field.name === "area" ||
                    field.name === "landmark"
                      ? "sm:col-span-2"
                      : ""
                  }
                >
                  <label
                    htmlFor={`delivery-${field.name}`}
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    {field.label}
                    {field.required && (
                      <span className="ml-1 text-rose-500">*</span>
                    )}
                  </label>

                  <input
                    id={`delivery-${field.name}`}
                    name={field.name}
                    type={field.type || "text"}
                    value={details[field.name]}
                    onChange={(event) =>
                      updateField(field.name, event.target.value)
                    }
                    placeholder={field.placeholder}
                    required={field.required}
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

            {message && (
              <div
                className={`mt-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${
                  messageType === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {messageType === "success" ? (
                  <CheckCircle2 size={18} className="shrink-0" />
                ) : (
                  <AlertCircle size={18} className="shrink-0" />
                )}
                <span>{message}</span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D9488] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#087d75] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={17} />
                )}
                {isSaving ? "Saving Address..." : "Save Address"}
              </button>

              {hasSavedAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setMessage("");
                    setMessageType("");
                  }}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {message && !isEditing && (
          <p className="mt-4 text-sm font-medium text-emerald-700">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
