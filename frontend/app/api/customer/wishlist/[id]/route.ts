import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

interface CustomerIdRow extends RowDataPacket {
  CustomerID: number | string;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  if (!/^[1-9][0-9]*$/.test(id)) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid wishlist ID.",
      },
      { status: 400 }
    );
  }

  try {
    const [customerRows] = await pool.execute<CustomerIdRow[]>(
      `SELECT CustomerID
       FROM customers
       WHERE UserID = ?
         AND Status = 'ACTIVE'
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

    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM customer_wishlist
       WHERE WishlistID = ?
         AND CustomerID = ?`,
      [id, customer.CustomerID]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Wishlist item not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Medicine removed from your wishlist.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Remove wishlist error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to remove this medicine from your wishlist.",
      },
      { status: 500 }
    );
  }
}
