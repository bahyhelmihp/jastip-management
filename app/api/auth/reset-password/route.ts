import { NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const resetToken = await db.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.type !== "PASSWORD_RESET") {
      return NextResponse.json({ error: "Invalid or expired password reset link" }, { status: 400 });
    }

    if (new Date() > resetToken.expires_at) {
      await db.verificationToken.delete({ where: { id: resetToken.id } });
      return NextResponse.json({ error: "Password reset link has expired. Please request a new one." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    await db.user.update({
      where: { id: resetToken.user_id },
      data: {
        password_hash: hashedPassword,
        email_verified: true, // Also mark email as verified if resetting password
      },
    });

    await db.verificationToken.delete({
      where: { id: resetToken.id },
    });

    return NextResponse.json({ message: "Password has been reset successfully. You can now log in." });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
