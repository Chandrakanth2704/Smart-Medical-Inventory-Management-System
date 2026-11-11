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

const paymentModes = ["CASH", "CARD", "UPI", "BANK", "CREDIT"] as const;

const newSupplierSchema = z.object({
  name: z.string().trim().min(1).max(150),
  contactPerson: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  email: z
    .string()
    .trim()
    .max(150)
    .nullable()
    .optional()
    .refine(
      (value) =>
        !value ||
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid supplier email address."
    ),
  address: z.string().trim().nullable().optional(),
});

const purchaseItemSchema = z.object({
  medicineId: z.number().int().positive(),
  batchNo: z.string().trim().min(1).max(80),
  manufactureDate: z.string().nullable().optional(),
  expiryDate: z.string().min(1),
  quantity: z.number().int().positive(),
  purchaseRate: z.number().min(0),
  discount: z.number().min(0).default(0),
});

const purchaseSchema = z
  .object({
    supplierId: z.number().int().positive().optional(),
    newSupplier: newSupplierSchema.optional(),
    invoice: z.string().trim().max(100).nullable().optional(),
    purchaseDate: z.string().min(10),
    paymentMode: z.enum(paymentModes),
    notes: z.string().trim().nullable().optional(),
    items: z.array(purchaseItemSchema).min(1),
  })
  .refine(
    (data) =>
      Boolean(data.supplierId) !== Boolean(data.newSupplier),
    {
      message:
        "Select an existing supplier or enter new supplier details.",
    }
  );

type SupplierRow = RowDataPacket & {
  SupplierID: number;
  SupplierName: string;
  Status: string;
};

type MedicineRow = RowDataPacket & {
  MedicineID: number;
  MedicineName: string;
  Status: string;
};

type StockRow = RowDataPacket & {
  StockID: number;
  MedicineID: number;
  BatchNo: string;
  InventoryBatchCode: string;
  ManufactureDate: string | null;
  ExpiryDate: string;
  Quantity: number;
};

type PurchaseRow = RowDataPacket & {
  PurchaseID: number;
  SupplierName: string;
  PurchaseDate: string;
  InvoiceNo: string | null;
  PaymentMode: string;
  Notes: string | null;
  UserID: number;
  ItemCount: number;
  TotalQuantity: number;
  TotalAmount: number;
};

type PurchaseItemRow = RowDataPacket & {
  PurchaseID: number;
  StockID: number;
  MedicineID: number;
  MedicineName: string;
  BatchNo: string;
  InventoryBatchCode: string;
  ManufactureDate: string | null;
  ExpiryDate: string;
  Quantity: number;
  PurchaseRate: number;
  Discount: number;
  TotalPrice: number;
};

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

function isMatchingBatch(
  stock: StockRow,
  manufactureDate: string | null,
  expiryDate: string
): boolean {
  const existingManufactureDate = getDateValue(
    stock.ManufactureDate
  );

  const existingExpiryDate = getDateValue(stock.ExpiryDate);

  return (
    existingManufactureDate === manufactureDate &&
    existingExpiryDate === expiryDate
  );
}

async function findOrCreateSupplier(
  connection: PoolConnection,
  supplierId?: number,
  newSupplier?: z.infer<typeof newSupplierSchema>
): Promise<number> {
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
      throw new Error(
        "The selected supplier is inactive. Please activate the supplier first."
      );
    }

    return Number(rows[0].SupplierID);
  }

  if (!newSupplier) {
    throw new Error("Supplier details are required.");
  }

  let existingRows: SupplierRow[] = [];

  if (newSupplier.email) {
    const [rows] = await connection.execute<SupplierRow[]>(
      `SELECT SupplierID, SupplierName, Status
       FROM suppliers
       WHERE LOWER(Email) = LOWER(?)
       LIMIT 1
       FOR UPDATE`,
      [newSupplier.email]
    );

    existingRows = rows;
  } else {
    const [rows] = await connection.execute<SupplierRow[]>(
      `SELECT SupplierID, SupplierName, Status
       FROM suppliers
       WHERE LOWER(TRIM(SupplierName)) = LOWER(TRIM(?))
         AND Phone <=> ?
       LIMIT 1
       FOR UPDATE`,
      [
        newSupplier.name,
        newSupplier.phone || null,
      ]
    );

    existingRows = rows;
  }

  if (existingRows.length > 0) {
    const existingSupplier = existingRows[0];

    if (existingSupplier.Status !== "ACTIVE") {
      throw new Error(
        "A matching supplier exists but is inactive. Please activate that supplier before using it."
      );
    }

    return Number(existingSupplier.SupplierID);
  }

  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO suppliers
      (
        SupplierName,
        ContactPerson,
        Phone,
        Email,
        Address,
        Status
      )
     VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      newSupplier.name,
      newSupplier.contactPerson || null,
      newSupplier.phone || null,
      newSupplier.email || null,
      newSupplier.address || null,
    ]
  );

  return result.insertId;
}

