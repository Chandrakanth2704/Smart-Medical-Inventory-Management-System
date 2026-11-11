import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { requireRole } from "@/lib/auth";
import { pool } from "@/lib/mysql";

const saleSchema = z.object({
  customerId: z.number().int().positive().nullable(),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMode: z.enum(["CASH", "CARD", "UPI", "BANK"]),
  items: z
    .array(
      z.object({
        stockId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        discount: z.number().min(0),
      })
    )
    .min(1, "Add at least one medicine."),
});

interface StockRow extends RowDataPacket {
  StockID: number;
  MedicineID: number;
  MedicineName: string;
  BatchNo: string;
  ExpiryDate: string;
  Quantity: number;
  SellingPrice: number;
  Status: string;
}

interface CustomerRow extends RowDataPacket {
  CustomerID: number;
}

interface SaleRow extends RowDataPacket {
  SaleID: number;
  invoice: string;
  customer: string;
  date: string;
  items: number;
  quantity: number;
  amount: number;
  paymentMode: string;
}

function getInvoiceNumber(id: number) {
  return `SAL-${new Date().getFullYear()}-${String(id).padStart(3, "0")}`;
}

export async function GET() {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        { message: "You are not authorized to access sales." },
        { status: 403 }
      );
    }

    const [sales] = await pool.execute<SaleRow[]>(
      `SELECT
         s.SaleID,
         CONCAT(
           'SAL-',
           YEAR(s.SaleDate),
           '-',
           LPAD(s.SaleID, 3, '0')
         ) AS invoice,
         COALESCE(c.CustomerName, 'Walk-in Customer') AS customer,
         DATE_FORMAT(s.SaleDate, '%Y-%m-%d') AS date,
         COUNT(si.SaleItemID) AS items,
         COALESCE(SUM(si.Quantity), 0) AS quantity,
         COALESCE(SUM(si.TotalPrice), 0) AS amount,
         s.PaymentMode AS paymentMode
       FROM sales s
       LEFT JOIN customers c
         ON c.CustomerID = s.CustomerID
       LEFT JOIN sales_items si
         ON si.SaleID = s.SaleID
       GROUP BY
         s.SaleID,
         s.SaleDate,
         c.CustomerName,
         s.PaymentMode
       ORDER BY s.SaleDate DESC, s.SaleID DESC`
    );

    const [customers] = await pool.execute<RowDataPacket[]>(
      `SELECT
         CAST(CustomerID AS CHAR) AS id,
         CustomerName AS name,
         Type AS type
       FROM customers
       WHERE Status = 'ACTIVE'
       ORDER BY CustomerName ASC`
    );

    const [stock] = await pool.execute<RowDataPacket[]>(
      `SELECT
         CAST(st.StockID AS CHAR) AS stockId,
         CAST(m.MedicineID AS CHAR) AS medicineId,
         m.MedicineName AS name,
         m.Strength AS strength,
         st.BatchNo AS batch,
         DATE_FORMAT(st.ExpiryDate, '%Y-%m-%d') AS expiryDate,
         st.Quantity AS stock,
         m.SellingPrice AS price
       FROM stock st
       INNER JOIN medicines m
         ON m.MedicineID = st.MedicineID
       WHERE
         st.Quantity > 0
         AND st.ExpiryDate >= CURDATE()
         AND m.Status = 'ACTIVE'
       ORDER BY st.ExpiryDate ASC, m.MedicineName ASC`
    );

    const formattedSales = sales.map((sale) => ({
      id: Number(sale.SaleID),
      invoice: sale.invoice,
      customer: sale.customer,
      date: sale.date,
      items: Number(sale.items),
      quantity: Number(sale.quantity),
      amount: Number(sale.amount),
      paymentMode: sale.paymentMode,
    }));

    return NextResponse.json({
      sales: formattedSales,
      customers,
      stock,
    });
  } catch (error) {
    console.error("GET sales error:", error);

    return NextResponse.json(
      { message: "Unable to load sales records." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let connection: PoolConnection | undefined;
  let transactionStarted = false;

  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        { message: "You are not authorized to create sales." },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const validation = saleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues[0]?.message ||
            "Invalid sale details.",
        },
        { status: 400 }
      );
    }

    const sale = validation.data;

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [dateRows] = await connection.execute<RowDataPacket[]>(
      `SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS currentDate`
    );

    if (sale.saleDate > dateRows[0].currentDate) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        { message: "Sale date cannot be in the future." },
        { status: 400 }
      );
    }

    if (sale.customerId !== null) {
      const [customerRows] = await connection.execute<CustomerRow[]>(
        `SELECT CustomerID
         FROM customers
         WHERE CustomerID = ?
           AND Status = 'ACTIVE'
         FOR UPDATE`,
        [sale.customerId]
      );

      if (customerRows.length === 0) {
        await connection.rollback();
        transactionStarted = false;

        return NextResponse.json(
          { message: "The selected customer is unavailable." },
          { status: 400 }
        );
      }
    }

    const itemMap = new Map<
      number,
      { quantity: number; discount: number }
    >();

    for (const item of sale.items) {
      const existing = itemMap.get(item.stockId);

      if (existing) {
        existing.quantity += item.quantity;
        existing.discount += item.discount;
      } else {
        itemMap.set(item.stockId, {
          quantity: item.quantity,
          discount: item.discount,
        });
      }
    }

    const stockIds = Array.from(itemMap.keys());
    const placeholders = stockIds.map(() => "?").join(", ");

    const [stockRows] = await connection.execute<StockRow[]>(
      `SELECT
         st.StockID,
         st.MedicineID,
         m.MedicineName,
         st.BatchNo,
         st.ExpiryDate,
         st.Quantity,
         m.SellingPrice,
         m.Status
       FROM stock st
       INNER JOIN medicines m
         ON m.MedicineID = st.MedicineID
       WHERE st.StockID IN (${placeholders})
       FOR UPDATE`,
      stockIds
    );

    if (stockRows.length !== stockIds.length) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        { message: "One or more selected stock batches do not exist." },
        { status: 400 }
      );
    }

    const stockById = new Map(
      stockRows.map((row) => [Number(row.StockID), row])
    );

    for (const [stockId, item] of itemMap) {
      const stockItem = stockById.get(stockId);

      if (!stockItem || stockItem.Status !== "ACTIVE") {
        await connection.rollback();
        transactionStarted = false;

        return NextResponse.json(
          { message: "A selected medicine is no longer available." },
          { status: 400 }
        );
      }
        const expiryDate = String(stockItem.ExpiryDate).slice(0, 10);
      if (expiryDate < sale.saleDate) {
        await connection.rollback();
        transactionStarted = false;

        return NextResponse.json(
          {
            message: `${stockItem.MedicineName} batch ${stockItem.BatchNo} is expired for the selected sale date.`,
          },
          { status: 400 }
        );
      }

      if (Number(stockItem.Quantity) < item.quantity) {
        await connection.rollback();
        transactionStarted = false;

        return NextResponse.json(
          {
            message: `Insufficient stock for ${stockItem.MedicineName}. Available: ${stockItem.Quantity}.`,
          },
          { status: 400 }
        );
      }

      const itemValue =
        Number(stockItem.SellingPrice) * item.quantity;

      if (
        !Number.isFinite(item.discount) ||
        item.discount > itemValue
      ) {
        await connection.rollback();
        transactionStarted = false;

        return NextResponse.json(
          {
            message: `Invalid discount for ${stockItem.MedicineName}.`,
          },
          { status: 400 }
        );
      }
    }

    const [saleResult] =
      await connection.execute<ResultSetHeader>(
        `INSERT INTO sales
          (CustomerID, UserID, SaleDate, PaymentMode)
         VALUES (?, ?, ?, ?)`,
        [
          sale.customerId,
          session.userId,
          `${sale.saleDate} 12:00:00`,
          sale.paymentMode,
        ]
      );

    const saleId = saleResult.insertId;

    for (const [stockId, item] of itemMap) {
      const stockItem = stockById.get(stockId)!;

      await connection.execute<ResultSetHeader>(
        `INSERT INTO sales_items
          (SaleID, StockID, Quantity, SaleRate, Discount)
         VALUES (?, ?, ?, ?, ?)`,
        [
          saleId,
          stockId,
          item.quantity,
          stockItem.SellingPrice,
          item.discount,
        ]
      );

      const [updateResult] =
        await connection.execute<ResultSetHeader>(
          `UPDATE stock
           SET Quantity = Quantity - ?
           WHERE StockID = ?
             AND Quantity >= ?`,
          [item.quantity, stockId, item.quantity]
        );

      if (updateResult.affectedRows !== 1) {
        throw new Error(
          `Stock update failed for batch ${stockItem.BatchNo}.`
        );
      }
    }

    await connection.commit();
    transactionStarted = false;

    return NextResponse.json(
      {
        message: "Sale completed successfully.",
        sale: {
          id: saleId,
          invoice: getInvoiceNumber(saleId),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Sale rollback error:", rollbackError);
      }
    }

    console.error("POST sales error:", error);

    return NextResponse.json(
      { message: "Unable to complete the sale. Please try again." },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
