"use client";

import { useState } from "react";
import {
  Settings,
  Building2,
  Bell,
  ShieldCheck,
  Globe,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Package,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type Tab = "general" | "notifications" | "inventory" | "security";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [saved, setSaved] = useState(false);

  const [business, setBusiness] = useState({
    pharmacyName: "MediStock Pharmacy",
    email: "contact@medistock.com",
    phone: "9876543210",
    address: "Bengaluru, Karnataka, India",
    currency: "INR",
    timezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
  });

  const [notifications, setNotifications] = useState({
    lowStock: true,
    expiryAlerts: true,
    salesUpdates: true,
    purchaseUpdates: false,
    dailySummary: true,
    emailNotifications: true,
  });

  const [inventory, setInventory] = useState({
    defaultReorderLevel: "10",
    expiryWarningDays: "30",
    allowNegativeStock: false,
    blockExpiredSales: true,
    autoUpdateStock: true,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    newPassword: "",
    confirm: "",
  });

  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  function handleSave() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }

  function updateNotification(key: keyof typeof notifications) {
    setNotifications((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

  function updateInventoryToggle(key: "allowNegativeStock" | "blockExpiredSales" | "autoUpdateStock") {
    setInventory((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

  function handlePasswordUpdate() {
    setPasswordMessage("");

    if (!passwords.current || !passwords.newPassword || !passwords.confirm) {
      setPasswordMessage("Please fill in all password fields.");
      return;
    }

    if (passwords.newPassword.length < 8) {
      setPasswordMessage("New password must contain at least 8 characters.");
      return;
    }

    if (passwords.newPassword !== passwords.confirm) {
      setPasswordMessage("New password and confirmation do not match.");
      return;
    }

    setPasswordMessage(
      "Password form validated. Connect authentication API to update your password."
    );
    setPasswords({ current: "", newPassword: "", confirm: "" });
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Building2 size={18} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
    { id: "inventory", label: "Inventory", icon: <Package size={18} /> },
    { id: "security", label: "Security", icon: <ShieldCheck size={18} /> },
  ];

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <Settings size={23} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Configure your pharmacy system preferences.
            </p>
          </div>
        </div>
      </div>

      {/* Save status */}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 size={18} />
          Settings saved in the current page session.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar navigation */}
        <div className="h-fit rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Preferences
          </p>

          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPasswordMessage("");
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings content */}
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* General settings */}
          {activeTab === "general" && (
            <>
              <SectionHeading
                title="General Settings"
                description="Manage your pharmacy's basic information and regional preferences."
              />

              <div className="space-y-6 p-5 sm:p-6">
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Building2 size={17} className="text-blue-600" />
                    Pharmacy Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Pharmacy Name">
                      <input
                        className={inputClass}
                        value={business.pharmacyName}
                        onChange={(e) =>
                          setBusiness({
                            ...business,
                            pharmacyName: e.target.value,
                          })
                        }
                      />
                    </FormField>

                    <FormField label="Email Address">
                      <div className="relative">
                        <Mail
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          className={`${inputClass} pl-9`}
                          type="email"
                          value={business.email}
                          onChange={(e) =>
                            setBusiness({
                              ...business,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                    </FormField>

                    <FormField label="Phone Number">
                      <div className="relative">
                        <Phone
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          className={`${inputClass} pl-9`}
                          value={business.phone}
                          onChange={(e) =>
                            setBusiness({
                              ...business,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>
                    </FormField>

                    <FormField label="Business Address">
                      <div className="relative">
                        <MapPin
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          className={`${inputClass} pl-9`}
                          value={business.address}
                          onChange={(e) =>
                            setBusiness({
                              ...business,
                              address: e.target.value,
                            })
                          }
                        />
                      </div>
                    </FormField>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Globe size={17} className="text-blue-600" />
                    Regional Preferences
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Currency">
                      <select
                        className={inputClass}
                        value={business.currency}
                        onChange={(e) =>
                          setBusiness({
                            ...business,
                            currency: e.target.value,
                          })
                        }
                      >
                        <option value="INR">Indian Rupee (INR ₹)</option>
                        <option value="USD">US Dollar (USD $)</option>
                        <option value="EUR">Euro (EUR €)</option>
                        <option value="GBP">British Pound (GBP £)</option>
                      </select>
                    </FormField>

                    <FormField label="Time Zone">
                      <select
                        className={inputClass}
                        value={business.timezone}
                        onChange={(e) =>
                          setBusiness({
                            ...business,
                            timezone: e.target.value,
                          })
                        }
                      >
                        <option value="Asia/Kolkata">
                          India Standard Time (IST)
                        </option>
                        <option value="UTC">Coordinated Universal Time (UTC)</option>
                        <option value="America/New_York">
                          Eastern Time
                        </option>
                        <option value="Europe/London">London Time</option>
                      </select>
                    </FormField>

                    <FormField label="Date Format">
                      <select
                        className={inputClass}
                        value={business.dateFormat}
                        onChange={(e) =>
                          setBusiness({
                            ...business,
                            dateFormat: e.target.value,
                          })
                        }
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </FormField>
                  </div>
                </div>

                <SaveButton onClick={handleSave} />
              </div>
            </>
          )}

          {/* Notification settings */}
          {activeTab === "notifications" && (
            <>
              <SectionHeading
                title="Notification Settings"
                description="Choose which alerts and updates you want to receive."
              />

              <div className="space-y-1 p-5 sm:p-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Inventory Notifications
                </h3>

                <ToggleRow
                  title="Low Stock Alerts"
                  description="Get notified when medicine stock reaches its reorder level."
                  checked={notifications.lowStock}
                  onChange={() => updateNotification("lowStock")}
                />

                <ToggleRow
                  title="Expiry Alerts"
                  description="Receive alerts for medicines approaching their expiry date."
                  checked={notifications.expiryAlerts}
                  onChange={() => updateNotification("expiryAlerts")}
                />

                <div className="my-5 border-t border-slate-100" />

                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Transaction Notifications
                </h3>

                <ToggleRow
                  title="Sales Updates"
                  description="Receive notifications when a sale is completed."
                  checked={notifications.salesUpdates}
                  onChange={() => updateNotification("salesUpdates")}
                />

                <ToggleRow
                  title="Purchase Updates"
                  description="Receive updates when new purchases are recorded."
                  checked={notifications.purchaseUpdates}
                  onChange={() => updateNotification("purchaseUpdates")}
                />

                <div className="my-5 border-t border-slate-100" />

                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Summary Notifications
                </h3>

                <ToggleRow
                  title="Daily Summary"
                  description="Receive a daily summary of sales and inventory activity."
                  checked={notifications.dailySummary}
                  onChange={() => updateNotification("dailySummary")}
                />

                <ToggleRow
                  title="Email Notifications"
                  description="Enable delivery of system notifications through email."
                  checked={notifications.emailNotifications}
                  onChange={() => updateNotification("emailNotifications")}
                />

                <SaveButton onClick={handleSave} />
              </div>
            </>
          )}

          {/* Inventory settings */}
          {activeTab === "inventory" && (
            <>
              <SectionHeading
                title="Inventory Settings"
                description="Configure stock monitoring and medicine expiry rules."
              />

              <div className="space-y-6 p-5 sm:p-6">
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Package size={17} className="text-blue-600" />
                    Stock Management
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Default Reorder Level">
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={inventory.defaultReorderLevel}
                        onChange={(e) =>
                          setInventory({
                            ...inventory,
                            defaultReorderLevel: e.target.value,
                          })
                        }
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Default minimum quantity for new medicines.
                      </p>
                    </FormField>

                    <FormField label="Expiry Warning Period (Days)">
                      <input
                        type="number"
                        min="0"
                        className={inputClass}
                        value={inventory.expiryWarningDays}
                        onChange={(e) =>
                          setInventory({
                            ...inventory,
                            expiryWarningDays: e.target.value,
                          })
                        }
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Alert before a medicine batch expires.
                      </p>
                    </FormField>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">
                    Inventory Rules
                  </h3>

                  <ToggleRow
                    title="Allow Negative Stock"
                    description="Allow sales even when available stock is insufficient. Not recommended."
                    checked={inventory.allowNegativeStock}
                    onChange={() =>
                      updateInventoryToggle("allowNegativeStock")
                    }
                  />

                  <ToggleRow
                    title="Block Expired Medicine Sales"
                    description="Prevent expired medicine batches from being sold."
                    checked={inventory.blockExpiredSales}
                    onChange={() =>
                      updateInventoryToggle("blockExpiredSales")
                    }
                  />

                  <ToggleRow
                    title="Automatic Stock Updates"
                    description="Automatically update stock after purchases and sales."
                    checked={inventory.autoUpdateStock}
                    onChange={() =>
                      updateInventoryToggle("autoUpdateStock")
                    }
                  />
                </div>

                {inventory.allowNegativeStock && (
                  <div className="flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
                    <AlertTriangle size={19} className="shrink-0" />
                    Negative stock is enabled. This can cause inventory
                    inconsistencies. The backend must enforce the intended
                    policy.
                  </div>
                )}

                <SaveButton onClick={handleSave} />
              </div>
            </>
          )}

          {/* Security settings */}
          {activeTab === "security" && (
            <>
              <SectionHeading
                title="Security Settings"
                description="Manage your account password and security preferences."
              />

              <div className="space-y-6 p-5 sm:p-6">
                <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <ShieldCheck
                    size={22}
                    className="shrink-0 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">
                      Account Security
                    </p>
                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      Use a strong password and keep your account credentials
                      private. Role-based access will be enforced by the
                      backend.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Lock size={17} className="text-blue-600" />
                    Change Password
                  </h3>

                  <div className="max-w-lg space-y-4">
                    {[
                      {
                        label: "Current Password",
                        key: "current" as const,
                      },
                      {
                        label: "New Password",
                        key: "newPassword" as const,
                      },
                      {
                        label: "Confirm New Password",
                        key: "confirm" as const,
                      },
                    ].map((field) => (
                      <FormField key={field.key} label={field.label}>
                        <div className="relative">
                          <input
                            className={`${inputClass} pr-11`}
                            type={showPasswords ? "text" : "password"}
                            value={passwords[field.key]}
                            onChange={(e) =>
                              setPasswords({
                                ...passwords,
                                [field.key]: e.target.value,
                              })
                            }
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords(!showPasswords)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            title={
                              showPasswords ? "Hide passwords" : "Show passwords"
                            }
                          >
                            {showPasswords ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </FormField>
                    ))}

                    <p className="text-xs text-slate-400">
                      Password must contain at least 8 characters.
                    </p>

                    {passwordMessage && (
                      <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                        {passwordMessage}
                      </p>
                    )}

                    <button
                      onClick={handlePasswordUpdate}
                      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Validate Password Change
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">
                    Account Information
                  </h3>

                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
                    <div className="rounded-full bg-blue-100 p-3 text-blue-600">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Administrator Account
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Role: ADMIN
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-slate-100 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-end border-t border-slate-100 pt-5">
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        <Save size={17} />
        Save Changes
      </button>
    </div>
  );
}
