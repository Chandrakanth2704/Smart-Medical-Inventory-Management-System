import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

interface CustomerIdRow extends RowDataPacket {
  CustomerID: number | string;
}

interface WishlistRow extends RowDataPacket {
  WishlistID: number | string;
  MedicineID: number | string;
  MedicineName: string;
  GenericName: string | null;
  Manufacturer: string | null;
  Strength: string | null;
  DosageForm: string | null;
  SellingPrice: number;
  Description: string | null;
  StorageCondition: string | null;
  CategoryName: string | null;
  AvailableQuantity: number;
  Status: string;
  SavedAt: Date | string;
}

const medicineIdSchema = z.union([
  z.string().regex(/^[1-9][0-9]*$/, "Invalid medicine ID."),
  z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
]).transform(String);

const addWishlistSchema = z.object({
  medicineId: medicineIdSchema,
}).strict();

async function getCustomerId(userId: string): Promise<string | null> {
  const [rows] = await pool.execute<CustomerIdRow[]>(
    `SELECT CustomerID
     FROM customers
     WHERE UserID = ?
       AND Status = 'ACTIVE'
     LIMIT 1`,
    [userId]
  );

  return rows[0] ? String(rows[0].CustomerID) : null;
}

export async function GET() {
  const session = await requireRole(["CUSTOMER"]);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "Customer authentication required.",
      },
      { status: 401 }
    );
  }

  try {
    const customerId = await getCustomerId(session.userId);

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Active customer profile not found.",
        },
        { status: 404 }
      );
    }

    const [rows] = await pool.execute<WishlistRow[]>(
      `SELECT
         cw.WishlistID,
         m.MedicineID,
         m.MedicineName,
         m.GenericName,
         m.Manufacturer,
         m.Strength,
         m.DosageForm,
         m.SellingPrice,
         m.Description,
         m.StorageCondition,
         m.Status,
         c.CategoryName,
         COALESCE(s.AvailableQuantity, 0) AS AvailableQuantity,
         cw.SavedAt
       FROM customer_wishlist cw
       INNER JOIN medicines m
         ON m.MedicineID = cw.MedicineID
       LEFT JOIN categories c
         ON c.CategoryID = m.CategoryID
       LEFT JOIN (
         SELECT
           MedicineID,
           SUM(Quantity) AS AvailableQuantity
         FROM stock
         WHERE ExpiryDate >= CURDATE()
         GROUP BY MedicineID
       ) s
         ON s.MedicineID = m.MedicineID
       WHERE cw.CustomerID = ?
       ORDER BY cw.SavedAt DESC`,
      [customerId]
    );

    return NextResponse.json(
      {
        success: true,
        items: rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get wishlist error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve your wishlist.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireRole(["CUSTOMER"]);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: "Customer authentication required.",
      },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const validation = addWishlistSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        message:
          validation.error.issues[0]?.message ??
          "Invalid medicine ID.",
      },
      { status: 400 }
    );
  }

  try {
    const customerId = await getCustomerId(session.userId);

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Active customer profile not found.",
        },
        { status: 404 }
      );
    }

    const [medicineRows] = await pool.execute<RowDataPacket[]>(
      `SELECT MedicineID
       FROM medicines
       WHERE MedicineID = ?
         AND Status = 'ACTIVE'
       LIMIT 1`,
      [validation.data.medicineId]
    );

    if (medicineRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Medicine not found or currently unavailable.",
        },
        { status: 404 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT IGNORE INTO customer_wishlist
         (CustomerID, MedicineID)
       VALUES (?, ?)`,
      [customerId, validation.data.medicineId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          success: true,
          alreadySaved: true,
          message: "This medicine is already in your wishlist.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        alreadySaved: false,
        message: "Medicine added to your wishlist.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add wishlist error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to add this medicine to your wishlist.",
      },
      { status: 500 }
    );
  }
}
