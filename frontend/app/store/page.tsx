
import FloatingCartBar from "./floating-cart-bar";
import StoreAccountMenu from "./store-account-menu";
import MedicineImageGallery from "./medicine-image-gallery";
import Link from "next/link";
import { connection } from "next/server";
import type { RowDataPacket } from "mysql2";
import {
  Activity,
  ArrowLeft,
  Search,
  ShoppingCart,
  Pill,
  SlidersHorizontal,
  ChevronDown,
  Package,
  ShieldCheck,
  Heart,
} from "lucide-react";
import { pool } from "@/lib/mysql";
import { getSession } from "@/lib/auth";
import { getMongoDb } from "@/lib/mongodb";
import AddToCartButton from "./add-to-cart-button";
import SaveToWishlistButton from "./save-to-wishlist-button";

export const instant = false;

interface MedicineRow extends RowDataPacket {
  MedicineID: number;
  MedicineName: string;
  GenericName: string | null;
  Manufacturer: string | null;
  Strength: string | null;
  DosageForm: string | null;
  SellingPrice: number;
  Description: string | null;
  CategoryName: string;
  AvailableQuantity: number;
}

interface CategoryRow extends RowDataPacket {
  CategoryID: number;
  CategoryName: string;
}

interface ProfileCompletionRow extends RowDataPacket {
  CustomerName: string | null;
  Email: string | null;
  Phone: string | null;
  DateOfBirth: string | Date | null;
  AddressLine: string | null;
  City: string | null;
  State: string | null;
  PostalCode: string | null;
}

interface MedicinesPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
  }>;
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function calculateProfileCompletion(
  profile: ProfileCompletionRow | undefined
): number {
  if (!profile) {
    return 0;
  }

  const fields = [
    profile.CustomerName,
    profile.Email,
    profile.Phone,
    profile.DateOfBirth,
    profile.AddressLine,
    profile.City,
    profile.State,
    profile.PostalCode,
  ];

  const completedFields = fields.filter(
    (value) =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
  ).length;

  return Math.round((completedFields / fields.length) * 100);
}

