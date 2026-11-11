import { NextRequest, NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

const adjustmentSchema = z.object({
  stockId: z.string().regex(/^[1-9]\d*$/, "Invalid stock batch."),
  quantityChange: z.number().int().min(-4294967295).max(4294967295)
    .refine((value) => value !== 0, "Quantity change cannot be zero."),
  reason: z.string().trim().min(1).max(180),
  remarks: z.string().trim().max(500).nullable().optional(),
});

interface StockRow extends RowDataPacket {
  StockID: string;
  Quantity: number;
}

export async function POST(request: NextRequest) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access is required." },
      { status: 403 }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const validation = adjustmentSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        message:
          validation.error.issues[0]?.message ||
          "Invalid stock adjustment.",
      },
      { status: 400 }
    );
  }

  const userId = session.userId;

  if (!/^[1-9]\d*$/.test(userId)) {
    return NextResponse.json(
      { message: "Invalid authenticated user." },
      { status: 400 }
    );
  }

  const data = validation.data;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [stockRows] = await connection.execute<StockRow[]>(
      `SELECT
        CAST(StockID AS CHAR) AS StockID,
        Quantity
       FROM stock
       WHERE StockID = ?
       FOR UPDATE`,
      [data.stockId]
    );

    if (stockRows.length === 0) {
      await connection.rollback();

      return NextResponse.json(
        { message: "The selected stock batch was not found." },
        { status: 404 }
      );
    }

    const currentQuantity = Number(stockRows[0].Quantity);
    const newQuantity = currentQuantity + data.quantityChange;

    if (newQuantity < 0) {
      await connection.rollback();

      return NextResponse.json(
        { message: "Stock quantity cannot become negative." },
        { status: 400 }
      );
    }

    if (newQuantity > 4294967295) {
      await connection.rollback();

      return NextResponse.json(
        { message: "Stock quantity exceeds the allowed limit." },
        { status: 400 }
      );
    }

    await connection.execute<ResultSetHeader>(
      `UPDATE stock
       SET Quantity = ?
       WHERE StockID = ?`,
      [newQuantity, data.stockId]
    );

    await connection.execute<ResultSetHeader>(
      `INSERT INTO stock_adjustments (
        StockID,
        UserID,
        QuantityChange,
        Reason,
        Remarks
      )
      VALUES (?, ?, ?, ?, ?)`,
      [
        data.stockId,
        userId,
        data.quantityChange,
        data.reason,
        data.remarks?.trim() || null,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      message: "Stock adjustment saved successfully.",
      stockId: data.stockId,
      previousQuantity: currentQuantity,
      newQuantity,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Stock adjustment error:", error);

    return NextResponse.json(
      { message: "Unable to save the stock adjustment." },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}