import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

interface CustomerDeliveryRow extends RowDataPacket {
  CustomerID: number | string;
  CustomerName: string;
  Phone: string | null;
  AddressLine: string | null;
  City: string | null;
  State: string | null;
  PostalCode: string | null;
}

const deliveryDetailsSchema = z
  .object({
    houseNumber: z.string().trim().min(1).max(100),
    street: z.string().trim().min(1).max(150),
    area: z.string().trim().min(1).max(150),
    landmark: z.string().trim().max(150).optional().default(""),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    pincode: z.string().trim().regex(/^[0-9]{6}$/, "Enter a valid 6-digit PIN code."),
    phone: z.string().trim().regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit mobile number."),
  })
  .strict();

type DeliveryDetails = z.infer<typeof deliveryDetailsSchema>;

function formatAddress(details: DeliveryDetails): string {
  return [
    `House/Door Number: ${details.houseNumber}`,
    `Street/Road: ${details.street}`,
    `Area/Locality: ${details.area}`,
    `Landmark: ${details.landmark}`,
  ].join("\n");
}

function parseAddress(addressLine: string | null): {
  houseNumber: string;
  street: string;
  area: string;
  landmark: string;
} {
  const result = {
    houseNumber: "",
    street: "",
    area: "",
    landmark: "",
  };

  if (!addressLine?.trim()) {
    return result;
  }

  const labels: Record<string, keyof typeof result> = {
    "House/Door Number": "houseNumber",
    "Street/Road": "street",
    "Area/Locality": "area",
    Landmark: "landmark",
  };

  let foundStructuredAddress = false;

  for (const line of addressLine.split("\n")) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const label = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    const field = labels[label];

    if (field) {
      result[field] = value;
      foundStructuredAddress = true;
    }
  }

  // Preserve an older free-text address rather than discarding it.
  if (!foundStructuredAddress) {
    result.area = addressLine.trim();
  }

  return result;
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
    const [rows] = await pool.execute<CustomerDeliveryRow[]>(
      `SELECT
         CustomerID,
         CustomerName,
         Phone,
         AddressLine,
         City,
         State,
         PostalCode
       FROM customers
       WHERE UserID = ?
         AND Status = 'ACTIVE'
       LIMIT 1`,
      [session.userId]
    );

    const customer = rows[0];

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: "Active customer profile not found.",
        },
        { status: 404 }
      );
    }

    const address = parseAddress(customer.AddressLine);

    return NextResponse.json(
      {
        success: true,
        customerName: customer.CustomerName,
        details: {
          ...address,
          city: customer.City ?? "",
          state: customer.State ?? "",
          pincode: customer.PostalCode ?? "",
          phone: customer.Phone ?? "",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get delivery details error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve saved delivery details.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

  const validation = deliveryDetailsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        message:
          validation.error.issues[0]?.message ??
          "Invalid delivery details.",
      },
      { status: 400 }
    );
  }

  const details = validation.data;

  try {
    const [result] = await pool.execute(
      `UPDATE customers
       SET
         Phone = ?,
         AddressLine = ?,
         City = ?,
         State = ?,
         PostalCode = ?
       WHERE UserID = ?
         AND Status = 'ACTIVE'`,
      [
        details.phone,
        formatAddress(details),
        details.city,
        details.state,
        details.pincode,
        session.userId,
      ]
    );

    const affectedRows = (result as { affectedRows: number }).affectedRows;

    if (affectedRows === 0) {
      const [rows] = await pool.execute<CustomerDeliveryRow[]>(
        `SELECT CustomerID
         FROM customers
         WHERE UserID = ?
           AND Status = 'ACTIVE'
         LIMIT 1`,
        [session.userId]
      );

      if (rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Active customer profile not found.",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Delivery details saved successfully.",
        details,
      },
      { status: 200 }
    );
  } catch (error) {
    const databaseError = error as { code?: string };

    if (databaseError.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message: "This contact number is already associated with another customer.",
        },
        { status: 409 }
      );
    }

    console.error("Save delivery details error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save delivery details. Please try again.",
      },
      { status: 500 }
    );
  }
}
