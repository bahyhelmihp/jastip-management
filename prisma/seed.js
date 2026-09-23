const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const DEFAULT_KRW_BANK = `토스뱅크 Toss Bank
100043237236
Putra Bahy Helmi Hartoyo`;

const DEFAULT_IDR_BANK = `BCA 8410928123
a.n. Putra Bahy Helmi Hartoyo`;

async function main() {
  console.log('Seeding default Jastip settings and Admin account...');

  // 1. Seed Default Admin User
  const adminEmail = 'admin@jastip.com';
  const adminPasswordHash = await bcrypt.hash('admin123456', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'ADMIN',
      email_verified: true,
    },
    create: {
      email: adminEmail,
      name: 'System Admin',
      password_hash: adminPasswordHash,
      email_verified: true,
      role: 'ADMIN',
    },
  });

  console.log(`Admin user ready: ${adminUser.email} (Role: ${adminUser.role})`);

  // 2. Seed Default Global Route Settings
  await prisma.settings.upsert({
    where: { user_id_route: { user_id: adminUser.id, route: 'ICN → CGK' } },
    update: {},
    create: {
      user_id: adminUser.id,
      route: 'ICN → CGK',
      normal_price_per_kg: 13000,
      over_5kg_price_per_kg: 13000,
      pickup_discount_per_kg: 0,
      enable_over_5kg_price: false,
      enable_pickup_discount: false,
      krw_bank_account: DEFAULT_KRW_BANK,
      idr_bank_account: DEFAULT_IDR_BANK,
    },
  });

  await prisma.settings.upsert({
    where: { user_id_route: { user_id: adminUser.id, route: 'CGK → ICN' } },
    update: {},
    create: {
      user_id: adminUser.id,
      route: 'CGK → ICN',
      normal_price_per_kg: 9500,
      over_5kg_price_per_kg: 9000,
      pickup_discount_per_kg: 500,
      enable_over_5kg_price: true,
      enable_pickup_discount: true,
      krw_bank_account: DEFAULT_KRW_BANK,
      idr_bank_account: DEFAULT_IDR_BANK,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
