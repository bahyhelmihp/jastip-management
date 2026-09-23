import { NextResponse } from "next/server";
import db from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mail";
import { getAppBaseUrl } from "@/lib/utils";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Return success to avoid email enumeration
      return NextResponse.json({
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Delete existing reset tokens for user
    await db.verificationToken.deleteMany({
      where: { user_id: user.id, type: "PASSWORD_RESET" },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.verificationToken.create({
      data: {
        user_id: user.id,
        token,
        type: "PASSWORD_RESET",
        expires_at: expiresAt,
      },
    });

    const baseUrl = getAppBaseUrl(req);

    const mailResult = await sendPasswordResetEmail(normalizedEmail, token, baseUrl);

    return NextResponse.json({
      message: "If an account with that email exists, a password reset link has been sent.",
      dev_reset_url: (mailResult.mode === "console" || !mailResult.sent) ? mailResult.resetUrl : undefined,
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process forgot password request" }, { status: 500 });
  }
}
