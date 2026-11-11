
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { RowDataPacket } from "mysql2";
import {
  Activity,
  ArrowLeft,
  ShoppingCart,
  Pill,
  Package,
  ShieldCheck,
  Truck,
  Info,
  Heart,
} from "lucide-react";
import { pool } from "@/lib/mysql";
import { getMongoDb } from "@/lib/mongodb";
import MedicineImageGallery from "../medicine-image-gallery";
import AddToCartButton from "../add-to-cart-button";
import SaveToWishlistButton from "../save-to-wishlist-button";
import FloatingCartBar from "../floating-cart-bar";
import StoreAccountMenu from "../store-account-menu";

export const instant = false;

interface MedicineDetailsRow extends RowDataPacket {
  MedicineID: number;
  MedicineName: string;
  GenericName: string | null;
  Manufacturer: string | null;
  Strength: string | null;
  DosageForm: string | null;
  Unit: string;
  SellingPrice: number;
  StorageCondition: string | null;
  Description: string | null;
  CategoryName: string;
  AvailableQuantity: number;
}

interface MedicineImageDocument {
  medicineId: string;
  fileId: {
    toString(): string;
  };
  isPrimary: boolean;
  displayOrder?: number;
  createdAt?: Date;
}

interface MedicineDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default async function MedicineDetailsPage({
  params,
}: MedicineDetailsPageProps) {
  await connection();

  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  const [medicineRows] = await pool.execute<MedicineDetailsRow[]>(
    `SELECT
       m.MedicineID,
       m.MedicineName,
       m.GenericName,
       m.Manufacturer,
       m.Strength,
       m.DosageForm,
       m.Unit,
       m.SellingPrice,
       m.StorageCondition,
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
     WHERE m.MedicineID = ?
       AND m.Status = 'ACTIVE'
       AND c.Status = 'ACTIVE'
     LIMIT 1`,
    [id]
  );

  const medicine = medicineRows[0];

  if (!medicine) {
    notFound();
  }

  // Retrieve all medicine images from MongoDB.
  let imageUrls: string[] = [];

  try {
    const db = await getMongoDb();

    const images = await db
      .collection<MedicineImageDocument>("medicine_images")
      .find({
        medicineId: String(medicine.MedicineID),
      })
      .sort({
        isPrimary: -1,
        displayOrder: 1,
        createdAt: -1,
      })
      .toArray();

    imageUrls = images
      .filter((image) => image.fileId)
      .map(
        (image) =>
          `/api/medicines/${medicine.MedicineID}/images/${image.fileId.toString()}`
      );
  } catch (error) {
    console.error("Fetch medicine images error:", error);
  }

  const availableQuantity = Number(medicine.AvailableQuantity);
  const inStock = availableQuantity > 0;

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
              href="/store"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-[#0D9488]"
            >
              <ArrowLeft size={16} />
              Store
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
              className="rounded-xl p-2.5 text-slate-700 transition hover:bg-teal-50 hover:text-[#0D9488]"
            >
              <ShoppingCart size={21} />
            </Link>

            <StoreAccountMenu profileCompletion={0} />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-7">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0D9488]"
          >
            <ArrowLeft size={16} />
            Back to medicines
          </Link>

          <div className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#0D9488]">
            Medicine Information
          </div>

          <h1 className="mt-2 text-2xl font-extrabold text-[#0B1F3A] sm:text-3xl">
            {medicine.MedicineName}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {medicine.CategoryName}
          </p>
        </div>

        <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {imageUrls.length > 0 ? (
              <div className="p-3">
                <MedicineImageGallery
                  imageUrls={imageUrls}
                  medicineName={medicine.MedicineName}
                  categoryName={medicine.CategoryName}
                  detailsHref={`/store/${medicine.MedicineID}`}
                  variant="details"
                />
              </div>
            ) : (
              <div className="flex min-h-[340px] items-center justify-center bg-gradient-to-br from-[#E9F7F5] via-[#F4FAFA] to-[#EDF2F8] p-8">
                <div className="grid h-36 w-36 place-items-center rounded-3xl border border-white bg-white/90 text-[#0D9488] shadow-lg">
                  <Pill size={76} strokeWidth={1.3} />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#0D9488]">
                {medicine.CategoryName}
              </span>

              <span
                className={`inline-flex items-center gap-2 text-sm font-bold ${
                  inStock ? "text-emerald-600" : "text-rose-500"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    inStock ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-[#0B1F3A]">
              {medicine.MedicineName}
            </h2>

            {medicine.GenericName && (
              <p className="mt-2 text-sm text-slate-500">
                Generic name: {medicine.GenericName}
              </p>
            )}

            <div className="mt-6 border-y border-slate-100 py-5">
              <p className="text-sm font-semibold text-slate-500">
                Selling Price
              </p>

              <p className="mt-1 text-3xl font-extrabold text-[#0D9488]">
                {currency.format(Number(medicine.SellingPrice))}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Per {medicine.Unit || "unit"}
              </p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Strength
                </p>
                <p className="mt-1 text-sm font-bold text-[#0B1F3A]">
                  {medicine.Strength || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Dosage Form
                </p>
                <p className="mt-1 text-sm font-bold text-[#0B1F3A]">
                  {medicine.DosageForm || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Manufacturer
                </p>
                <p className="mt-1 text-sm font-bold text-[#0B1F3A]">
                  {medicine.Manufacturer || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Available Quantity
                </p>
                <p className="mt-1 text-sm font-bold text-[#0B1F3A]">
                  {availableQuantity} {medicine.Unit || "units"}
                </p>
              </div>
            </div>

            <div className="mt-7">
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

            <p className="mt-4 text-xs leading-6 text-slate-500">
              Stock availability is calculated using quantities from
              non-expired stock batches.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-[#0D9488]">
                <Info size={20} />
              </span>

              <h2 className="text-lg font-bold text-[#0B1F3A]">
                About this Medicine
              </h2>
            </div>

            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">
              {medicine.Description ||
                "No description is currently available for this medicine."}
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Package size={20} />
              </span>

              <h2 className="text-lg font-bold text-[#0B1F3A]">
                Storage and Availability
              </h2>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Storage Condition
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {medicine.StorageCondition ||
                    "Storage information not specified."}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Current Stock
                </p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {availableQuantity} {medicine.Unit || "units"} available
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-teal-50 p-4">
                <Truck
                  size={19}
                  className="mt-0.5 shrink-0 text-[#0D9488]"
                />
                <p className="text-xs leading-6 text-slate-600">
                  Stock quantities are updated based on the inventory
                  records maintained by HospilLogix.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <ShieldCheck
            size={20}
            className="mt-0.5 shrink-0 text-amber-600"
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
