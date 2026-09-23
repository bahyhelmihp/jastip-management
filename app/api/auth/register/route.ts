import { NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mail";
import { getAppBaseUrl } from "@/lib/utils";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email, name, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name ? name.trim() : null,
        password_hash: hashedPassword,
        email_verified: false,
      },
    });

    // Seed default settings for the new user
    await db.settings.createMany({
      data: [
        {
          user_id: user.id,
          route: "ICN -> CGK",
          normal_price_per_kg: 10000,
          over_5kg_price_per_kg: 9000,
          pickup_discount_per_kg: 1000,
          enable_over_5kg_price: true,
          enable_pickup_discount: true,
          exchange_rate_krw_to_idr: 13.07,
          krw_bank_account: "KB Kookmin Bank: 123456-04-789012 (BAHY)",
          idr_bank_account: "BCA: 876543210 (BAHY)",
        },
        {
          user_id: user.id,
          route: "CGK -> ICN",
          normal_price_per_kg: 120000,
          over_5kg_price_per_kg: 110000,
          pickup_discount_per_kg: 10000,
          enable_over_5kg_price: true,
          enable_pickup_discount: true,
          exchange_rate_krw_to_idr: 13.07,
          krw_bank_account: "KB Kookmin Bank: 123456-04-789012 (BAHY)",
          idr_bank_account: "BCA: 876543210 (BAHY)",
        },
      ],
    });

    // Create verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.verificationToken.create({
      data: {
        user_id: user.id,
        token,
        type: "EMAIL_VERIFICATION",
        expires_at: expiresAt,
      },
    });

    const baseUrl = getAppBaseUrl(req);

    const mailResult = await sendVerificationEmail(normalizedEmail, token, baseUrl);

    return NextResponse.json({
      message: "Registration successful. Please check your email to verify your account.",
      dev_verification_url: (mailResult.mode === "console" || !mailResult.sent) ? mailResult.verificationUrl : undefined,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: error.message || "Failed to register" }, { status: 500 });
  }
}
