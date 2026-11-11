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

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isDuplicateEntry(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}

function isForeignKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_ROW_IS_REFERENCED_2"
  );
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        { message: "You are not authorized to update suppliers." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!/^[0-9]+$/.test(id)) {
      return NextResponse.json(
        { message: "Invalid supplier ID." },
        { status: 400 }
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

    const [existing]: any = await pool.execute(
      "SELECT SupplierID FROM suppliers WHERE SupplierID = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Supplier not found." },
        { status: 404 }
      );
    }

    await pool.execute(
      `UPDATE suppliers
       SET SupplierName = ?,
           ContactPerson = ?,
           Phone = ?,
           Email = ?,
           Address = ?,
           Status = ?
       WHERE SupplierID = ?`,
      [
        supplier.name,
        supplier.contactPerson,
        supplier.phone,
        supplier.email,
        supplier.address,
        supplier.status === "Active" ? "ACTIVE" : "INACTIVE",
        id,
      ]
    );

    return NextResponse.json({
      message: "Supplier updated successfully.",
      supplier: {
        id,
        ...supplier,
      },
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return NextResponse.json(
        { message: "A supplier with this email already exists." },
        { status: 409 }
      );
    }

    console.error("PUT supplier error:", error);

    return NextResponse.json(
      { message: "Unable to update supplier." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        { message: "You are not authorized to delete suppliers." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!/^[0-9]+$/.test(id)) {
      return NextResponse.json(
        { message: "Invalid supplier ID." },
        { status: 400 }
      );
    }

    const [existing]: any = await pool.execute(
      "SELECT SupplierID FROM suppliers WHERE SupplierID = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Supplier not found." },
        { status: 404 }
      );
    }

    const [purchaseRows]: any = await pool.execute(
      "SELECT COUNT(*) AS purchaseCount FROM purchases WHERE SupplierID = ?",
      [id]
    );

    const hasPurchases = Number(purchaseRows[0].purchaseCount) > 0;

    if (hasPurchases) {
      await pool.execute(
        "UPDATE suppliers SET Status = 'INACTIVE' WHERE SupplierID = ?",
        [id]
      );

      return NextResponse.json({
        message:
          "This supplier has existing purchase records. It has been marked inactive instead of being permanently deleted.",
        deleted: false,
      });
    }

    try {
      await pool.execute(
        "DELETE FROM suppliers WHERE SupplierID = ?",
        [id]
      );

      return NextResponse.json({
        message: "Supplier deleted successfully.",
        deleted: true,
      });
    } catch (error) {
      if (isForeignKeyError(error)) {
        await pool.execute(
          "UPDATE suppliers SET Status = 'INACTIVE' WHERE SupplierID = ?",
          [id]
        );

        return NextResponse.json({
          message:
            "This supplier now has purchase records. It has been marked inactive instead of being permanently deleted.",
          deleted: false,
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("DELETE supplier error:", error);

    return NextResponse.json(
      { message: "Unable to delete supplier." },
      { status: 500 }
    );
  }
}
