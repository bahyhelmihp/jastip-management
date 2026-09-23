import { NextResponse } from "next/server";
import db from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
    }

    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken || verificationToken.type !== "EMAIL_VERIFICATION") {
      return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
    }

    if (new Date() > verificationToken.expires_at) {
      await db.verificationToken.delete({ where: { id: verificationToken.id } });
      return NextResponse.json({ error: "Verification link has expired. Please register again." }, { status: 400 });
    }

    // Update user status
    await db.user.update({
      where: { id: verificationToken.user_id },
      data: { email_verified: true },
    });

    // Delete token
    await db.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Set session cookie automatically upon verification
    await setSessionCookie(verificationToken.user.id, verificationToken.user.email);

    return NextResponse.json({
      message: "Email verified successfully!",
      user: {
        id: verificationToken.user.id,
        email: verificationToken.user.email,
        name: verificationToken.user.name,
      },
    });
  } catch (error: any) {
    console.error("Verify email error:", error);
    return NextResponse.json({ error: "Failed to verify email" }, { status: 500 });
  }
}
