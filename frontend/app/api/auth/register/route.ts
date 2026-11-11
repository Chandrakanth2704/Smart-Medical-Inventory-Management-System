import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { pool } from "@/lib/mysql";


const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2).max(150),
    email: z.string().trim().email().max(150),
    phone: z.string().trim().min(10).max(20),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(128)
      .regex(/[A-Z]/, "Password must contain an uppercase letter.")
      .regex(/[a-z]/, "Password must contain a lowercase letter.")
      .regex(/[0-9]/, "Password must contain a number.")
      .regex(/[^A-Za-z0-9]/, "Password must contain a special character."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

interface ExistingAccount extends RowDataPacket {
  UserID?: number;
  CustomerID?: number;
}

export async function POST(request: NextRequest) {
  let connection: PoolConnection | undefined;
  let transactionStarted = false;

  try {
    const body: unknown = await request.json();
    const validation = registrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message:
            validation.error.issues[0]?.message || "Invalid registration details.",
        },
        { status: 400 }
      );
    }

    const { fullName, email, phone, password } = validation.data;

    const normalizedEmail = email.toLowerCase();
    const normalizedPhone = phone.replace(/[\s()-]/g, "");

    if (!/^\+?[1-9]\d{9,14}$/.test(normalizedPhone)) {
      return NextResponse.json(
        {
          message:
            "Enter a valid phone number with country code if required.",
        },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    const [existingEmailUsers] = await connection.execute<
      ExistingAccount[]
    >(
      `SELECT UserID
       FROM users
       WHERE Email = ? OR Username = ?
       LIMIT 1`,
      [normalizedEmail, normalizedEmail]
    );

    const [existingEmailCustomers] = await connection.execute<
      ExistingAccount[]
    >(
      `SELECT CustomerID
       FROM customers
       WHERE Email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (
      existingEmailUsers.length > 0 ||
      existingEmailCustomers.length > 0
    ) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        { message: "This email address is already registered." },
        { status: 409 }
      );
    }

    const [existingPhoneUsers] = await connection.execute<
      ExistingAccount[]
    >(
      `SELECT UserID
       FROM users
       WHERE Phone = ?
       LIMIT 1`,
      [normalizedPhone]
    );

    const [existingPhoneCustomers] = await connection.execute<
      ExistingAccount[]
    >(
      `SELECT CustomerID
       FROM customers
       WHERE Phone = ?
       LIMIT 1`,
      [normalizedPhone]
    );

    if (
      existingPhoneUsers.length > 0 ||
      existingPhoneCustomers.length > 0
    ) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        { message: "This phone number is already registered." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [userResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users
        (Username, PasswordHash, FullName, Email, Phone, Role, Status)
       VALUES (?, ?, ?, ?, ?, 'CUSTOMER', 'ACTIVE')`,
      [
        normalizedEmail,
        passwordHash,
        fullName,
        normalizedEmail,
        normalizedPhone,
      ]
    );

    await connection.execute<ResultSetHeader>(
      `INSERT INTO customers
        (UserID, CustomerName, Email, Phone, Type, Status)
       VALUES (?, ?, ?, ?, 'REGULAR', 'ACTIVE')`,
      [
        userResult.insertId,
        fullName,
        normalizedEmail,
        normalizedPhone,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return NextResponse.json(
      {
        message: "Customer account created successfully.",
        redirectTo: "/login",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Registration rollback error:", rollbackError);
      }
    }

    const dbError = error as { code?: string };

    if (dbError.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          message:
            "This email address, username, or phone number is already registered.",
        },
        { status: 409 }
      );
    }

    console.error("Customer registration error:", error);

    return NextResponse.json(
      {
        message: "Unable to create your account. Please try again.",
      },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
