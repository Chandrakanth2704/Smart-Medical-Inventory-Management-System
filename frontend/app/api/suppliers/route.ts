import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { pool } from "@/lib/mysql";

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(150),
  contactPerson: z.string().trim().min(1, "Contact person is required").max(100),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Enter a valid 10-digit phone number"),
  email: z.string().trim().email("Enter a valid email address").max(150),
  address: z.string().trim().min(1, "Address is required"),
  status: z.enum(["Active", "Inactive"]),
});

function isDuplicateEntry(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}

export async function GET() {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        { message: "You are not authorized to access suppliers." },
        { status: 403 }
      );
    }

    const [rows] = await pool.execute(
      `SELECT
         CAST(SupplierID AS CHAR) AS id,
         SupplierName AS name,
         COALESCE(ContactPerson, '') AS contactPerson,
         COALESCE(Phone, '') AS phone,
         COALESCE(Email, '') AS email,
         COALESCE(Address, '') AS address,
         CASE
           WHEN Status = 'ACTIVE' THEN 'Active'
           ELSE 'Inactive'
         END AS status
       FROM suppliers
       ORDER BY SupplierID DESC`
    );

    return NextResponse.json({ suppliers: rows });
  } catch (error) {
    console.error("GET suppliers error:", error);

    return NextResponse.json(
      { message: "Unable to load suppliers." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        { message: "You are not authorized to add suppliers." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = supplierSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: validation.error.issues[0]?.message || "Invalid supplier details.",
        },
        { status: 400 }
      );
    }

    const supplier = validation.data;

    const [result]: any = await pool.execute(
      `INSERT INTO suppliers
        (SupplierName, ContactPerson, Phone, Email, Address, Status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        supplier.name,
        supplier.contactPerson,
        supplier.phone,
        supplier.email,
        supplier.address,
        supplier.status === "Active" ? "ACTIVE" : "INACTIVE",
      ]
    );

    return NextResponse.json(
      {
        message: "Supplier added successfully.",
        supplier: {
          id: String(result.insertId),
          ...supplier,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return NextResponse.json(
        { message: "A supplier with this email already exists." },
        { status: 409 }
      );
    }

    console.error("POST supplier error:", error);

    return NextResponse.json(
      { message: "Unable to add supplier." },
      { status: 500 }
    );
  }
}
