import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { requireRole } from "@/lib/auth";
import { pool } from "@/lib/mysql";

type ReportPeriod = "Weekly" | "Monthly" | "Yearly";

interface SummaryRow extends RowDataPacket {
  total: number | string | null;
  count: number | string;
  units?: number | string;
}

interface InventoryRow extends RowDataPacket {
  totalMedicines: number | string;
  totalBatches: number | string;
  totalUnits: number | string;
  inStock: number | string;
  lowStock: number | string;
  outOfStock: number | string;
  expiredBatches: number | string;
}

interface MonthlyRow extends RowDataPacket {
  monthNumber: number;
  amount: number | string;
}

interface MedicineRow extends RowDataPacket {
  name: string;
  category: string;
  quantity: number | string;
  revenue: number | string;
}

interface TransactionRow extends RowDataPacket {
  id: string;
  type: "Sale" | "Purchase";
  party: string;
  date: string;
  amount: number | string;
  sortDate: Date;
}

function getPeriodCondition(alias: string, period: ReportPeriod) {
  if (period === "Weekly") {
    return `${alias} >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      AND ${alias} < DATE_ADD(CURDATE(), INTERVAL 1 DAY)`;
  }

  if (period === "Monthly") {
    return `${alias} >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      AND ${alias} < DATE_ADD(LAST_DAY(CURDATE()), INTERVAL 1 DAY)`;
  }

  return `${alias} >= MAKEDATE(YEAR(CURDATE()), 1)
    AND ${alias} < MAKEDATE(YEAR(CURDATE()) + 1, 1)`;
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["ADMIN"]);

    if (!session) {
      return NextResponse.json(
        { message: "You are not authorized to access reports." },
        { status: 403 }
      );
    }

    const requestedPeriod = request.nextUrl.searchParams.get("period");

    const period: ReportPeriod =
      requestedPeriod === "Weekly" ||
      requestedPeriod === "Monthly" ||
      requestedPeriod === "Yearly"
        ? requestedPeriod
        : "Monthly";

    const salesCondition = getPeriodCondition("s.SaleDate", period);
    const purchasesCondition = getPeriodCondition(
      "p.PurchaseDate",
      period
    );

    // Sales summary for the selected period.
    const [salesRows] = await pool.execute<SummaryRow[]>(
      `SELECT
         COALESCE(SUM(si.TotalPrice), 0) AS total,
         COUNT(DISTINCT s.SaleID) AS count,
         COALESCE(SUM(si.Quantity), 0) AS units
       FROM sales s
       LEFT JOIN sales_items si
         ON si.SaleID = s.SaleID
       WHERE ${salesCondition}`
    );

    // Purchase summary for the selected period.
    const [purchaseRows] = await pool.execute<SummaryRow[]>(
      `SELECT
         COALESCE(SUM(pi.TotalPrice), 0) AS total,
         COUNT(DISTINCT p.PurchaseID) AS count,
         COALESCE(SUM(pi.Quantity), 0) AS units
       FROM purchases p
       LEFT JOIN purchase_items pi
         ON pi.PurchaseID = p.PurchaseID
       WHERE ${purchasesCondition}`
    );

    const totalSales = toNumber(salesRows[0]?.total);
    const totalPurchases = toNumber(purchaseRows[0]?.total);
    const salesCount = toNumber(salesRows[0]?.count);
    const purchaseCount = toNumber(purchaseRows[0]?.count);

    // Current inventory status, independent of the selected period.
    const [inventoryRows] = await pool.execute<InventoryRow[]>(
      `SELECT
         COUNT(*) AS totalMedicines,
         COALESCE(SUM(st.totalBatches), 0) AS totalBatches,
         COALESCE(SUM(st.totalQuantity), 0) AS totalUnits,

         SUM(
           CASE
             WHEN COALESCE(st.totalQuantity, 0) > m.ReorderLevel
             THEN 1 ELSE 0
           END
         ) AS inStock,

         SUM(
           CASE
             WHEN COALESCE(st.totalQuantity, 0) > 0
              AND COALESCE(st.totalQuantity, 0) <= m.ReorderLevel
             THEN 1 ELSE 0
           END
         ) AS lowStock,

         SUM(
           CASE
             WHEN COALESCE(st.totalQuantity, 0) = 0
             THEN 1 ELSE 0
           END
         ) AS outOfStock,

         (
           SELECT COUNT(*)
           FROM stock expired
           WHERE expired.ExpiryDate < CURDATE()
             AND expired.Quantity > 0
         ) AS expiredBatches

       FROM medicines m
       LEFT JOIN (
         SELECT
           MedicineID,
           SUM(Quantity) AS totalQuantity,
           COUNT(*) AS totalBatches
         FROM stock
         GROUP BY MedicineID
       ) st
         ON st.MedicineID = m.MedicineID
       WHERE m.Status = 'ACTIVE'`
    );

    const inventory = inventoryRows[0];

    // Monthly sales and purchases for the current calendar year.
    const [monthlySalesRows] = await pool.execute<MonthlyRow[]>(
      `SELECT
         MONTH(s.SaleDate) AS monthNumber,
         COALESCE(SUM(si.TotalPrice), 0) AS amount
       FROM sales s
       LEFT JOIN sales_items si
         ON si.SaleID = s.SaleID
       WHERE s.SaleDate >= MAKEDATE(YEAR(CURDATE()), 1)
         AND s.SaleDate < MAKEDATE(YEAR(CURDATE()) + 1, 1)
       GROUP BY MONTH(s.SaleDate)`
    );

    const [monthlyPurchaseRows] = await pool.execute<MonthlyRow[]>(
      `SELECT
         MONTH(p.PurchaseDate) AS monthNumber,
         COALESCE(SUM(pi.TotalPrice), 0) AS amount
       FROM purchases p
       LEFT JOIN purchase_items pi
         ON pi.PurchaseID = p.PurchaseID
       WHERE p.PurchaseDate >= MAKEDATE(YEAR(CURDATE()), 1)
         AND p.PurchaseDate < MAKEDATE(YEAR(CURDATE()) + 1, 1)
       GROUP BY MONTH(p.PurchaseDate)`
    );

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const salesByMonth = new Map(
      monthlySalesRows.map((row) => [
        Number(row.monthNumber),
        toNumber(row.amount),
      ])
    );

    const purchasesByMonth = new Map(
      monthlyPurchaseRows.map((row) => [
        Number(row.monthNumber),
        toNumber(row.amount),
      ])
    );

    const salesData = months.map((month, index) => ({
      month,
      sales: salesByMonth.get(index + 1) || 0,
      purchases: purchasesByMonth.get(index + 1) || 0,
    }));

    // Top-selling medicines for the selected period.
    const [medicineRows] = await pool.execute<MedicineRow[]>(
      `SELECT
         m.MedicineName AS name,
         c.CategoryName AS category,
         SUM(si.Quantity) AS quantity,
         SUM(si.TotalPrice) AS revenue
       FROM sales s
       INNER JOIN sales_items si
         ON si.SaleID = s.SaleID
       INNER JOIN stock st
         ON st.StockID = si.StockID
       INNER JOIN medicines m
         ON m.MedicineID = st.MedicineID
       INNER JOIN categories c
         ON c.CategoryID = m.CategoryID
       WHERE ${salesCondition}
       GROUP BY
         m.MedicineID,
         m.MedicineName,
         c.CategoryName
       ORDER BY quantity DESC, revenue DESC
       LIMIT 5`
    );

    const topMedicines = medicineRows.map((medicine) => ({
      name: medicine.name,
      category: medicine.category,
      quantity: toNumber(medicine.quantity),
      revenue: toNumber(medicine.revenue),
    }));

    // Recent sales and purchase transactions for the selected period.
    const [transactionRows] = await pool.execute<TransactionRow[]>(
      `SELECT *
       FROM (
         SELECT
           CONCAT(
             'SAL-',
             YEAR(s.SaleDate),
             '-',
             LPAD(s.SaleID, 3, '0')
           ) AS id,
           'Sale' AS type,
           COALESCE(c.CustomerName, 'Walk-in Customer') AS party,
           DATE_FORMAT(s.SaleDate, '%Y-%m-%d') AS date,
           COALESCE(SUM(si.TotalPrice), 0) AS amount,
           s.SaleDate AS sortDate
         FROM sales s
         LEFT JOIN customers c
           ON c.CustomerID = s.CustomerID
         LEFT JOIN sales_items si
           ON si.SaleID = s.SaleID
         WHERE ${salesCondition}
         GROUP BY
           s.SaleID,
           s.SaleDate,
           c.CustomerName

         UNION ALL

         SELECT
           COALESCE(
             NULLIF(p.InvoiceNo, ''),
             CONCAT('PUR-', p.PurchaseID)
           ) AS id,
           'Purchase' AS type,
           sp.SupplierName AS party,
           DATE_FORMAT(p.PurchaseDate, '%Y-%m-%d') AS date,
           COALESCE(SUM(pi.TotalPrice), 0) AS amount,
           p.PurchaseDate AS sortDate
         FROM purchases p
         INNER JOIN suppliers sp
           ON sp.SupplierID = p.SupplierID
         LEFT JOIN purchase_items pi
           ON pi.PurchaseID = p.PurchaseID
         WHERE ${purchasesCondition}
         GROUP BY
           p.PurchaseID,
           p.InvoiceNo,
           p.PurchaseDate,
           sp.SupplierName
       ) AS transactions
       ORDER BY sortDate DESC`
    );

    const recentTransactions = transactionRows.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      party: transaction.party,
      date: transaction.date,
      amount: toNumber(transaction.amount),
    }));

    const inventoryData = [
      {
        name: "In Stock",
        value: toNumber(inventory?.inStock),
      },
      {
        name: "Low Stock",
        value: toNumber(inventory?.lowStock),
      },
      {
        name: "Out of Stock",
        value: toNumber(inventory?.outOfStock),
      },
      {
        name: "Expired",
        value: toNumber(inventory?.expiredBatches),
      },
    ];

    return NextResponse.json({
      period,

      reportStats: {
        sales: totalSales,
        purchases: totalPurchases,
        grossDifference: totalSales - totalPurchases,
        orders: salesCount,
        purchaseCount,
        unitsSold: toNumber(salesRows[0]?.units),
      },

      salesData,
      inventoryData,
      topMedicines,
      recentTransactions,

      inventoryInsights: {
        totalMedicines: toNumber(inventory?.totalMedicines),
        totalBatches: toNumber(inventory?.totalBatches),
        totalUnits: toNumber(inventory?.totalUnits),
        lowStockMedicines: toNumber(inventory?.lowStock),
        outOfStockMedicines: toNumber(inventory?.outOfStock),
        expiredBatches: toNumber(inventory?.expiredBatches),
      },
    });
  } catch (error) {
    console.error("GET reports error:", error);

    return NextResponse.json(
      { message: "Unable to generate reports." },
      { status: 500 }
    );
  }
}
