import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";
import { getMongoDb } from "@/lib/mongodb";

const paymentModes = ["CASH", "CARD", "UPI", "BANK", "CREDIT"] as const;

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
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

const newSupplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required.").max(150),
  contactPerson: z.string().trim().min(1, "Contact person is required.").max(100),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Enter a valid 10-digit phone number."),
  email: z.string().trim().email("Enter a valid supplier email.").max(150),
  address: z.string().trim().min(1, "Supplier address is required."),
});

const stockSchema = z.object({
  batchNo: z.string().trim().min(1, "Manufacturer batch number is required.").max(80),
  manufactureDate: z.string().nullable().optional(),
  expiryDate: z.string().min(1, "Expiry date is required."),
  quantity: z.number().int().positive("Quantity must be greater than zero."),
  purchaseRate: z.number().finite().min(0, "Purchase rate cannot be negative."),
});

const addMedicineSchema = z
  .object({
    medicine: medicineSchema,

    supplierId: z.number().int().positive().optional(),
    newSupplier: newSupplierSchema.optional(),

    purchaseDate: z.string().min(10, "Purchase date is required."),
    invoice: z.string().trim().max(100).nullable().optional(),
    paymentMode: z.enum(paymentModes),
    notes: z.string().trim().nullable().optional(),

    stock: stockSchema,
  })
  .refine(
    (data) => Boolean(data.supplierId) !== Boolean(data.newSupplier),
    {
      message: "Select an existing supplier or enter new supplier details.",
    }
  );

interface MedicineRow extends RowDataPacket {
  MedicineID: number;
  CategoryID: number;
  MedicineName: string;
  GenericName: string | null;
  Manufacturer: string | null;
  Strength: string | null;
  SellingPrice: number;
  ReorderLevel: number;
  Status: "ACTIVE" | "INACTIVE";
  CategoryName: string;
}

interface CategoryRow extends RowDataPacket {
  CategoryID: number;
  CategoryName: string;
  Status: "ACTIVE" | "INACTIVE";
}

interface SupplierRow extends RowDataPacket {
  SupplierID: number;
  SupplierName: string;
  Status: string;
}

interface StockRow extends RowDataPacket {
  StockID: number;
  InventoryBatchCode: string;
  ManufactureDate: string | Date | null;
  ExpiryDate: string | Date;
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function getDateValue(value: string | Date | null): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function isDuplicateEntry(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

async function findOrCreateSupplier(
  connection: PoolConnection,
  supplierId?: number,
  newSupplier?: z.infer<typeof newSupplierSchema>
): Promise<{ id: number; name: string }> {
  if (supplierId) {
    const [rows] = await connection.execute<SupplierRow[]>(
      `SELECT SupplierID, SupplierName, Status
       FROM suppliers
       WHERE SupplierID = ?
       FOR UPDATE`,
      [supplierId]
    );

    if (rows.length === 0) {
      throw new Error("The selected supplier does not exist.");
    }

    if (rows[0].Status !== "ACTIVE") {
      throw new Error("The selected supplier is inactive. Activate it first.");
    }

    return {
      id: Number(rows[0].SupplierID),
      name: rows[0].SupplierName,
    };
  }

  if (!newSupplier) {
    throw new Error("Supplier details are required.");
  }

  const [existingRows] = await connection.execute<SupplierRow[]>(
    `SELECT SupplierID, SupplierName, Status
     FROM suppliers
     WHERE LOWER(Email) = LOWER(?)
     LIMIT 1
     FOR UPDATE`,
    [newSupplier.email]
  );

  if (existingRows.length > 0) {
    const existing = existingRows[0];

    if (existing.Status !== "ACTIVE") {
      throw new Error(
        "A supplier with this email already exists but is inactive. Activate it first."
      );
    }

    return {
      id: Number(existing.SupplierID),
      name: existing.SupplierName,
    };
  }

  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO suppliers
      (SupplierName, ContactPerson, Phone, Email, Address, Status)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      newSupplier.name,
      newSupplier.contactPerson,
      newSupplier.phone,
      newSupplier.email,
      newSupplier.address,
    ]
  );

  return {
    id: result.insertId,
    name: newSupplier.name,
  };
}

