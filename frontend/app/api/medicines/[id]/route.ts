import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

interface ExistingMedicine extends RowDataPacket {
  MedicineID: number;
}

interface ReferenceCount extends RowDataPacket {
  total: number;
}

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).nullable().optional();

const medicineSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required.").max(180),
  genericName: optionalText(180),
  categoryId: z.number().int().positive("Select a valid category."),
  manufacturer: optionalText(150),
  strength: optionalText(60),
  price: z.number().finite().min(0).max(9999999999.99),
  reorderLevel: z.number().int().min(0).max(4294967295),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function getMedicineId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const medicineId = Number(id);

  if (!Number.isSafeInteger(medicineId) || medicineId <= 0) {
    return null;
  }

  return medicineId;
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized. Admin access is required." },
        { status: 403 }
      );
    }

    const medicineId = await getMedicineId(context);

    if (!medicineId) {
      return NextResponse.json(
        { message: "Invalid medicine ID." },
        { status: 400 }
      );
    }

    const body: unknown = await request.json();
    const validation = medicineSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues[0]?.message ||
            "Invalid medicine information.",
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const [existingMedicine] = await pool.execute<ExistingMedicine[]>(
      `SELECT MedicineID
       FROM medicines
       WHERE MedicineID = ?
       LIMIT 1`,
      [medicineId]
    );

    if (existingMedicine.length === 0) {
      return NextResponse.json(
        { message: "Medicine not found." },
        { status: 404 }
      );
    }

    const [categoryRows] = await pool.execute<ExistingMedicine[]>(
      `SELECT CategoryID AS MedicineID
       FROM categories
       WHERE CategoryID = ?
       LIMIT 1`,
      [data.categoryId]
    );

    if (categoryRows.length === 0) {
      return NextResponse.json(
        { message: "The selected category does not exist." },
        { status: 400 }
      );
    }

    await pool.execute<ResultSetHeader>(
      `UPDATE medicines
       SET
         CategoryID = ?,
         MedicineName = ?,
         GenericName = ?,
         Manufacturer = ?,
         Strength = ?,
         SellingPrice = ?,
         ReorderLevel = ?,
         Status = ?
       WHERE MedicineID = ?`,
      [
        data.categoryId,
        data.name,
        normalizeText(data.genericName),
        normalizeText(data.manufacturer),
        normalizeText(data.strength),
        data.price,
        data.reorderLevel,
        data.status,
        medicineId,
      ]
    );

    return NextResponse.json({
      message: "Medicine updated successfully.",
    });
  } catch (error) {
    console.error("Update medicine error:", error);

    return NextResponse.json(
      { message: "Unable to update medicine. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized. Admin access is required." },
        { status: 403 }
      );
    }

    const medicineId = await getMedicineId(context);

    if (!medicineId) {
      return NextResponse.json(
        { message: "Invalid medicine ID." },
        { status: 400 }
      );
    }

    const [existingMedicine] = await pool.execute<ExistingMedicine[]>(
      `SELECT MedicineID
       FROM medicines
       WHERE MedicineID = ?
       LIMIT 1`,
      [medicineId]
    );

    if (existingMedicine.length === 0) {
      return NextResponse.json(
        { message: "Medicine not found." },
        { status: 404 }
      );
    }

    const [stockReferences] = await pool.execute<ReferenceCount[]>(
      `SELECT COUNT(*) AS total
       FROM stock
       WHERE MedicineID = ?`,
      [medicineId]
    );

    const [orderReferences] = await pool.execute<ReferenceCount[]>(
      `SELECT COUNT(*) AS total
       FROM customer_order_items
       WHERE MedicineID = ?`,
      [medicineId]
    );

    const hasReferences =
      Number(stockReferences[0]?.total ?? 0) > 0 ||
      Number(orderReferences[0]?.total ?? 0) > 0;

    if (hasReferences) {
      await pool.execute<ResultSetHeader>(
        `UPDATE medicines
         SET Status = 'INACTIVE'
         WHERE MedicineID = ?`,
        [medicineId]
      );

      return NextResponse.json({
        message:
          "This medicine has existing stock or customer order records, so it was deactivated instead of permanently deleted.",
        deactivated: true,
      });
    }

    try {
      await pool.execute<ResultSetHeader>(
        `DELETE FROM medicines
         WHERE MedicineID = ?`,
        [medicineId]
      );

      return NextResponse.json({
        message: "Medicine deleted successfully.",
        deactivated: false,
      });
    } catch (error) {
      const dbError = error as { code?: string };

      if (dbError.code === "ER_ROW_IS_REFERENCED_2") {
        await pool.execute<ResultSetHeader>(
          `UPDATE medicines
           SET Status = 'INACTIVE'
           WHERE MedicineID = ?`,
          [medicineId]
        );

        return NextResponse.json({
          message:
            "This medicine is referenced by another record, so it was deactivated instead of permanently deleted.",
          deactivated: true,
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("Delete medicine error:", error);

    return NextResponse.json(
      { message: "Unable to delete medicine. Please try again." },
      { status: 500 }
    );
  }
}
