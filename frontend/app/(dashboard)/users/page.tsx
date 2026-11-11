"use client";

import { useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  UserRound,
  Eye,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  Lock,
} from "lucide-react";

type UserRole = "ADMIN" | "CUSTOMER";
type UserStatus = "Active" | "Inactive";

type SystemUser = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
};

const initialUsers: SystemUser[] = [
  {
    id: 1,
    username: "admin",
    fullName: "System Administrator",
    email: "admin@medistock.com",
    phone: "9876543210",
    role: "ADMIN",
    status: "Active",
    createdAt: "2026-08-01",
  },
  {
    id: 4,
    username: "customer01",
    fullName: "Ananya Rao",
    email: "ananya@gmail.com",
    phone: "9876543213",
    role: "CUSTOMER",
    status: "Active",
    createdAt: "2026-09-15",
  },
  {
    id: 5,
    username: "customer02",
    fullName: "Kiran Kumar",
    email: "kiran@gmail.com",
    phone: "9876543214",
    role: "CUSTOMER",
    status: "Inactive",
    createdAt: "2026-10-02",
  },
];

const emptyForm = {
  username: "",
  fullName: "",
  email: "",
  phone: "",
  role: "CUSTOMER" as UserRole,
  status: "Active" as UserStatus,
  password: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modal, setModal] = useState<"add" | "edit" | "view" | null>(null);
  const [selected, setSelected] = useState<SystemUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(term) ||
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);

      const matchesRole =
        roleFilter === "All" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "All" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  const customerCount = users.filter(
    (u) => u.role === "CUSTOMER"
  ).length;

  const activeCount = users.filter((u) => u.status === "Active").length;

  function openAddModal() {
    setSelected(null);
    setForm(emptyForm);
    setError("");
    setModal("add");
  }

  function openEditModal(user: SystemUser) {
    setSelected(user);
    setForm({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      password: "",
    });
    setError("");
    setModal("edit");
  }

  function saveUser() {
    const username = form.username.trim();
    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (!username || !fullName || !email || !phone) {
      setError("Please complete all required fields.");
      return;
    }

    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
      setError(
        "Username must be 3–30 characters and contain only letters, numbers, dots, underscores, or hyphens."
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (modal === "add" && form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    const duplicateUsername = users.some(
      (user) =>
        user.username.toLowerCase() === username.toLowerCase() &&
        user.id !== selected?.id
    );

    if (duplicateUsername) {
      setError("This username is already registered.");
      return;
    }

    const duplicateEmail = users.some(
      (user) =>
        user.email.toLowerCase() === email &&
        user.id !== selected?.id
    );

    if (duplicateEmail) {
      setError("This email address is already registered.");
      return;
    }

    if (modal === "add") {
      const newUser: SystemUser = {
        id: Math.max(0, ...users.map((user) => user.id)) + 1,
        username,
        fullName,
        email,
        phone,
        role: form.role,
        status: form.status,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      setUsers((previous) => [newUser, ...previous]);
    } else if (modal === "edit" && selected) {
      setUsers((previous) =>
        previous.map((user) =>
          user.id === selected.id
            ? {
                ...user,
                username,
                fullName,
                email,
                phone,
                role: form.role,
                status: form.status,
              }
            : user
        )
      );
    }

    setModal(null);
    setError("");
    setForm(emptyForm);
  }

  function deleteUser(user: SystemUser) {
    if (user.role === "ADMIN" && adminCount <= 1) {
      alert("You cannot delete the last administrator account.");
      return;
    }

    if (window.confirm(`Delete user "${user.fullName}"?`)) {
      setUsers((previous) =>
        previous.filter((item) => item.id !== user.id)
      );
    }
  }

  function getRoleStyle(role: UserRole) {
    switch (role) {
      case "ADMIN":
        return "bg-purple-50 text-purple-700";
      case "CUSTOMER":
        return "bg-orange-50 text-orange-700";
    }
  }

  function getRoleLabel(role: UserRole) {
    return role === "ADMIN" ? "Administrator" : "Customer";
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            User Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage system accounts, roles, and access status.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <UserPlus size={18} />
          Add New User
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Total Users"
          value={users.length}
          icon={<Users size={21} />}
          color="blue"
        />
        <SummaryCard
          title="Administrators"
          value={adminCount}
          icon={<ShieldCheck size={21} />}
          color="purple"
        />
        <SummaryCard
          title="Customers"
          value={customerCount}
          icon={<UserRound size={21} />}
          color="orange"
        />
      </div>

      {/* User table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-semibold text-slate-800">
              System Users
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {filteredUsers.length} users found · {activeCount} active accounts
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 sm:w-52"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none"
            >
              <option value="All">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="CUSTOMER">Customer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">User</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">Role</th>
                <th className="px-5 py-4 font-semibold">Created</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-600">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-slate-400">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <p className="flex items-center gap-2 text-slate-600">
                      <Mail size={14} className="text-slate-400" />
                      {user.email}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Phone size={13} className="text-slate-400" />
                      {user.phone}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getRoleStyle(
                        user.role
                      )}`}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {user.createdAt}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.status === "Active"
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <ActionButton
                        title="View"
                        onClick={() => {
                          setSelected(user);
                          setModal("view");
                        }}
                      >
                        <Eye size={16} />
                      </ActionButton>

                      <ActionButton
                        title="Edit"
                        onClick={() => openEditModal(user)}
                      >
                        <Pencil size={16} />
                      </ActionButton>

                      <ActionButton
                        title="Delete"
                        danger
                        onClick={() => deleteUser(user)}
                      >
                        <Trash2 size={16} />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Users
                      size={32}
                      className="mx-auto mb-2 text-slate-300"
                    />
                    <p className="font-medium text-slate-600">
                      No users found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try changing your search or filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
          <div className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {modal === "add" ? "Create New User" : "Edit User"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Configure user details and access permissions.
                </p>
              </div>

              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <FormField label="Username *">
                <input
                  className={inputClass}
                  placeholder="Enter username"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Full Name *">
                <input
                  className={inputClass}
                  placeholder="Enter full name"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Email Address *">
                <input
                  className={inputClass}
                  type="email"
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Phone Number *">
                <input
                  className={inputClass}
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </FormField>

              {modal === "add" && (
                <FormField label="Initial Password *">
                  <input
                    className={inputClass}
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </FormField>
              )}

              <FormField label="User Role *">
                <select
                  className={inputClass}
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as UserRole,
                    })
                  }
                >
                  <option value="ADMIN">Administrator</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
              </FormField>

              <FormField label="Account Status">
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as UserStatus,
                    })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </FormField>

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 sm:col-span-2">
                  {error}
                </p>
              )}

              {modal === "add" && (
                <p className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-700 sm:col-span-2">
                  <Lock size={15} className="mt-0.5 shrink-0" />
                  This is a frontend demonstration. In the backend, passwords
                  must be securely hashed before being stored. Never store
                  plain-text passwords in the database.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={saveUser}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {modal === "add" ? "Create User" : "Update User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === "view" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h2 className="font-bold text-slate-800">User Details</h2>
              <button
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl font-bold text-blue-600">
                  {selected.fullName.charAt(0)}
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-800">
                  {selected.fullName}
                </h3>
                <p className="text-sm text-slate-500">
                  @{selected.username}
                </p>
              </div>

              <DetailRow label="Email" value={selected.email} />
              <DetailRow label="Phone" value={selected.phone} />
              <DetailRow label="Role" value={getRoleLabel(selected.role)} />
              <DetailRow label="Account Status" value={selected.status} />
              <DetailRow label="Created At" value={selected.createdAt} />
            </div>

            <div className="border-t border-slate-100 p-5 text-right">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <div className={`rounded-lg p-2.5 ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-800">{value}</p>
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

function ActionButton({
  children,
  title,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${
        danger
          ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
          : "text-slate-400 hover:bg-blue-50 hover:text-blue-600"
      }`}
    >
      {children}
    </button>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[65%] text-right font-medium text-slate-700">
        {value}
      </span>
    </div>
  );
}
