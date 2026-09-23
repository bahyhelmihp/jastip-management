# Jastip Management Pro 🚀

A full-featured web application for **Jastip** (Jasa Titip / proxy shopping & shipping services), specifically tailored for Korea ↔ Indonesia routes (`ICN ↔ CGK`). Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, Prisma ORM, and SQLite.

---

## 🌟 Key Features

### 👤 Multi-User Authentication & Multi-Tenancy
- **User Registration & Email Verification**: Users can register with Email, Name, and Password. Email verification links are automatically sent via SMTP.
- **Graceful Fallback**: If SMTP is unconfigured or fails in development, verification links are printed to the server console and displayed on-screen.
- **Password Reset**: Forgot-password flow generates secure 1-hour reset tokens sent via email.
- **Account Management**: View profile details, account status, or permanently delete accounts with password confirmation.
- **Isolated User Workspaces**: Each user manages their own separate shipping invoices, route pricing rules, and bank account details.

### 🛡️ Admin User Management Portal (`/admin`)
- **Seeded Admin Account**: Default administrator access out of the box (`admin@jastip.com` / `admin123456`).
- **User Dashboard**: View total registered users, verification rates, and total invoice statistics across the platform.
- **Role Management**: Promote or demote users between `USER` and `ADMIN` roles.
- **Account Moderation**: Permanently delete any user account along with cascading cleanup of their invoices and settings.

### 📄 Invoice Management & Dual-Currency Calculation
- **Dashboard & Filtering**: Search and filter shipping invoices by customer name, route, payment status, or delivery status.
- **Automated Pricing Logic**: Tiered rate calculations (>5kg), pickup discounts, and itemized extra charges.
- **Multi-Currency Support**: Real-time KRW / IDR conversion with customizable exchange rate buffers.
- **PDF Invoice Export**: Download professional PDF invoices with company logo, itemized calculations, and payment instructions.
- **Public Customer Links**: Shareable customer invoice URLs (`/invoices/[id]`) accessible without login.

### 🌐 Cloudflare Tunnel & Custom Domain Support
- **Dynamic Base URL (`APP_BASE_URL`)**: Configurable in `.env` so verification and reset links work seamlessly behind Cloudflare Tunnels (`trycloudflare.com`) or custom domains.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database & ORM**: SQLite + Prisma ORM
- **Authentication**: Custom HTTP-Only JWT Sessions (`jose`) & `bcryptjs`
- **Email Delivery**: `nodemailer` (Gmail SMTP / Custom SMTP)
- **Styling**: Tailwind CSS & Lucide Icons
- **PDF Generation**: `jspdf` & `jspdf-autotable`

---

## 📋 Prerequisites

- **Node.js**: `v20.9.0` or higher (Recommended Node 22)
- **npm**: bundle included with Node.js

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd jastip-management
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` to configure your database, secret key, public domain, and SMTP credentials:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-custom-secret-key"

# Cloudflare Tunnel / Public Domain URL
APP_BASE_URL="https://librarian-sold-filename-shipped.trycloudflare.com"

# Gmail / Custom SMTP Credentials
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM="Jastip Pro" <your-email@gmail.com>
```

### 3. Initialize Database & Seed Admin Account

```bash
# Push Prisma schema to SQLite
npx prisma db push

# Seed default routes & Admin account
npm run db:seed
```

### 4. Run the Development / Production Server

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm run start
```

Access the application at [http://localhost:3000](http://localhost:3000).

---

## 🔑 Default Admin Account

| Field | Value |
| :--- | :--- |
| **Login URL** | [http://localhost:3000/login](http://localhost:3000/login) |
| **Email** | `admin@jastip.com` |
| **Password** | `admin123456` |
| **Role** | `ADMIN` |

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with Turbopack. |
| `npm run build` | Syncs Prisma database schema and builds the app for production. |
| `npm run start` | Launches the Next.js production server. |
| `npm run db:push` | Pushes Prisma schema changes directly to SQLite (`prisma/dev.db`). |
| `npm run db:seed` | Seeds default route settings and the default Admin account. |

---

## 🏗️ Project Structure

```text
jastip-management/
├── app/                  # Next.js App Router pages and API routes
│   ├── account/          # User profile & account deletion page
│   ├── admin/            # Admin User Management Portal
│   ├── api/              # API Endpoints (auth, invoices, admin, settings, backup)
│   ├── forgot-password/  # Password reset request page
│   ├── invoices/         # Invoice creation & public PDF view pages
│   ├── login/            # Login page UI
│   ├── register/         # Registration page UI
│   ├── reset-password/   # New password submission page
│   ├── settings/         # Shipping route & bank details page
│   ├── verify-email/     # Email verification status page
│   └── page.tsx          # Main dashboard & invoice list
├── components/           # Reusable components (Navbar, etc.)
├── lib/                  # Utilities, Prisma instance, Auth JWT, Email delivery
│   ├── auth.ts           # JWT session & bcrypt authentication helpers
│   ├── db.ts             # Prisma client instance
│   ├── mail.ts           # Nodemailer email sender & templates
│   ├── pdf.ts            # PDF Invoice generator
│   └── utils.ts          # Invoice math, totalan text, & URL helpers
├── prisma/               # Prisma ORM configuration
│   ├── schema.prisma     # SQLite database schema
│   ├── dev.db            # Local SQLite database
│   └── seed.js           # Database seed script
└── public/               # Static assets & logos
```

---

## 📄 License

Private Repository. All rights reserved.