async function getOrCreateStockBatch(
  connection: PoolConnection,
  medicineId: number,
  stockData: z.infer<typeof stockSchema>
): Promise<{ stockId: number; inventoryBatchCode: string }> {
  const manufactureDate = stockData.manufactureDate || null;

  const [existingRows] = await connection.execute<StockRow[]>(
    `SELECT
       StockID,
       InventoryBatchCode,
       ManufactureDate,
       ExpiryDate
     FROM stock
     WHERE MedicineID = ?
       AND BatchNo = ?
     FOR UPDATE`,
    [medicineId, stockData.batchNo]
  );

  if (existingRows.length > 0) {
    const existing = existingRows[0];

    if (
      getDateValue(existing.ManufactureDate) !== manufactureDate ||
      getDateValue(existing.ExpiryDate) !== stockData.expiryDate
    ) {
      throw new Error(
        `Batch "${stockData.batchNo}" already exists for this medicine with different manufacture or expiry dates.`
      );
    }

    await connection.execute(
      `UPDATE stock
       SET Quantity = Quantity + ?
       WHERE StockID = ?`,
      [stockData.quantity, existing.StockID]
    );

    return {
      stockId: Number(existing.StockID),
      inventoryBatchCode: existing.InventoryBatchCode,
    };
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const inventoryBatchCode = String(randomInt(100000, 1000000));

    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO stock
          (
            MedicineID,
            BatchNo,
            InventoryBatchCode,
            ManufactureDate,
            ExpiryDate,
            Quantity
          )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          medicineId,
          stockData.batchNo,
          inventoryBatchCode,
          manufactureDate,
          stockData.expiryDate,
          stockData.quantity,
        ]
      );

      return {
        stockId: result.insertId,
        inventoryBatchCode,
      };
    } catch (error) {
      if (!isDuplicateEntry(error)) {
        throw error;
      }

      const [concurrentRows] = await connection.execute<StockRow[]>(
        `SELECT
           StockID,
           InventoryBatchCode,
           ManufactureDate,
           ExpiryDate
         FROM stock
         WHERE MedicineID = ?
           AND BatchNo = ?
         FOR UPDATE`,
        [medicineId, stockData.batchNo]
      );

      if (concurrentRows.length > 0) {
        const concurrent = concurrentRows[0];

        if (
          getDateValue(concurrent.ManufactureDate) !== manufactureDate ||
          getDateValue(concurrent.ExpiryDate) !== stockData.expiryDate
        ) {
          throw new Error(
            `Batch "${stockData.batchNo}" already exists with different dates.`
          );
        }

        await connection.execute(
          `UPDATE stock
           SET Quantity = Quantity + ?
           WHERE StockID = ?`,
          [stockData.quantity, concurrent.StockID]
        );

        return {
          stockId: Number(concurrent.StockID),
          inventoryBatchCode: concurrent.InventoryBatchCode,
        };
      }
    }
  }

  throw new Error("Unable to generate a unique inventory batch code.");
}

// GET: Retrieve medicines, categories and their primary images.
export async function GET() {
  try {
    const session = await requireRole(["ADMIN", "CUSTOMER"]);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 403 }
      );
    }

    // 1. Retrieve medicines from MySQL.
    const [medicineRows] = await pool.execute<MedicineRow[]>(
      `SELECT
        m.MedicineID,
        m.CategoryID,
        m.MedicineName,
        m.GenericName,
        m.Manufacturer,
        m.Strength,
        m.SellingPrice,
        m.ReorderLevel,
        m.Status,
        c.CategoryName
      FROM medicines m
      INNER JOIN categories c
        ON c.CategoryID = m.CategoryID
      ORDER BY m.MedicineName ASC`
    );

    // 2. Retrieve categories from MySQL.
    const [categoryRows] = await pool.execute<CategoryRow[]>(
      `SELECT CategoryID, CategoryName, Status
       FROM categories
       ORDER BY CategoryName ASC`
    );

    // 3. Retrieve primary medicine images from MongoDB.
    const imageMap = new Map<string, string>();

    try {
      if (medicineRows.length > 0) {
        const db = await getMongoDb();

        const medicineIds = medicineRows.map((medicine) =>
          String(medicine.MedicineID)
        );

        const imageRows = await db
          .collection("medicine_images")
          .find({
            medicineId: { $in: medicineIds },
          })
          .sort({
            isPrimary: -1,
            createdAt: -1,
            displayOrder: 1,
          })
          .toArray();

        for (const image of imageRows) {
          const medicineId = String(image.medicineId);
          const fileId = image.fileId;

          if (!imageMap.has(medicineId) && fileId) {
            imageMap.set(
              medicineId,
              `/api/medicines/${medicineId}/images/${fileId.toString()}`
            );
          }
        }
      }
    } catch (imageError) {
      // Medicine data can still be returned if MongoDB is unavailable.
      console.error("Fetch medicine images error:", imageError);
    }

    // 4. Combine MySQL medicine data with MongoDB image URLs.
    const medicines = medicineRows.map((medicine) => {
      const id = Number(medicine.MedicineID);

      return {
        id,
        categoryId: Number(medicine.CategoryID),
        name: medicine.MedicineName,
        genericName: medicine.GenericName ?? "",
        category: medicine.CategoryName,
        manufacturer: medicine.Manufacturer ?? "",
        strength: medicine.Strength ?? "",
        price: Number(medicine.SellingPrice),
        reorderLevel: Number(medicine.ReorderLevel),
        status: medicine.Status === "ACTIVE" ? "Active" : "Inactive",
        imageUrl: imageMap.get(String(id)) ?? null,
      };
    });

    const categories = categoryRows.map((category) => ({
      id: Number(category.CategoryID),
      name: category.CategoryName,
      status: category.Status === "ACTIVE" ? "Active" : "Inactive",
    }));

    return NextResponse.json({ medicines, categories });
  } catch (error) {
    console.error("Fetch medicines error:", error);

    return NextResponse.json(
      { message: "Unable to fetch medicines." },
      { status: 500 }
    );
  }
}

