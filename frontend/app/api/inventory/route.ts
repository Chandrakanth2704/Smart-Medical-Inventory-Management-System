import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

interface InventoryRow extends RowDataPacket {
  StockID: string;
  MedicineID: string;
  MedicineName: string;
  CategoryName: string;
  DosageForm: string | null;
  BatchNo: string;
  ManufactureDate: string | null;
  ExpiryDate: string;
  Quantity: number;
  ReorderLevel: number;
  MedicineStatus: "ACTIVE" | "INACTIVE";
}

export async function GET() {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized. Admin access is required." },
        { status: 403 }
      );
    }

    const [rows] = await pool.execute<InventoryRow[]>(
      `SELECT
        CAST(s.StockID AS CHAR) AS StockID,
        CAST(m.MedicineID AS CHAR) AS MedicineID,
        m.MedicineName,
        c.CategoryName,
        m.DosageForm,
        s.BatchNo,
        DATE_FORMAT(s.ManufactureDate, '%Y-%m-%d') AS ManufactureDate,
        DATE_FORMAT(s.ExpiryDate, '%Y-%m-%d') AS ExpiryDate,
        s.Quantity,
        m.ReorderLevel,
        m.Status AS MedicineStatus
      FROM stock s
      INNER JOIN medicines m
        ON m.MedicineID = s.MedicineID
      INNER JOIN categories c
        ON c.CategoryID = m.CategoryID
      ORDER BY s.ExpiryDate ASC, m.MedicineName ASC`
    );

    const stock = rows.map((row) => ({
      id: row.StockID,
      medicineId: row.MedicineID,
      medicine: row.MedicineName,
      category: row.CategoryName,
      dosageForm: row.DosageForm ?? "",
      batch: row.BatchNo,
      manufactureDate: row.ManufactureDate,
      expiryDate: row.ExpiryDate,
      quantity: Number(row.Quantity),
      reorderLevel: Number(row.ReorderLevel),
      medicineStatus: row.MedicineStatus,
    }));

    return NextResponse.json({ stock });
  } catch (error) {
    console.error("Fetch inventory error:", error);

    return NextResponse.json(
      { message: "Unable to fetch inventory records." },
      { status: 500 }
    );
  }
}