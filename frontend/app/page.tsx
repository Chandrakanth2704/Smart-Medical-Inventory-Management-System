import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  HeartPulse,
  Pill,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Thermometer,
  Truck,
  UserRound,
  Activity,
  Sparkles,
} from "lucide-react";

const categories = [
  {
    icon: Pill,
    title: "Medicines",
    description: "Explore medicines for your healthcare needs.",
  },
  {
    icon: HeartPulse,
    title: "Healthcare Essentials",
    description: "Everyday healthcare and personal care essentials.",
  },
  {
    icon: Stethoscope,
    title: "Medical Equipment",
    description: "Medical devices and healthcare equipment.",
  },
  {
    icon: Thermometer,
    title: "Health Monitoring",
    description: "Products to help monitor your health.",
  },
  {
    icon: Sparkles,
    title: "Wellness & Nutrition",
    description: "Explore wellness and nutrition products.",
  },
  {
    icon: ShieldCheck,
    title: "Personal Care",
    description: "Products for your daily personal care routine.",
  },
];

const benefits = [
  {
    icon: ShoppingBag,
    title: "A convenient shopping experience",
    description:
      "Explore healthcare products and find what you need through one convenient online destination.",
  },
  {
    icon: ShieldCheck,
    title: "Responsible medicine access",
    description:
      "Prescription medicines are subject to the appropriate prescription and pharmacist review requirements.",
  },
  {
    icon: Truck,
    title: "Order tracking",
    description:
      "Keep track of your orders and follow their progress through your customer account.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="site-header">
        <div className="site-container flex min-h-[76px] items-center justify-between gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="brand-mark">
              <Activity size={24} strokeWidth={2.5} />
            </span>

            <span className="leading-tight">
              <span className="block text-[21px] font-extrabold tracking-tight text-[#0B1F3A]">
                Hospil<span className="text-[#0D9488]">Logix</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.13em] text-slate-500">
                YOUR HEALTHCARE STORE
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#home" className="nav-link">Home</a>
            <a href="#categories" className="nav-link">Categories</a>
            <a href="#about" className="nav-link">About Us</a>
            <a href="#contact" className="nav-link">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              aria-label="My account"
              className="hidden items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0B1F3A] transition hover:border-[#0D9488] sm:flex"
            >
              <UserRound size={17} />
              My Account
            </Link>

            <Link href="/store" className="primary-button min-h-[43px] px-4">
              <ShoppingBag size={17} />
              Shop Now
            </Link>
          </div>
        </div>

        <div className="site-container flex gap-6 overflow-x-auto pb-3 md:hidden">
          <a href="#home" className="nav-link whitespace-nowrap">Home</a>
          <a href="#categories" className="nav-link whitespace-nowrap">Categories</a>
          <a href="#about" className="nav-link whitespace-nowrap">About Us</a>
          <a href="#contact" className="nav-link whitespace-nowrap">Contact</a>
        </div>
      </header>

      {/* Hero */}
      <section id="home" className="hero-section">
        <div className="site-container hero-grid">
          <div className="fade-up">
            <div className="hero-eyebrow">
              <span className="h-2 w-2 rounded-full bg-[#0D9488]" />
              Your health, our priority
            </div>

            <h1 className="hero-title">
              Healthcare made
              <br />
              <span>simpler.</span>
              <br />
              Shopping made easier.
            </h1>

            <p className="hero-description">
              Discover medicines, healthcare essentials, wellness products
              and medical equipment at HospilLogix. Your convenient online
              destination for everyday healthcare needs.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/store" className="primary-button">
                Explore Products
                <ArrowRight size={17} />
              </Link>

              <Link href="/login" className="secondary-button">
                My Account
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] font-medium text-slate-600">
              <span className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-[#0D9488]" />
                Responsible medicine access
              </span>
              <span className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-[#0D9488]" />
                Convenient online shopping
              </span>
            </div>
          </div>

          {/* Hero visual */}
          <div className="hero-visual fade-up-delay">
            <div className="hero-orbit" />

            <div className="hero-core">
              <div className="hero-core-inner">
                <HeartPulse size={68} strokeWidth={1.6} />
                <span className="hero-core-label">YOUR HEALTH MATTERS</span>
              </div>
            </div>

            <div className="floating-card one">
              <span className="floating-icon">
                <Pill size={21} />
              </span>
              <span>
                <strong>Medicines</strong>
                <span>Healthcare essentials</span>
              </span>
            </div>

            <div className="floating-card two">
              <span className="floating-icon">
                <Heart size={21} />
              </span>
              <span>
                <strong>Everyday wellness</strong>
                <span>Care for your wellbeing</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Shopping categories */}
      <section id="categories" className="section bg-white">
        <div className="site-container">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <span className="section-kicker">Explore our collection</span>
              <h2 className="section-heading">
                Shop by healthcare category
              </h2>
              <p className="section-description">
                Find products across a range of healthcare, wellness and
                personal care categories.
              </p>
            </div>

            <Link
              href="/store"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#0D9488] hover:text-[#087d75]"
            >
              Explore the store
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <Link
                  href="/store"
                  key={category.title}
                  className="info-card group block"
                >
                  <div className="flex items-start justify-between">
                    <span className="info-icon">
                      <Icon size={24} />
                    </span>

                    <ArrowUpRight
                      size={19}
                      className="text-slate-400 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#0D9488]"
                    />
                  </div>

                  <h3>{category.title}</h3>
                  <p>{category.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Shopping experience */}
      <section className="section dark-section">
        <div className="site-container">
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-kicker">The HospilLogix experience</span>
            <h2 className="section-heading">
              Healthcare shopping with convenience in mind
            </h2>
            <p className="section-description mx-auto">
              Discover a more organised way to explore healthcare products,
              manage your orders and stay connected with your purchases.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article className="dark-card" key={benefit.title}>
                  <span className="inline-grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-[#5EE0D0]">
                    <Icon size={23} />
                  </span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="section bg-[#F5F8FB]">
        <div className="site-container grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="section-kicker">About HospilLogix</span>

            <h2 className="section-heading">
              Making healthcare essentials easier to discover.
            </h2>

            <p className="section-description">
              HospilLogix is designed to bring medicines, healthcare
              essentials and wellness products together in a convenient
              online shopping experience.
            </p>

            <p className="mt-5 text-sm leading-8 text-slate-600">
              Our goal is to make finding healthcare products simpler
              while providing customers with a clear way to explore
              products, manage their accounts and follow their orders.
            </p>

            <Link href="/store" className="primary-button mt-8">
              Get Started
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-100">
              <span className="info-icon">
                <HeartPulse size={25} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-[#0B1F3A]">
                Our Mission
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Make healthcare products easier to explore and access.
              </p>
            </div>

            <div className="mt-10 rounded-2xl bg-[#0B1F3A] p-7 shadow-sm">
              <span className="inline-grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-[#5EE0D0]">
                <Sparkles size={25} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-white">
                Our Vision
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Create a convenient digital destination for everyday
                healthcare needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section id="contact" className="section bg-white">
        <div className="site-container">
          <div className="contact-panel flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <span className="section-kicker">Start exploring</span>

              <h2 className="section-heading">
                Your healthcare essentials are just a few steps away.
              </h2>

              <p className="section-description">
                Visit HospilLogix to explore the store and access your
                customer account.
              </p>
            </div>

            <Link href="/store" className="primary-button shrink-0">
              Explore HospilLogix
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="site-container py-14">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="brand-mark">
                  <Activity size={23} />
                </span>

                <span className="text-xl font-extrabold tracking-tight text-white">
                  Hospil<span className="text-[#5EE0D0]">Logix</span>
                </span>
              </Link>

              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
                Your online destination for medicines, healthcare
                essentials, wellness products and medical equipment.
              </p>
            </div>

            <div>
              <h3 className="mb-5 text-sm font-bold text-white">
                Explore
              </h3>

              <div className="flex flex-col items-start gap-3">
                <a className="footer-link" href="#home">Home</a>
                <a className="footer-link" href="#categories">Categories</a>
                <a className="footer-link" href="#about">About Us</a>
                <a className="footer-link" href="#contact">Contact</a>
              </div>
            </div>

            <div>
              <h3 className="mb-5 text-sm font-bold text-white">
                Customer
              </h3>

              <div className="flex flex-col items-start gap-3">
                <Link className="footer-link" href="/login">
                  My Account
                </Link>
                <Link className="footer-link" href="/orders">
                  My Orders
                </Link>
                <Link className="footer-link" href="/store">
                  Shop Products
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
            <p>© HospilLogix. All rights reserved.</p>
            <p>Healthcare and wellness, made more convenient.</p>
          </div>

          <p className="mt-5 max-w-4xl text-[11px] leading-6 text-slate-500">
            Prescription medicines are subject to applicable prescription
            requirements and pharmacist review. Product availability and
            purchasing options depend on the services enabled on the platform.
          </p>
        </div>
      </footer>
    </main>
  );
}
