# CHEF-TEKETEL

**CHEF TEKETEL** is an intelligent multilingual food ordering, menu management, and cafe administration platform built with React, TypeScript, Tailwind CSS, and Supabase.

---

## 🍽️ Features

- 🌐 **Multilingual Support**: Real-time trilingual interface supporting English (`en`), Amharic (`am`), and Sidaamu Afoo (`sid`).
- 📱 **QR & Customer Ordering**:
  - Browse dishes categorized with dynamic subcategories.
  - Interactive dish modal with options and variations (price deltas computed from database).
  - Dine-in and Takeaway checkout modes.
  - Cash, Telebirr, and Bank Transfer payment support with receipt screenshot upload.
  - Order status tracking with database-generated order numbers (`CT-YYYYMMDD-NNNNN`).
- 🔐 **Secure Admin Portal**:
  - Protected dashboard authenticated via Supabase Auth and verified against the `admin_users` table (`is_active = true`).
  - Secure password updates and policy enforcement.
  - Live kitchen orders management with status transitions (`pending`, `confirmed`, `completed`, `rejected`).
  - Private payment receipt verification using short-lived signed URLs.
- 🥘 **Menu Management**:
  - Add, edit, delete, and toggle availability of food items and variations.
  - Dual image support: upload from computer to public `food-images` bucket or enter an image URL with live preview.
- 🗄️ **Supabase Database Architecture**:
  - Single source of truth for categories, subcategories, dishes, variations, orders, and audit history.
  - Strict Row Level Security (RLS) policies.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling & UI**: Tailwind CSS, Lucide Icons, Framer Motion, shadcn/ui
- **Backend & Auth**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm or bun

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your Supabase project credentials:
```bash
cp .env.example .env
```
Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Database Setup
Run the SQL migration script `supabase_setup.sql` in the **Supabase SQL Editor** to:
- Create the storage buckets (`food-images` and `payment-proofs`) and their access policies.
- Create the `submit_order` atomic stored procedure.
- Provision seed categories, dishes, and initial administrator permissions.

### 5. Start Development Server
```bash
npm run dev
```

### 6. Build for Production
```bash
npm run build
```

---

## 📄 License
Private repository for CHEF TEKETEL.