async function getOrCreateStockBatch(
  connection: PoolConnection,
  item: z.infer<typeof purchaseItemSchema>
): Promise<{ stockId: number; inventoryBatchCode: string }> {
  const manufactureDate = item.manufactureDate || null;

  const [existingRows] = await connection.execute<StockRow[]>(
    `SELECT
       StockID,
       MedicineID,
       BatchNo,
       InventoryBatchCode,
       ManufactureDate,
       ExpiryDate,
       Quantity
     FROM stock
     WHERE MedicineID = ?
       AND BatchNo = ?
     FOR UPDATE`,
    [item.medicineId, item.batchNo]
  );

  if (existingRows.length > 0) {
    const existingStock = existingRows[0];

    if (
      !isMatchingBatch(
        existingStock,
        manufactureDate,
        item.expiryDate
      )
    ) {
      throw new Error(
        `Manufacturer batch "${item.batchNo}" already exists for this medicine with different manufacture or expiry dates. The existing batch was not changed.`
      );
    }

    await connection.execute(
      `UPDATE stock
       SET Quantity = Quantity + ?
       WHERE StockID = ?`,
      [item.quantity, existingStock.StockID]
    );

    return {
      stockId: Number(existingStock.StockID),
      inventoryBatchCode: existingStock.InventoryBatchCode,
    };
  }

  // Generate a unique six-digit inventory code.
  // The database UNIQUE constraint provides the final protection
  // against duplicate codes.
  for (let attempt = 0; attempt < 10; attempt++) {
    const inventoryBatchCode = String(
      randomInt(100000, 1000000)
    );

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
          item.medicineId,
          item.batchNo,
          inventoryBatchCode,
          manufactureDate,
          item.expiryDate,
          item.quantity,
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

      // A concurrent request may have inserted the same
      // medicine/manufacturer batch while this transaction ran.
      const [concurrentRows] =
        await connection.execute<StockRow[]>(
          `SELECT
             StockID,
             MedicineID,
             BatchNo,
             InventoryBatchCode,
             ManufactureDate,
             ExpiryDate,
             Quantity
           FROM stock
           WHERE MedicineID = ?
             AND BatchNo = ?
           FOR UPDATE`,
          [item.medicineId, item.batchNo]
        );

      if (concurrentRows.length > 0) {
        const concurrentStock = concurrentRows[0];

        if (
          !isMatchingBatch(
            concurrentStock,
            manufactureDate,
            item.expiryDate
          )
        ) {
          throw new Error(
            `Manufacturer batch "${item.batchNo}" already exists with different dates.`
          );
        }

        await connection.execute(
          `UPDATE stock
           SET Quantity = Quantity + ?
           WHERE StockID = ?`,
          [item.quantity, concurrentStock.StockID]
        );

        return {
          stockId: Number(concurrentStock.StockID),
          inventoryBatchCode:
            concurrentStock.InventoryBatchCode,
        };
      }

      // Otherwise, the randomly generated inventory code
      // collided with another record. Try another code.
    }
  }

  throw new Error(
    "Unable to generate a unique inventory batch code. Please try again."
  );
}