export default async function MedicinesPage({
  searchParams,
}: MedicinesPageProps) {
  await connection();

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const categoryValue = params.category ?? "";

  const categoryId = /^\d+$/.test(categoryValue)
    ? Number(categoryValue)
    : null;

  const session = await getSession();

  let profileCompletion = 0;

  if (session?.role === "CUSTOMER") {
    const [profileRows] = await pool.execute<ProfileCompletionRow[]>(
      `SELECT
         CustomerName,
         Email,
         Phone,
         DateOfBirth,
         AddressLine,
         City,
         State,
         PostalCode
       FROM customers
       WHERE UserID = ?
         AND Status = 'ACTIVE'
       LIMIT 1`,
      [session.userId]
    );

    profileCompletion = calculateProfileCompletion(profileRows[0]);
  }

  const [categories] = await pool.execute<CategoryRow[]>(
    `SELECT CategoryID, CategoryName
     FROM categories
     WHERE Status = 'ACTIVE'
     ORDER BY CategoryName`
  );

  const conditions = ["m.Status = 'ACTIVE'"];
  const queryParams: (string | number)[] = [];

  if (search) {
    conditions.push(
      "(m.MedicineName LIKE ? OR m.GenericName LIKE ? OR m.Manufacturer LIKE ?)"
    );

    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (categoryId !== null) {
    conditions.push("m.CategoryID = ?");
    queryParams.push(categoryId);
  }

  const [medicines] = await pool.execute<MedicineRow[]>(
    `SELECT
       m.MedicineID,
       m.MedicineName,
       m.GenericName,
       m.Manufacturer,
       m.Strength,
       m.DosageForm,
       m.SellingPrice,
       m.Description,
       c.CategoryName,
       COALESCE(s.AvailableQuantity, 0) AS AvailableQuantity
     FROM medicines m
     INNER JOIN categories c
       ON c.CategoryID = m.CategoryID
     LEFT JOIN (
       SELECT
         MedicineID,
         SUM(Quantity) AS AvailableQuantity
       FROM stock
       WHERE ExpiryDate >= CURDATE()
       GROUP BY MedicineID
     ) s ON s.MedicineID = m.MedicineID
     WHERE ${conditions.join(" AND ")}
     ORDER BY m.MedicineName`,
    queryParams
  );

  // Retrieve all medicine images from MongoDB.
  const medicineImageUrls = new Map<string, string[]>();

  try {
    if (medicines.length > 0) {
      const db = await getMongoDb();

      const medicineIds = medicines.map((medicine) =>
        String(medicine.MedicineID)
      );

      const imageRows = await db
        .collection("medicine_images")
        .find({
          medicineId: { $in: medicineIds },
        })
        .sort({
          isPrimary: -1,
          displayOrder: 1,
          createdAt: -1,
        })
        .toArray();

      for (const image of imageRows) {
        const medicineId = String(image.medicineId);

        if (!image.fileId) {
          continue;
        }

        const imageUrl = `/api/medicines/${medicineId}/images/${image.fileId.toString()}`;

        const existingImages = medicineImageUrls.get(medicineId) ?? [];

        existingImages.push(imageUrl);

        medicineImageUrls.set(medicineId, existingImages);
      }
    }
  } catch (error) {
    console.error("Store medicine image fetch error:", error);
  }

  return (
    <main className="min-h-screen bg-[#F5F8FB]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B1F3A] text-white shadow-sm">
              <Activity size={23} />
            </span>

            <span className="leading-tight">
              <span className="block text-xl font-extrabold tracking-tight text-[#0B1F3A]">
                Hospil<span className="text-[#0D9488]">Logix</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-[0.13em] text-slate-500">
                YOUR HEALTHCARE STORE
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-[#0D9488] sm:flex"
            >
              <ArrowLeft size={16} />
              Home
            </Link>

            <Link
              href="/wishlist"
              aria-label="My Wishlist"
              title="My Wishlist"
              className="flex items-center gap-2 rounded-xl p-2.5 text-slate-700 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <Heart size={21} strokeWidth={1.8} />
              <span className="hidden text-sm font-semibold sm:inline">
                Wishlist
              </span>
            </Link>

            <Link
              href="/cart"
              aria-label="Shopping cart"
              title="Shopping cart"
              className="flex items-center justify-center rounded-xl p-2.5 text-slate-700 transition hover:bg-teal-50 hover:text-[#0D9488]"
            >
              <ShoppingCart size={21} strokeWidth={1.8} />
            </Link>

            <StoreAccountMenu profileCompletion={profileCompletion} />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0B1F3A] px-5 py-16 text-white">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-xs font-bold tracking-wide text-[#5EE0D0]">
            <ShieldCheck size={15} />
            HOSPILLOGIX ONLINE STORE
          </div>

          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Your Healthcare,
            <span className="block text-[#5EE0D0]">
              Just a Click Away.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Explore our medicine catalogue, compare product information,
            and conveniently add the medicines you need to your cart.
          </p>

          <div className="mt-7 flex flex-wrap gap-3 text-xs font-semibold text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
              <Package size={15} />
              Browse medicines
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
              <ShoppingCart size={15} />
              Easy shopping
            </span>
            <Link
              href="/wishlist"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 transition hover:bg-white/20"
            >
              <Heart size={15} />
              Save favourites
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10">
        <form
          method="GET"
          action="/store"
          className="mb-9 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#0B1F3A]">
              Find Your Medicines
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search by medicine name or filter by category.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_280px_auto]">
            <label className="relative block">
              <span className="sr-only">Search medicines</span>
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder="Search medicine, generic name or manufacturer"
                className="min-h-13 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0D9488] focus:bg-white focus:ring-4 focus:ring-teal-50"
              />
            </label>

            <label className="relative block">
              <span className="sr-only">Filter by category</span>
              <SlidersHorizontal
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#0D9488]"
              />
              <select
                name="category"
                defaultValue={categoryValue}
                aria-label="Filter medicines by category"
                className="min-h-13 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm font-semibold text-slate-700 outline-none transition hover:border-[#0D9488] hover:bg-white focus:border-[#0D9488] focus:bg-white focus:ring-4 focus:ring-teal-50"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option
                    key={category.CategoryID}
                    value={category.CategoryID}
                  >
                    {category.CategoryName}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </label>

            <button
              type="submit"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#0D9488] px-7 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#087d75] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-teal-100 active:translate-y-0"
            >
              <Search size={17} />
              Search
            </button>
          </div>
        </form>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0D9488]">
              Our Catalogue
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#0B1F3A]">
              Available Products
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {medicines.length}{" "}
              {medicines.length === 1 ? "product" : "products"} found
            </p>
          </div>

          {(search || categoryValue) && (
            <Link
              href="/store"
              className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-bold text-[#0D9488] transition hover:border-[#0D9488] hover:bg-teal-100"
            >
              Clear filters
            </Link>
          )}
        </div>

        {medicines.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {medicines.map((medicine) => {
              const availableQuantity = Number(
                medicine.AvailableQuantity
              );
              const inStock = availableQuantity > 0;
              const detailsHref = `/store/${medicine.MedicineID}`;

              const imageUrls =
                medicineImageUrls.get(String(medicine.MedicineID)) ?? [];

              return (
                <article
                  key={medicine.MedicineID}
                  className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-slate-200/60"
                >
                  <MedicineImageGallery
                    imageUrls={imageUrls}
                    medicineName={medicine.MedicineName}
                    categoryName={medicine.CategoryName}
                    detailsHref={detailsHref}
                  />

                  <div className="p-5">
                    <div className="flex items-center justify-end">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                          inStock ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            inStock ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {inStock ? "Available" : "Out of stock"}
                      </span>
                    </div>

                    <Link href={detailsHref} className="block">
                      <h3 className="mt-3 line-clamp-2 min-h-12 text-base font-bold leading-6 text-[#0B1F3A] transition hover:text-[#0D9488]">
                        {medicine.MedicineName}
                      </h3>
                    </Link>

                    <p className="mt-1 min-h-5 truncate text-xs text-slate-500">
                      {medicine.GenericName ||
                        "Generic name not specified"}
                    </p>

                    <div className="mt-4 min-h-[68px] space-y-1.5 text-xs text-slate-500">
                      {medicine.Strength && (
                        <p>Strength: {medicine.Strength}</p>
                      )}
                      {medicine.DosageForm && (
                        <p>Form: {medicine.DosageForm}</p>
                      )}
                      {medicine.Manufacturer && (
                        <p className="truncate">
                          Manufacturer: {medicine.Manufacturer}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-lg font-extrabold text-[#0B1F3A]">
                        {currency.format(Number(medicine.SellingPrice))}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {inStock
                          ? `${availableQuantity} available`
                          : "Out of stock"}
                      </span>
                    </div>

                    <Link
                      href={detailsHref}
                      className="mt-4 flex min-h-10 w-full items-center justify-center rounded-xl border border-[#0D9488] bg-white px-4 text-sm font-bold text-[#0D9488] transition hover:bg-teal-50"
                    >
                      View Details
                    </Link>

                    <AddToCartButton
                      medicine={{
                        medicineId: Number(medicine.MedicineID),
                        medicineName: medicine.MedicineName,
                        genericName: medicine.GenericName,
                        strength: medicine.Strength,
                        sellingPrice: Number(medicine.SellingPrice),
                        availableQuantity,
                      }}
                    />

                    <SaveToWishlistButton
                      medicineId={Number(medicine.MedicineID)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-[#0D9488]">
              <Pill size={30} />
            </span>

            <h3 className="mt-5 text-xl font-bold text-[#0B1F3A]">
              {search || categoryValue
                ? "No matching medicines found"
                : "Our catalogue is being updated"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
              {search || categoryValue
                ? "Try a different search term or select another category."
                : "There are currently no active medicines to display. Please check back after products have been added."}
            </p>

            {(search || categoryValue) && (
              <Link
                href="/store"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#0D9488] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#087d75] hover:shadow-md"
              >
                View all medicines
              </Link>
            )}
          </div>
        )}

        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 p-5">
          <ShieldCheck
            size={20}
            className="mt-0.5 shrink-0 text-[#0D9488]"
          />
          <p className="text-xs leading-6 text-slate-600">
            Prescription medicines are subject to applicable prescription
            requirements and pharmacist review. Please consult a qualified
            healthcare professional before using medicines.
          </p>
        </div>
      </section>

      <FloatingCartBar />

      <footer className="border-t border-slate-200 bg-white px-5 py-7">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row">
          <p>© HospilLogix. All rights reserved.</p>
          <Link
            href="/"
            className="font-semibold transition hover:text-[#0D9488]"
          >
            Return to homepage
          </Link>
        </div>
      </footer>
    </main>
  );
}
