
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import {
  Activity,
  LayoutDashboard,
  Pill,
  ShoppingCart,
  Receipt,
  Truck,
  ChartNoAxesCombined,
  Users,
  Menu,
  ChevronDown,
  KeyRound,
  LogOut,
  LoaderCircle,
  X,
  ShieldCheck,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  Moon,
  Command,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";

interface DashboardShellProps {
  children: ReactNode;
  fullName: string;
  email: string;
}

const navigation = [
  {
    section: "OVERVIEW",
    items: [
      {
        name: "Dashboard",
        description: "Inventory overview",
        href: "/inventory",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    section: "INVENTORY",
    items: [
      {
        name: "Medicines",
        description: "Medicine catalogue",
        href: "/medicines",
        icon: Pill,
      },
      {
        name: "Suppliers",
        description: "Supplier directory",
        href: "/suppliers",
        icon: Truck,
      },
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      {
        name: "Purchases",
        description: "Purchase management",
        href: "/purchases",
        icon: ShoppingCart,
      },
      {
        name: "Sales",
        description: "Sales management",
        href: "/sales",
        icon: Receipt,
      },
    ],
  },
  {
    section: "MANAGEMENT",
    items: [
      {
        name: "Reports & Analytics",
        description: "Business insights",
        href: "/reports",
        icon: ChartNoAxesCombined,
      },
      {
        name: "Orders",
        description: "Manage Orders from Customers",
        href: "/users",
        icon: Users,
      },
    ],
  },
];

const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
};

export default function DashboardShell({
  children,
  fullName,
  email,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const initial = fullName.trim().charAt(0).toUpperCase() || "?";

  const allItems = useMemo(
    () => navigation.flatMap((section) => section.items),
    []
  );

  const currentPage =
    allItems.find(
      (item) =>
        pathname === item.href ||
        pathname.startsWith(`${item.href}/`)
    )?.name ?? "Administration";

  const filteredItems = allItems.filter((item) =>
    item.name.toLowerCase().includes(commandQuery.toLowerCase())
  );

  const isActive = (href: string) => {
    return (
      pathname === href ||
      (href !== "/inventory" && pathname.startsWith(`${href}/`))
    );
  };

  // Load saved theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("hospillogix-theme");
    const enabled = savedTheme === "dark";

    setDarkMode(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
        setProfileOpen(false);
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  // Reset command search when opened
  useEffect(() => {
    if (commandOpen) {
      setCommandQuery("");
    }
  }, [commandOpen]);

  function toggleTheme() {
    const nextTheme = !darkMode;

    setDarkMode(nextTheme);

    document.documentElement.classList.toggle(
      "dark",
      nextTheme
    );

    localStorage.setItem(
      "hospillogix-theme",
      nextTheme ? "dark" : "light"
    );
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  function navigateTo(href: string) {
    setCommandOpen(false);
    setSidebarOpen(false);
    setProfileOpen(false);
    router.push(href);
  }

  return (
    <div className="min-h-screen bg-[#f5f8fb] text-slate-800 transition-colors duration-200 dark:bg-[#0b1220] dark:text-slate-100">

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            type="button"
            aria-label="Close navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-hidden border-r border-slate-200/80 bg-white text-slate-800 shadow-[8px_0_30px_rgba(15,23,42,0.035)] transition-[width,transform] duration-300 dark:border-slate-800 dark:bg-[#111c2d] dark:text-slate-100 ${
          collapsed ? "lg:w-[88px]" : "lg:w-[264px]"
        } ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          sidebarHidden
            ? "lg:-translate-x-full"
            : "lg:translate-x-0"
        }`}
      >

        {/* Brand */}
        <div className="relative flex h-[82px] shrink-0 items-center border-b border-slate-100 px-5 dark:border-slate-800">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-600/20">
            <Activity size={23} strokeWidth={2.2} />
          </div>

          <motion.div
            initial={false}
            animate={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : "auto",
            }}
            className="ml-3 min-w-0 flex-1 overflow-hidden lg:block"
          >
            <h1 className="whitespace-nowrap text-[19px] font-extrabold tracking-tight text-[#102a43] dark:text-white">
              Hospil<span className="text-teal-600 dark:text-teal-400">Logix</span>
            </h1>

            <p className="mt-0.5 whitespace-nowrap text-[9px] font-bold tracking-[0.18em] text-slate-400">
              SMART MEDICAL SYSTEM
            </p>
          </motion.div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="ml-auto rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Workspace card */}
        <div className="px-4 pb-4 pt-5">
          <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#102a43] via-[#153e5b] to-[#087e83] p-3.5 text-white shadow-lg shadow-slate-900/10 ${
              collapsed ? "lg:flex lg:justify-center" : ""
            }`}
          >
            <div className="pointer-events-none absolute -right-5 -top-7 h-24 w-24 rounded-full border-[12px] border-white/[0.06]" />
            <div className="pointer-events-none absolute -bottom-9 right-9 h-20 w-20 rounded-full bg-teal-400/10 blur-xl" />

            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <ShieldCheck size={20} className="text-teal-200" />
              </div>

              <div
                className={`min-w-0 ${
                  collapsed ? "lg:hidden" : ""
                }`}
              >
                <p className="whitespace-nowrap text-[12px] font-bold tracking-wide">
                  Admin Workspace
                </p>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <p className="whitespace-nowrap text-[10px] font-medium text-teal-100/80">
                    Management portal
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 pb-5 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {navigation.map((section) => (
            <div key={section.section}>

              <div
                className={`mb-2.5 flex items-center px-3 ${
                  collapsed ? "lg:hidden" : ""
                }`}
              >
                <p className="whitespace-nowrap text-[9px] font-extrabold tracking-[0.17em] text-slate-400 dark:text-slate-500">
                  {section.section}
                </p>

                <div className="ml-3 h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 transition-all duration-200 ${
                        collapsed ? "lg:justify-center" : ""
                      } ${
                        active
                          ? "bg-teal-50 text-teal-800 dark:bg-teal-400/10 dark:text-teal-300"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active-indicator"
                          className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-teal-600 dark:bg-teal-400"
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : {
                                  type: "spring",
                                  stiffness: 380,
                                  damping: 32,
                                }
                          }
                        />
                      )}

                      <span
                        className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                          active
                            ? "bg-teal-600 text-white shadow-md shadow-teal-600/20 dark:bg-teal-500"
                            : "bg-slate-100/80 text-slate-500 group-hover:bg-white group-hover:text-teal-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-teal-300"
                        }`}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </span>

                      <div
                        className={`relative z-10 min-w-0 flex-1 ${
                          collapsed ? "lg:hidden" : ""
                        }`}
                      >
                        <p
                          className={`truncate whitespace-nowrap text-[12px] ${
                            active ? "font-bold" : "font-semibold"
                          }`}
                        >
                          {item.name}
                        </p>

                        <p
                          className={`mt-0.5 truncate whitespace-nowrap text-[9px] ${
                            active
                              ? "text-teal-700/70 dark:text-teal-300/70"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>

                      {!collapsed && active && (
                        <ChevronRight
                          size={15}
                          className="relative z-10 shrink-0 text-teal-600 dark:text-teal-400"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar bottom section */}
        <div className="flex shrink-0 justify-center border-t border-slate-100 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-teal-50 hover:text-teal-700 dark:text-slate-400 dark:hover:bg-teal-500/10 dark:hover:text-teal-300"
          >
            {collapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>
        </div>
      </motion.aside>

      {/* Main content area */}
      <div
        className={`min-h-screen transition-[padding] duration-300 ${
          sidebarHidden
            ? "lg:pl-0"
            : collapsed
              ? "lg:pl-[88px]"
              : "lg:pl-[264px]"
        }`}
      >

        {/* Top navigation bar */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-[#111c2d]/90 sm:px-7">

          <div className="flex min-w-0 items-center gap-3">

            {/* Mobile sidebar toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu size={19} />
            </button>

            {/* Desktop sidebar open / close */}
            <button
              type="button"
              onClick={() => setSidebarHidden((hidden) => !hidden)}
              aria-label={
                sidebarHidden ? "Open sidebar" : "Close sidebar"
              }
              title={
                sidebarHidden ? "Open sidebar" : "Close sidebar"
              }
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-300 lg:flex"
            >
              {sidebarHidden ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </button>

            <div className="min-w-0">
              <p className="text-[9px] font-bold tracking-[0.15em] text-slate-400">
                HOSPILLOGIX / ADMINISTRATION
              </p>

              <h2 className="mt-1 truncate text-[16px] font-bold text-[#102a43] dark:text-white">
                {currentPage}
              </h2>
            </div>
          </div>

          <div className="ml-3 flex items-center gap-2 sm:gap-3">

            {/* Command search */}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-500 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Open search and navigation"
            >
              <Search size={16} />

              <span className="hidden text-xs sm:inline">
                Search pages
              </span>

              <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-600 dark:bg-slate-700 sm:inline">
                Ctrl K
              </kbd>
            </button>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                darkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={darkMode ? "moon" : "sun"}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, rotate: -35, scale: 0.7 }
                  }
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, rotate: 35, scale: 0.7 }
                  }
                  transition={{
                    duration: reduceMotion ? 0 : 0.16,
                  }}
                >
                  {darkMode ? (
                    <Moon size={17} />
                  ) : (
                    <Sun size={17} />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>

            {/* Profile menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-label="Open administrator profile"
                aria-expanded={profileOpen}
                className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800 sm:gap-3"
              >
                <div className="hidden text-right sm:block">
                  <p className="max-w-36 truncate text-xs font-bold text-slate-800 dark:text-white">
                    {fullName}
                  </p>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Administrator
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#102a43] to-teal-700 text-sm font-bold text-white shadow-md">
                  {initial}
                </div>

                <ChevronDown
                  size={15}
                  className={`hidden text-slate-400 transition-transform sm:block ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close profile menu"
                      onClick={() => setProfileOpen(false)}
                      className="fixed inset-0 z-40 cursor-default"
                    />

                    <motion.div
                      initial={
                        reduceMotion
                          ? false
                          : { opacity: 0, y: 8, scale: 0.97 }
                      }
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={
                        reduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: 8, scale: 0.97 }
                      }
                      transition={{
                        duration: reduceMotion ? 0 : 0.16,
                      }}
                      className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-[#172438]"
                    >
                      <div className="border-b border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#102a43] font-bold text-white">
                            {initial}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800 dark:text-white">
                              {fullName}
                            </p>

                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {email}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                          <ShieldCheck size={13} />
                          ADMINISTRATOR
                        </div>
                      </div>

                      <div className="p-2">
                        <Link
                          href="/settings"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Settings size={17} className="text-slate-400" />
                          Account Settings
                          <ArrowUpRight
                            size={14}
                            className="ml-auto text-slate-400"
                          />
                        </Link>

                        <Link
                          href="/change-password"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <KeyRound size={17} className="text-slate-400" />
                          Change Password
                          <ArrowUpRight
                            size={14}
                            className="ml-auto text-slate-400"
                          />
                        </Link>

                        <button
                          type="button"
                          disabled={loggingOut}
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-400/10"
                        >
                          {loggingOut ? (
                            <LoaderCircle
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <LogOut size={17} />
                          )}

                          {loggingOut ? "Logging out..." : "Logout"}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto min-h-[calc(100vh-76px)] w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{
                duration: reduceMotion ? 0 : 0.22,
                ease: "easeOut",
              }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-[#111c2d]">
          <div className="mx-auto flex max-w-[1800px] flex-col justify-between gap-1 text-[11px] text-slate-400 sm:flex-row">
            <p>
              HospilLogix Medical Inventory Management System
            </p>

            <p>Administration Workspace</p>
          </div>
        </footer>
      </div>

      {/* Command palette */}
      <AnimatePresence>
        {commandOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/50 px-4 pt-[15vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setCommandOpen(false);
              }
            }}
          >
            <motion.div
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, y: -15, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -10, scale: 0.98 }
              }
              transition={{
                duration: reduceMotion ? 0 : 0.18,
              }}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#172438]"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-700">
                <Search
                  size={19}
                  className="shrink-0 text-slate-400"
                />

                <input
                  autoFocus
                  value={commandQuery}
                  onChange={(event) =>
                    setCommandQuery(event.target.value)
                  }
                  placeholder="Search admin pages..."
                  className="h-14 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white"
                />

                <kbd className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-400 dark:border-slate-600">
                  ESC
                </kbd>
              </div>

              <div className="max-h-[340px] overflow-y-auto p-2">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Navigation
                </p>

                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => navigateTo(item.href)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-teal-50 hover:text-teal-800 dark:text-slate-200 dark:hover:bg-teal-400/10 dark:hover:text-teal-200"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          <Icon size={17} />
                        </span>

                        <span className="flex-1">
                          {item.name}
                        </span>

                        <ArrowUpRight
                          size={15}
                          className="text-slate-400"
                        />
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-8 text-center text-sm text-slate-400">
                    No matching pages found.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 text-[10px] text-slate-400 dark:border-slate-700 dark:bg-slate-800/60">
                <span>HospilLogix quick navigation</span>

                <span className="flex items-center gap-1">
                  <Command size={12} /> K to open
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
