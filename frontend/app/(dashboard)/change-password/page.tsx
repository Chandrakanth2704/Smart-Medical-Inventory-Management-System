
"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("Your new password must be different from the current password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation do not match.");
      return;
    }

    setError(
      "Password changes require backend authentication. This demonstration has not changed your actual password."
    );
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Change Password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update your account password to help keep your account secure.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
            <ShieldCheck size={25} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Password security</h2>
            <p className="text-xs text-slate-500">
              Choose a strong password that you have not used before.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            {
              label: "Current Password",
              value: currentPassword,
              setter: setCurrentPassword,
              placeholder: "Enter current password",
            },
            {
              label: "New Password",
              value: newPassword,
              setter: setNewPassword,
              placeholder: "Enter new password",
            },
            {
              label: "Confirm New Password",
              value: confirmPassword,
              setter: setConfirmPassword,
              placeholder: "Re-enter new password",
            },
          ].map((field) => (
            <div key={field.label}>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {field.label}
              </label>
              <div className="relative">
                <LockKeyhole
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPasswords ? "text" : "password"}
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-700"
          >
            {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">
              Password requirements
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-500">
              <li>At least 8 characters</li>
              <li>Use a combination of letters, numbers, and symbols</li>
              <li>Do not reuse your previous password</li>
            </ul>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