// GET: Retrieve purchase register and purchase item details.
export async function GET() {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { message: "Forbidden: Admin access required." },
      { status: 403 }
    );
  }

  try {
    const [purchaseRows] = await pool.execute<PurchaseRow[]>(
      `SELECT
         p.PurchaseID,
         p.PurchaseDate,
         p.InvoiceNo,
         p.PaymentMode,
         p.Notes,
         p.UserID,
         s.SupplierName,
         COUNT(pi.PurchaseItemID) AS ItemCount,
         COALESCE(SUM(pi.Quantity), 0) AS TotalQuantity,
         COALESCE(SUM(pi.TotalPrice), 0) AS TotalAmount
       FROM purchases p
       INNER JOIN suppliers s
         ON s.SupplierID = p.SupplierID
       LEFT JOIN purchase_items pi
         ON pi.PurchaseID = p.PurchaseID
       GROUP BY
         p.PurchaseID,
         p.PurchaseDate,
         p.InvoiceNo,
         p.PaymentMode,
         p.Notes,
         p.UserID,
         s.SupplierName
       ORDER BY p.PurchaseDate DESC, p.PurchaseID DESC`
    );

    const [itemRows] = await pool.execute<PurchaseItemRow[]>(
      `SELECT
         pi.PurchaseID,
         st.StockID,
         st.MedicineID,
         m.MedicineName,
         st.BatchNo,
         st.InventoryBatchCode,
         st.ManufactureDate,
         st.ExpiryDate,
         pi.Quantity,
         pi.PurchaseRate,
         pi.Discount,
         pi.TotalPrice
       FROM purchase_items pi
       INNER JOIN stock st
         ON st.StockID = pi.StockID
       INNER JOIN medicines m
         ON m.MedicineID = st.MedicineID
       ORDER BY pi.PurchaseItemID ASC`
    );

    const itemsByPurchase = new Map<number, PurchaseItemRow[]>();

    for (const item of itemRows) {
      const purchaseId = Number(item.PurchaseID);
      const existing = itemsByPurchase.get(purchaseId) || [];

      existing.push(item);
      itemsByPurchase.set(purchaseId, existing);
    }

    const purchases = purchaseRows.map((purchase) => {
      const purchaseId = Number(purchase.PurchaseID);

      const purchaseItems = (
        itemsByPurchase.get(purchaseId) || []
      ).map((item) => ({
        stockId: String(item.StockID),
        medicineId: String(item.MedicineID),
        medicine: item.MedicineName,
        batchNo: item.BatchNo,
        inventoryBatchCode: item.InventoryBatchCode,
        manufactureDate: getDateValue(item.ManufactureDate),
        expiryDate: getDateValue(item.ExpiryDate) || "",
        quantity: Number(item.Quantity),
        purchaseRate: Number(item.PurchaseRate),
        discount: Number(item.Discount),
        total: Number(item.TotalPrice),
      }));

      return {
        id: String(purchaseId),
        invoice: purchase.InvoiceNo || "",
        date: getDateValue(purchase.PurchaseDate) || "",
        supplier: purchase.SupplierName,
        createdBy: String(purchase.UserID),
        paymentMode: purchase.PaymentMode,
        notes: purchase.Notes || "",
        itemCount: Number(purchase.ItemCount),
        quantity: Number(purchase.TotalQuantity),
        amount: Number(purchase.TotalAmount),
        items: purchaseItems,
      };
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error("GET purchases error:", error);

    return NextResponse.json(
      { message: "Failed to retrieve purchase records." },
      { status: 500 }
    );
  }
}

// POST: Create supplier if needed, purchase, stock and purchase items.
export async function POST(request: NextRequest) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { message: "Forbidden: Admin access required." },
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

  const validation = purchaseSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        message: "Invalid purchase information.",
        errors: validation.error.flatten(),
      },
      { status: 400 }
    );
  }

  const data = validation.data;

  // Validate calendar dates and date relationships before
  // opening the database transaction.
  if (!isValidDate(data.purchaseDate)) {
    return NextResponse.json(
      { message: "Invalid purchase date." },
      { status: 400 }
    );
  }

  for (const item of data.items) {
    if (!isValidDate(item.expiryDate)) {
      return NextResponse.json(
        { message: "Invalid expiry date." },
        { status: 400 }
      );
    }

    if (
      item.manufactureDate &&
      !isValidDate(item.manufactureDate)
    ) {
      return NextResponse.json(
        { message: "Invalid manufacture date." },
        { status: 400 }
      );
    }

    if (item.expiryDate < data.purchaseDate) {
      return NextResponse.json(
        {
          message:
            "Medicine expiry date cannot be earlier than the purchase date.",
        },
        { status: 400 }
      );
    }

    if (
      item.manufactureDate &&
      item.manufactureDate > item.expiryDate
    ) {
      return NextResponse.json(
        {
          message:
            "Manufacture date cannot be later than the expiry date.",
        },
        { status: 400 }
      );
    }

    if (
      item.discount >
      item.quantity * item.purchaseRate
    ) {
      return NextResponse.json(
        {
          message:
            "Item discount cannot exceed the total purchase rate.",
        },
        { status: 400 }
      );
    }
  }

  // Avoid processing the same medicine/manufacturer batch twice
  // in one purchase request.
  const batchKeys = data.items.map(
    (item) => `${item.medicineId}::${item.batchNo}`
  );

  if (new Set(batchKeys).size !== batchKeys.length) {
    return NextResponse.json(
      {
        message:
          "The same medicine and manufacturer batch cannot be added more than once in a purchase.",
      },
      { status: 400 }
    );
  }

  let connection: PoolConnection | undefined;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Find the selected supplier or register a new supplier.
    const supplierId = await findOrCreateSupplier(
      connection,
      data.supplierId,
      data.newSupplier
    );

    // 2. Validate that every medicine exists and is active.
    for (const item of data.items) {
      const [medicineRows] =
        await connection.execute<MedicineRow[]>(
          `SELECT MedicineID, MedicineName, Status
           FROM medicines
           WHERE MedicineID = ?
           FOR UPDATE`,
          [item.medicineId]
        );

      if (medicineRows.length === 0) {
        throw new Error(
          `Medicine ID ${item.medicineId} does not exist.`
        );
      }

      if (medicineRows[0].Status !== "ACTIVE") {
        throw new Error(
          `Medicine "${medicineRows[0].MedicineName}" is inactive.`
        );
      }
    }

    // 3. Create the purchase header.
    const [purchaseResult] =
      await connection.execute<ResultSetHeader>(
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
          supplierId,
          session.userId,
          `${data.purchaseDate} 00:00:00`,
          data.invoice || null,
          data.paymentMode,
          data.notes || null,
        ]
      );

    const purchaseId = purchaseResult.insertId;

    // 4. Process every medicine batch and create purchase items.
    const createdItems: {
      stockId: number;
      inventoryBatchCode: string;
    }[] = [];

    for (const item of data.items) {
      const stock = await getOrCreateStockBatch(
        connection,
        item
      );

      await connection.execute(
        `INSERT INTO purchase_items
          (
            PurchaseID,
            StockID,
            Quantity,
            PurchaseRate,
            Discount
          )
         VALUES (?, ?, ?, ?, ?)`,
        [
          purchaseId,
          stock.stockId,
          item.quantity,
          item.purchaseRate,
          item.discount,
        ]
      );

      createdItems.push({
        stockId: stock.stockId,
        inventoryBatchCode: stock.inventoryBatchCode,
      });
    }

    // 5. Commit only after all database operations succeed.
    await connection.commit();

    return NextResponse.json(
      {
        message: "Purchase recorded successfully.",
        purchaseId,
        supplierId,
        items: createdItems,
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("POST purchase error:", error);

    if (isDuplicateEntry(error)) {
      return NextResponse.json(
        {
          message:
            "A duplicate invoice, supplier email or inventory record already exists. Please check the details.",
        },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to record purchase.";

    return NextResponse.json(
      { message },
      { status: 400 }
    );
  } finally {
    connection?.release();
  }
}
