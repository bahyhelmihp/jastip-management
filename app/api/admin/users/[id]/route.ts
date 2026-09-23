import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const currentUser = await getSessionUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (currentUser.id === params.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own active admin account' },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user (cascade will delete associated invoices, settings, tokens)
    await db.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: `User ${targetUser.email} deleted successfully` });
  } catch (error: any) {
    console.error('Admin DELETE user error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const currentUser = await getSessionUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { role, email_verified } = body;

    const dataToUpdate: any = {};
    if (role && (role === 'ADMIN' || role === 'USER')) {
      dataToUpdate.role = role;
    }
    if (typeof email_verified === 'boolean') {
      dataToUpdate.email_verified = email_verified;
    }

    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        email_verified: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Admin PATCH user error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}