// POST: Add medicine, supplier, purchase and stock together.
export async function POST(request: NextRequest) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access is required." },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const validation = addMedicineSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        message:
          validation.error.issues[0]?.message ||
          "Invalid medicine, supplier or stock information.",
      },
      { status: 400 }
    );
  }

  const data = validation.data;

  if (!isValidDate(data.purchaseDate)) {
    return NextResponse.json(
      { message: "Invalid purchase date." },
      { status: 400 }
    );
  }

  if (!isValidDate(data.stock.expiryDate)) {
    return NextResponse.json(
      { message: "Invalid expiry date." },
      { status: 400 }
    );
  }

  if (
    data.stock.manufactureDate &&
    !isValidDate(data.stock.manufactureDate)
  ) {
    return NextResponse.json(
      { message: "Invalid manufacture date." },
      { status: 400 }
    );
  }

  if (data.stock.expiryDate < data.purchaseDate) {
    return NextResponse.json(
      { message: "Expiry date cannot be earlier than the purchase date." },
      { status: 400 }
    );
  }

  if (
    data.stock.manufactureDate &&
    data.stock.manufactureDate > data.stock.expiryDate
  ) {
    return NextResponse.json(
      { message: "Manufacture date cannot be later than the expiry date." },
      { status: 400 }
    );
  }

  let connection: PoolConnection | undefined;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Verify the selected category.
    const [categoryRows] = await connection.execute<CategoryRow[]>(
      `SELECT CategoryID, CategoryName, Status
       FROM categories
       WHERE CategoryID = ?
       LIMIT 1
       FOR UPDATE`,
      [data.medicine.categoryId]
    );

    if (categoryRows.length === 0) {
      throw new Error("The selected medicine category does not exist.");
    }

    if (categoryRows[0].Status !== "ACTIVE") {
      throw new Error("The selected medicine category is inactive.");
    }

    // 2. Create the medicine.
    const [medicineResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO medicines
        (
          CategoryID,
          MedicineName,
          GenericName,
          Manufacturer,
          Strength,
          SellingPrice,
          ReorderLevel,
          Status
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.medicine.categoryId,
        data.medicine.name,
        normalizeText(data.medicine.genericName),
        normalizeText(data.medicine.manufacturer),
        normalizeText(data.medicine.strength),
        data.medicine.price,
        data.medicine.reorderLevel,
        data.medicine.status,
      ]
    );

    const medicineId = medicineResult.insertId;

    // 3. Select or create the supplier.
    const supplier = await findOrCreateSupplier(
      connection,
      data.supplierId,
      data.newSupplier
    );

    // 4. Create the purchase record.
    const [purchaseResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO purchases
        (
          SupplierID,
          UserID,
          PurchaseDate,
          InvoiceNo,
          PaymentMode,
          Notes
        )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        supplier.id,
        session.userId,
        `${data.purchaseDate} 00:00:00`,
        data.invoice || null,
        data.paymentMode,
        data.notes || null,
      ]
    );

    const purchaseId = purchaseResult.insertId;

    // 5. Create the stock batch or add quantity to an existing batch.
    const stockResult = await getOrCreateStockBatch(
      connection,
      medicineId,
      data.stock
    );

    // 6. Create the purchase item.
    await connection.execute(
      `INSERT INTO purchase_items
        (
          PurchaseID,
          StockID,
          Quantity,
          PurchaseRate,
          Discount
        )
       VALUES (?, ?, ?, ?, 0)`,
      [
        purchaseId,
        stockResult.stockId,
        data.stock.quantity,
        data.stock.purchaseRate,
      ]
    );

    // 7. Commit all operations together.
    await connection.commit();

    return NextResponse.json(
      {
        message: "Medicine, supplier and stock added successfully.",
        medicine: {
          id: medicineId,
          name: data.medicine.name,
          genericName: data.medicine.genericName || "",
          manufacturer: data.medicine.manufacturer || "",
          strength: data.medicine.strength || "",
        },
        supplier: {
          id: supplier.id,
          name: supplier.name,
        },
        purchase: {
          id: purchaseId,
          date: data.purchaseDate,
          invoice: data.invoice || "",
          paymentMode: data.paymentMode,
        },
        stock: {
          id: stockResult.stockId,
          batchNo: data.stock.batchNo,
          inventoryBatchCode: stockResult.inventoryBatchCode,
          manufactureDate: data.stock.manufactureDate || null,
          expiryDate: data.stock.expiryDate,
          quantity: data.stock.quantity,
          purchaseRate: data.stock.purchaseRate,
          totalAmount: data.stock.quantity * data.stock.purchaseRate,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Create medicine with stock error:", error);

    if (isDuplicateEntry(error)) {
      return NextResponse.json(
        {
          message:
            "A duplicate supplier email, invoice or inventory record already exists. Please check the details.",
        },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to add medicine and stock.";

    return NextResponse.json({ message }, { status: 400 });
  } finally {
    connection?.release();
  }
}
