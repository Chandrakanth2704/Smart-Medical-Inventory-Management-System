
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  Mail,
  Pill,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/auth/login${window.location.search}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            username: normalizedEmail,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to sign in. Please try again.");
        return;
      }

      if (data.redirectTo) {
        router.replace(data.redirectTo);
        router.refresh();
      } else {
        setError(
          "Login succeeded, but the destination could not be determined."
        );
      }
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Left branding panel */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#0B1F3A] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-40 -top-40 h-[550px] w-[550px] rounded-full border border-white/10" />
        <div className="absolute -right-20 -top-20 h-[390px] w-[390px] rounded-full border border-white/10" />
        <div className="absolute -bottom-48 -left-40 h-[520px] w-[520px] rounded-full bg-[#0D9488]/15 blur-3xl" />

        <div className="relative z-10 px-12 pt-10 xl:px-20">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0D9488] text-white shadow-lg shadow-teal-950/20">
              <Activity size={27} strokeWidth={2.5} />
            </span>

            <span>
              <span className="block text-2xl font-extrabold tracking-tight text-white">
                Hospil<span className="text-[#5EE0D0]">Logix</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                YOUR HEALTHCARE STORE
              </span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl px-12 py-12 xl:px-20">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-[#7CE5D8]">
            <Sparkles size={14} />
            A simpler way to shop healthcare
          </div>

          <h1 className="max-w-xl text-5xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-6xl">
            Your health.
            <br />
            Your essentials.
            <br />
            <span className="text-[#5EE0D0]">One destination.</span>
          </h1>

          <p className="mt-7 max-w-lg text-base leading-8 text-slate-300">
            Welcome to HospilLogix. Explore medicines, healthcare
            essentials, medical equipment and wellness products through
            one convenient digital experience.
          </p>

          <div className="mt-11 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <Pill className="text-[#5EE0D0]" size={25} />
              <h3 className="mt-4 font-bold text-white">
                Healthcare products
              </h3>
              <p className="mt-1 text-xs leading-6 text-slate-400">
                Explore products for your everyday needs.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <ShieldCheck className="text-[#5EE0D0]" size={25} />
              <h3 className="mt-4 font-bold text-white">
                Responsible access
              </h3>
              <p className="mt-1 text-xs leading-6 text-slate-400">
                Prescription requirements and pharmacist review.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between px-12 pb-9 text-xs text-slate-400 xl:px-20">
          <span>© HospilLogix. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <HeartPulse size={15} className="text-[#5EE0D0]" />
            Healthcare made simpler
          </span>
        </div>
      </section>

      {/* Right login panel */}
      <section className="flex min-h-screen flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="mb-12 inline-flex items-center gap-3 lg:hidden"
          >
            <span className="brand-mark">
              <Activity size={24} />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-[#0B1F3A]">
              Hospil<span className="text-[#0D9488]">Logix</span>
            </span>
          </Link>

          <div className="mb-9">
            <div className="mb-5 inline-grid h-12 w-12 place-items-center rounded-2xl bg-[#E8F7F4] text-[#0D9488]">
              <ShoppingBag size={24} />
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.13em] text-[#0D9488]">
              Welcome back
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-4xl">
              Sign in to your account
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              Enter your account details to continue to HospilLogix.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-[#243B53]"
              >
                Email address or username
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email or username"
                  disabled={loading}
                  suppressHydrationWarning
                  className="h-[54px] w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-[#0B1F3A] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0D9488] focus:ring-4 focus:ring-[#0D9488]/10 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-[#243B53]"
                >
                  Password
                </label>
              </div>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="h-[54px] w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-sm text-[#0B1F3A] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0D9488] focus:ring-4 focus:ring-[#0D9488]/10 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#0D9488]"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-[54px] w-full items-center justify-center gap-3 rounded-xl bg-[#0D9488] px-5 text-sm font-bold text-white shadow-lg shadow-teal-900/10 transition hover:-translate-y-0.5 hover:bg-[#087d75] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">
              SECURE ACCOUNT ACCESS
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-[#0D9488]"
              />
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">
                  Your account, your access
                </h3>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  Your account permissions determine which HospilLogix
                  workspace you can access after signing in.
                </p>
              </div>
            </div>
          </div>

          {/* Customer registration and store links */}
          <div className="mt-8 space-y-3 text-center">
            <p className="text-sm text-slate-500">
              New to HospilLogix?{" "}
              <Link
                href="/register"
                className="font-bold text-[#0D9488] transition hover:text-[#087d75]"
              >
                Create an account
              </Link>
            </p>

            <p className="text-sm text-slate-500">
              Want to browse first?{" "}
              <Link
                href="/"
                className="font-bold text-[#0D9488] transition hover:text-[#087d75]"
              >
                Explore our store
              </Link>
            </p>
          </div>

          <p className="mt-12 text-center text-xs text-slate-400">
            By signing in, you agree to use the platform responsibly.
          </p>
        </div>
      </section>
    </main>
  );
}
