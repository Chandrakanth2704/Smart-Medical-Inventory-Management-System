import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/mysql";
import {
  requireRole,
  verifyPassword,
} from "@/lib/auth";

interface UserPasswordRow extends RowDataPacket {
  UserID: number | string;
  PasswordHash: string;
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z
      .string()
      .min(8, "New password must contain at least 8 characters.")
      .max(128)
      .regex(/[A-Z]/, "New password must contain an uppercase letter.")
      .regex(/[a-z]/, "New password must contain a lowercase letter.")
      .regex(/[0-9]/, "New password must contain a number.")
      .regex(
        /[^A-Za-z0-9]/,
        "New password must contain a special character."
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

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

  const validation = passwordSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        message:
          validation.error.issues[0]?.message ??
          "Invalid password details.",
      },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = validation.data;

  try {
    const [rows] = await pool.execute<UserPasswordRow[]>(
      `SELECT UserID, PasswordHash
       FROM users
       WHERE UserID = ?
         AND Role = 'CUSTOMER'
         AND Status = 'ACTIVE'
       LIMIT 1`,
      [session.userId]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Active customer account not found.",
        },
        { status: 404 }
      );
    }

    const currentPasswordMatches = await verifyPassword(
      currentPassword,
      user.PasswordHash
    );

    if (!currentPasswordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "Your current password is incorrect.",
        },
        { status: 400 }
      );
    }

    const isSamePassword = await verifyPassword(
      newPassword,
      user.PasswordHash
    );

    if (isSamePassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Your new password must be different from the current password.",
        },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    const [updateResult] = await pool.execute<ResultSetHeader>(
      `UPDATE users
       SET PasswordHash = ?
       WHERE UserID = ?
         AND Role = 'CUSTOMER'
         AND Status = 'ACTIVE'`,
      [newPasswordHash, session.userId]
    );

    if (updateResult.affectedRows !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to update your password.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your password has been changed successfully.",
    });
  } catch (error) {
    console.error("Customer password update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to change your password. Please try again.",
      },
      { status: 500 }
    );
  }
}
