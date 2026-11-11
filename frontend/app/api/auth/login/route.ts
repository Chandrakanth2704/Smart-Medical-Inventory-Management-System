import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RowDataPacket } from "mysql2";
import { pool } from "@/lib/mysql";
import {
  createSession,
  verifyPassword,
  UserRole,
} from "@/lib/auth";

interface UserRow extends RowDataPacket {
  UserID: string | number;
  Username: string;
  PasswordHash: string;
  FullName: string;
  Email: string;
  Role: string;
  Status: string;
}

const loginSchema = z.object({
  username: z.string().trim().min(1).max(150),
  password: z.string().min(1).max(128),
});

const roleRedirects: Record<UserRole, string> = {
  ADMIN: "/inventory",
  CUSTOMER: "/store",
};

const customerReturnPaths = ["/cart", "/checkout"];

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid username and password.",
        },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;
    const loginIdentifier = username.toLowerCase();

    const [rows] = await pool.execute<UserRow[]>(
      `SELECT
        UserID,
        Username,
        PasswordHash,
        FullName,
        Email,
        Role,
        Status
       FROM users
       WHERE Username = ? OR Email = ?
       LIMIT 1`,
      [loginIdentifier, loginIdentifier]
    );

    const user = rows[0];

    if (!user || user.Status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    const passwordMatches = await verifyPassword(
      password,
      user.PasswordHash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    if (!["ADMIN", "CUSTOMER"].includes(user.Role)) {
      return NextResponse.json(
        {
          success: false,
          message: "This account has an invalid role.",
        },
        { status: 403 }
      );
    }

    const role = user.Role as UserRole;

    await createSession({
      userId: String(user.UserID),
      username: user.Username,
      fullName: user.FullName,
      email: user.Email,
      role,
    });

    // Only CUSTOMER accounts can use the requested return path.
    // Restrict destinations to prevent open redirects.
    const requestedDestination =
      request.nextUrl.searchParams.get("next");

    const redirectTo =
      role === "CUSTOMER" &&
      requestedDestination &&
      customerReturnPaths.includes(requestedDestination)
        ? requestedDestination
        : roleRedirects[role];

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      redirectTo,
      user: {
        userId: String(user.UserID),
        username: user.Username,
        fullName: user.FullName,
        email: user.Email,
        role,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process login. Please try again.",
      },
      { status: 500 }
    );
  }
}
