import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

interface CustomerRow extends RowDataPacket {
  CustomerID: number | string;
}

interface MedicineRow extends RowDataPacket {
  MedicineID: number | string;
  SellingPrice: number | string;
}

interface StockBatchRow extends RowDataPacket {
  StockID: number | string;
  MedicineID: number | string;
  Quantity: number | string;
  ExpiryDate: string;
}

interface OrderHistoryRow extends RowDataPacket {
  OrderID: number | string;
  OrderDate: Date | string;
  OrderStatus: string;
  PaymentStatus: string;
  PaymentMode: string | null;
  DeliveryAddress: string;
  CustomerNotes: string | null;
  DeliveryFee: number | string;
  HandlingFee: number | string;

  OrderItemID: number | string | null;
  MedicineID: number | string | null;
  MedicineName: string | null;
  GenericName: string | null;
  Strength: string | null;
  DosageForm: string | null;
  Unit: string | null;
  Quantity: number | string | null;
  UnitPrice: number | string | null;
  Discount: number | string | null;
  TotalPrice: number | string | null;
}

const orderSchema = z
  .object({
    deliveryAddress: z.string().trim().min(5).max(1000),

    paymentMode: z
      .enum(["CASH", "CARD", "UPI", "BANK"])
      .nullable()
      .optional(),

    customerNotes: z.string().trim().max(1000).optional().nullable(),

    items: z
      .array(
        z.object({
          medicineId: z.number().int().positive().safe(),
          quantity: z.number().int().min(1).max(10000),
        })
      )
      .min(1)
      .max(30),
  })
  .strict()
  .superRefine((data, context) => {
    const medicineIds = data.items.map((item) => item.medicineId);

    if (new Set(medicineIds).size !== medicineIds.length) {
      context.addIssue({
        code: "custom",
        message: "A medicine can only appear once in an order.",
        path: ["items"],
      });
    }
  });

const FREE_DELIVERY_THRESHOLD_PAISE = 49900;
const DELIVERY_FEE_PAISE = 3900;
const HANDLING_FEE_PAISE = 900;

function toPaise(value: number | string): number {
  return Math.round(Number(value) * 100);
}

