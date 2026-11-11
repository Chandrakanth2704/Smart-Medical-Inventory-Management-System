import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Session expired." },
        { status: 401 }
      );
    }

    // Renew the session for another 30 minutes.
    await createSession(session);

    return NextResponse.json({
      success: true,
      message: "Session renewed.",
    });
  } catch (error) {
    console.error("Session activity error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to renew session." },
      { status: 500 }
    );
  }
}
