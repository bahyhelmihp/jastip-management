import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUser, comparePassword, clearSessionCookie } from "@/lib/auth";

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "Password confirmation is required" }, { status: 400 });
    }

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!fullUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await comparePassword(password, fullUser.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
    }

    // Delete user (cascade will delete invoices, settings, tokens)
    await db.user.delete({
      where: { id: user.id },
    });

    await clearSessionCookie();

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