function toRupees(paise: number): number {
  return Number((paise / 100).toFixed(2));
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

  const validation = orderSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        message:
          validation.error.issues[0]?.message ??
          "Invalid order details.",
      },
      { status: 400 }
    );
  }

  const {
    deliveryAddress,
    paymentMode,
    customerNotes,
    items,
  } = validation.data;

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    // 1. Find the active customer profile.

    const [customerRows] = await connection.execute<CustomerRow[]>(
      `SELECT CustomerID
       FROM customers
       WHERE UserID = ? AND Status = 'ACTIVE'
       LIMIT 1`,
      [session.userId]
    );

    const customer = customerRows[0];

    if (!customer) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: "Active customer profile not found.",
        },
        { status: 404 }
      );
    }

    const medicineIds = items.map((item) => item.medicineId);
    const placeholders = medicineIds.map(() => "?").join(", ");

    // 2. Lock active medicine records and retrieve database prices.

    const [medicineRows] = await connection.execute<MedicineRow[]>(
      `SELECT
         MedicineID,
         SellingPrice
       FROM medicines
       WHERE MedicineID IN (${placeholders})
         AND Status = 'ACTIVE'
       ORDER BY MedicineID
       FOR UPDATE`,
      medicineIds
    );

    const medicineMap = new Map(
      medicineRows.map((medicine) => [
        Number(medicine.MedicineID),
        medicine,
      ])
    );

    // 3. Lock all non-expired stock batches for the requested medicines.
    // Batches are ordered by expiry date for FEFO deduction.

    const [stockRows] = await connection.execute<StockBatchRow[]>(
      `SELECT
         StockID,
         MedicineID,
         Quantity,
         ExpiryDate
       FROM stock
       WHERE MedicineID IN (${placeholders})
         AND ExpiryDate >= CURDATE()
       ORDER BY MedicineID, ExpiryDate, StockID
       FOR UPDATE`,
      medicineIds
    );

    const stockMap = new Map<number, StockBatchRow[]>();

    for (const stock of stockRows) {
      const medicineId = Number(stock.MedicineID);

      if (!stockMap.has(medicineId)) {
        stockMap.set(medicineId, []);
      }

      stockMap.get(medicineId)!.push(stock);
    }

    // 4. Validate every medicine and calculate the subtotal.

    let subtotalPaise = 0;

    for (const item of items) {
      const medicine = medicineMap.get(item.medicineId);

      if (!medicine) {
        await connection.rollback();
        transactionStarted = false;

        return NextResponse.json(
          {
            success: false,
            message: `Medicine ID ${item.medicineId} is unavailable.`,
          },
          { status: 400 }
        );
      }

      const batches = stockMap.get(item.medicineId) ?? [];

      const availableQuantity = batches.reduce(
        (total, batch) => total + Number(batch.Quantity),
        0
      );

      if (availableQuantity < item.quantity) {
        await connection.rollback();
        transactionStarted = false;

        return NextResponse.json(
          {
            success: false,
            message: `Insufficient available quantity for medicine ID ${item.medicineId}. Available: ${availableQuantity}. Requested: ${item.quantity}.`,
          },
          { status: 400 }
        );
      }

      subtotalPaise +=
        toPaise(medicine.SellingPrice) * item.quantity;
    }

    // 5. Calculate delivery, handling and final charges.

    const deliveryFeePaise =
      subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE
        ? 0
        : DELIVERY_FEE_PAISE;

    const handlingFeePaise = HANDLING_FEE_PAISE;

    const totalPaise =
      subtotalPaise + deliveryFeePaise + handlingFeePaise;

    // 6. Create the customer order.

    const [orderResult] =
      await connection.execute<ResultSetHeader>(
        `INSERT INTO customer_orders
          (
            CustomerID,
            PaymentMode,
            DeliveryAddress,
            CustomerNotes,
            DeliveryFee,
            HandlingFee
          )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          customer.CustomerID,
          paymentMode ?? null,
          deliveryAddress,
          customerNotes ?? null,
          toRupees(deliveryFeePaise),
          toRupees(handlingFeePaise),
        ]
      );

    const orderId = orderResult.insertId;

    // 7. Insert order items and deduct stock using FEFO.

    for (const item of items) {
      const medicine = medicineMap.get(item.medicineId)!;

      await connection.execute(
        `INSERT INTO customer_order_items
          (OrderID, MedicineID, Quantity, UnitPrice, Discount)
         VALUES (?, ?, ?, ?, 0)`,
        [
          orderId,
          medicine.MedicineID,
          item.quantity,
          medicine.SellingPrice,
        ]
      );

      let remainingQuantity = item.quantity;
      const batches = stockMap.get(item.medicineId) ?? [];

      for (const batch of batches) {
        if (remainingQuantity <= 0) {
          break;
        }

        const batchQuantity = Number(batch.Quantity);

        if (batchQuantity <= 0) {
          continue;
        }

        const deduction = Math.min(
          remainingQuantity,
          batchQuantity
        );

        const [updateResult] =
          await connection.execute<ResultSetHeader>(
            `UPDATE stock
             SET Quantity = Quantity - ?
             WHERE StockID = ?
               AND Quantity >= ?`,
            [
              deduction,
              batch.StockID,
              deduction,
            ]
          );

        if (updateResult.affectedRows !== 1) {
          throw new Error(
            `Unable to update stock batch ${batch.StockID}.`
          );
        }

        remainingQuantity -= deduction;
      }

      if (remainingQuantity > 0) {
        throw new Error(
          `Stock deduction failed for medicine ID ${item.medicineId}.`
        );
      }
    }

    // 8. Commit the order and stock changes together.

    await connection.commit();
    transactionStarted = false;

    return NextResponse.json(
      {
        success: true,
        message: "Your order has been placed successfully.",
        order: {
          orderId,
          orderStatus: "PLACED",
          paymentStatus: "PENDING",
          subtotal: toRupees(subtotalPaise),
          deliveryFee: toRupees(deliveryFeePaise),
          handlingFee: toRupees(handlingFeePaise),
          total: toRupees(totalPaise),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Order rollback error:", rollbackError);
      }
    }

    console.error("Customer order API error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown database error";

    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV === "development"
            ? message
            : "Unable to place your order. Please try again.",
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
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

  const connection = await pool.getConnection();

  try {
    // 1. Find the active customer profile.

    const [customerRows] = await connection.execute<CustomerRow[]>(
      `SELECT CustomerID
       FROM customers
       WHERE UserID = ? AND Status = 'ACTIVE'
       LIMIT 1`,
      [session.userId]
    );

    const customer = customerRows[0];

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: "Active customer profile not found.",
        },
        { status: 404 }
      );
    }

    // 2. Retrieve customer orders and their medicine details.

    const [rows] = await connection.execute<OrderHistoryRow[]>(
      `SELECT
         o.OrderID,
         o.OrderDate,
         o.OrderStatus,
         o.PaymentStatus,
         o.PaymentMode,
         o.DeliveryAddress,
         o.CustomerNotes,
         o.DeliveryFee,
         o.HandlingFee,

         oi.OrderItemID,
         oi.MedicineID,
         m.MedicineName,
         m.GenericName,
         m.Strength,
         m.DosageForm,
         m.Unit,
         oi.Quantity,
         oi.UnitPrice,
         oi.Discount,
         oi.TotalPrice

       FROM customer_orders o

       LEFT JOIN customer_order_items oi
         ON o.OrderID = oi.OrderID

       LEFT JOIN medicines m
         ON oi.MedicineID = m.MedicineID

       WHERE o.CustomerID = ?

       ORDER BY o.OrderDate DESC, o.OrderID DESC, oi.OrderItemID ASC`,
      [customer.CustomerID]
    );

    // 3. Group the results by OrderID.

    const orderMap = new Map<number, any>();

    for (const row of rows) {
      const orderId = Number(row.OrderID);

      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, {
          orderId,
          orderDate: row.OrderDate,
          orderStatus: row.OrderStatus,
          paymentStatus: row.PaymentStatus,
          paymentMode: row.PaymentMode,
          deliveryAddress: row.DeliveryAddress,
          customerNotes: row.CustomerNotes,

          items: [],

          subtotal: 0,
          deliveryFee: Number(row.DeliveryFee),
          handlingFee: Number(row.HandlingFee),
          total: 0,
        });
      }

      const order = orderMap.get(orderId);

      // An order may have no items, so check for NULL.

      if (row.OrderItemID !== null) {
        const itemTotal = Number(row.TotalPrice);

        order.items.push({
          orderItemId: Number(row.OrderItemID),
          medicineId: Number(row.MedicineID),
          medicineName: row.MedicineName,
          genericName: row.GenericName,
          strength: row.Strength,
          dosageForm: row.DosageForm,
          unit: row.Unit,

          quantity: Number(row.Quantity),
          unitPrice: Number(row.UnitPrice),
          discount: Number(row.Discount),
          totalPrice: itemTotal,
        });

        order.subtotal += itemTotal;
      }
    }

    // 4. Calculate final totals.

    const orders = Array.from(orderMap.values()).map((order) => {
      order.subtotal = Number(order.subtotal.toFixed(2));

      order.total = Number(
        (
          order.subtotal +
          order.deliveryFee +
          order.handlingFee
        ).toFixed(2)
      );

      order.itemCount = order.items.reduce(
        (total: number, item: { quantity: number }) =>
          total + item.quantity,
        0
      );

      return order;
    });

    // 5. Return the customer's order history.

    return NextResponse.json(
      {
        success: true,
        count: orders.length,
        orders,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Customer order history API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : "Unable to retrieve order history.",
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
