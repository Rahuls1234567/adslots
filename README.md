# 🎯 Ad Banner Management System - TIME

A complete automated ad banner management platform for TIME's digital ecosystem.

## 🆕 NEW: Admin Panel - No SQL Required!

The latest update includes a **powerful Admin Panel** that eliminates the need for SQL commands:

### ✨ Key Features:
- 🛡️ **Create Users** - Click button, fill form, done! (No SQL!)
- 🔄 **Change Roles** - Dropdown selection, instant update
- ✅ **Activate/Deactivate** - Toggle switch for account control
- 🗑️ **Delete Users** - With confirmation dialog
- 📊 **System Dashboard** - Statistics and monitoring
- 👀 **Complete Visibility** - View all bookings and slots

### 🎯 Benefits:
- ✅ No SQL knowledge required
- ✅ User-friendly interface
- ✅ Real-time updates
- ✅ Complete system control
- ✅ Safe operations with confirmations

**See `ADMIN_GUIDE.md` for complete documentation!**

---

## 🚀 Quick Start Guide

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Setup Database

1. **Create a PostgreSQL database** (or use a cloud service like Neon, Supabase, etc.)

2. **Create `.env` file** in the root directory:

```env
DATABASE_URL=postgresql://username:password@host:port/database_name
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5000

# Email Settings (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password

# WhatsApp (Optional - can skip for now)
WHATSAPP_API_URL=
WHATSAPP_API_KEY=

# Session Secret (generate using command below)
SESSION_SECRET=your_generated_secret_here
```

3. **Push database schema**:

```bash
npm run db:push
```

### Step 3: Start the Application

```bash
npm run dev
```

The application will start at: **http://localhost:5000**

### Step 4: Create Admin User (One-time)

**Create your first admin to manage everything through the UI:**

#### Using pgAdmin (Easiest - Recommended!):

1. Open **pgAdmin**
2. Connect to your PostgreSQL server
3. Right-click on **"adslotpro"** database → **Query Tool**
4. Copy and paste this SQL (admins don't need business details!):
   ```sql
   INSERT INTO users (phone, name, email, role, is_active)
   VALUES ('+919999999999', 'Admin User', 'admin@time.com', 'admin', true);
   ```
5. Click **Execute/Run** button (▶️) or press **F5**
6. Done! ✅

**See `PGADMIN_SETUP.md` for detailed guide with screenshots!**

#### Using Command Line (Alternative):

```bash
psql -U postgres -h localhost -d adslotpro -f CREATE_ADMIN.sql
```

### Step 5: Login as Admin

1. Go to http://localhost:5000/login
2. Phone: `+919999999999`
3. Get OTP from terminal
4. **Admin Dashboard appears!** 🎉

### Step 6: Create Other Users (No SQL!)

1. Click **"Create User"** button in Admin Dashboard
2. Fill in details (name, email, phone, role, etc.)
3. Select role: Manager, VP, Client, etc.
4. Click "Create User"
5. **Done!** User created instantly!

---

## �  Generate Session Secret

You need a secure random string for `SESSION_SECRET`. Use one of these methods:

### Method 1: Using Node.js (Recommended)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Method 2: Using OpenSSL
```bash
openssl rand -hex 32
```

### Method 3: Online Generator
Visit: https://generate-secret.vercel.app/32

Copy the generated string and paste it in your `.env` file as `SESSION_SECRET`

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

## 📧 Email Setup (Gmail)

To enable email notifications:

1. Go to your **Google Account** → **Security**
2. Enable **2-Step Verification**
3. Go to **App passwords** (search for it)
4. Create a new app password for "Mail"
5. Copy the 16-character password
6. Put it in `.env` as `SMTP_PASSWORD`

**Example:**
```env
SMTP_USER=yourname@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
```

---

## 👤 First Time Setup

### Create Your First User

1. Open **http://localhost:5000/login**
2. Click **"Sign Up"**
3. Fill in the form:
   - Name
   - Email
   - Phone (with country code, e.g., +919876543210)
   - Business School Name
   - School Address
   - GST Number (format: 27AABCT1234A1Z5)
4. Click **"Sign Up"**
5. Check your **terminal/console** for the OTP code
6. Enter the OTP to verify

**Note:** The first user will be a "Client" by default.

### Create a Manager User (Required)

To approve bookings, you need a Manager. Run this SQL in your database:

```sql
INSERT INTO users (phone, name, email, role, business_school_name, school_address, gst_number)
VALUES (
  '+919999999999',
  'Manager Name',
  'manager@time.com',
  'manager',
  'TIME Institute',
  'Mumbai, India',
  '27AABCT1234A1Z5'
);
```

Now you can login as manager using phone `+919999999999`

---

## 🎮 How to Use the System

### As an Admin:

1. **Login** with admin phone number
2. **Create Users** (No SQL needed!):
   - Click "Create User" button
   - Fill in name, email, phone
   - Select role (Manager, VP, Client, etc.)
   - Fill business details
   - Click "Create User"
3. **Manage Users**:
   - Toggle Active/Inactive status
   - Change user roles with dropdown
   - Delete users if needed
4. **Monitor System**:
   - View statistics dashboard
   - Check all bookings
   - Monitor slot utilization

### As a Manager:

1. **Login** with manager phone number
2. **Create Slots**:
   - Click "Create Slot" button
   - Select Media Type (Website, Mobile, Email, Magazine)
   - Select Page Type (Main, Course, Webinar, etc.)
   - Enter Position (e.g., "header", "sidebar")
   - Enter Dimensions (e.g., "728x90", "300x250")
   - Set Price
   - Click "Create Slot"

### As a Client:

1. **Login** with your phone number
2. **Book a Slot**:
   - Select Start Date and End Date
   - Choose Page Type from dropdown
   - Click on an available slot (green boxes)
   - Upload your banner image
   - Click "Submit Booking"
3. **View Analytics**:
   - Go to Analytics page
   - Select your campaign
   - See impressions, clicks, and CTR

### Approval Flow:

```
Client Books → Manager Approves → VP Approves → PV Sir Approves → 
Payment → IT Deploys → Campaign Live
```

Each step sends **Email + WhatsApp + In-App** notifications automatically.

---

## 📊 Features Included

✅ **Authentication**
- OTP-based login
- Role-based access (Admin, Client, Manager, VP, PV Sir, Accounts, IT)

✅ **Slot Management**
- Create/edit slots
- Multiple media types
- Real-time availability

✅ **Booking System**
- Date range selection
- Banner upload
- Multi-stage approval workflow

✅ **Notifications**
- Email (HTML templates)
- WhatsApp messages
- In-app notification bell

✅ **Analytics**
- Impression tracking
- Click tracking
- CTR calculation
- Visual charts
- CSV export

✅ **Automation**
- Auto-expire campaigns
- Expiry reminders (2 days before)
- Payment reminders
- Automated workflow

✅ **Admin Panel** (NEW!)
- Create users through UI (no SQL!)
- Change user roles instantly
- Activate/deactivate accounts
- Delete users
- System statistics dashboard
- Complete system control

---

## 🛠 Available Commands

```bash
# Development
npm run dev              # Start dev server with hot-reload

# Production
npm run build           # Build for production
npm start               # Start production server

# Database
npm run db:push         # Push schema to database

# Type Checking
npm run check           # Check TypeScript types
```

---

## 📁 Project Structure

```
AdSlotPro/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities
│   │   └── App.tsx        # Main app
│   └── index.html
├── server/                # Backend Express app
│   ├── services/          # Business logic
│   │   ├── email.ts       # Email notifications
│   │   ├── whatsapp.ts    # WhatsApp notifications
│   │   ├── notification.ts # Notification orchestrator
│   │   ├── analytics.ts   # Analytics tracking
│   │   └── cron.ts        # Automated tasks
│   ├── routes.ts          # API endpoints
│   ├── db.ts              # Database connection
│   └── index.ts           # Server entry
├── shared/                # Shared types
│   └── schema.ts          # Database schema
├── .env                   # Environment variables
└── package.json
```

---

## 🔧 Troubleshooting

### Problem: Database connection error

**Solution:**
- Check your `DATABASE_URL` format
- Make sure PostgreSQL is running
- Verify database name is complete (not just `ro`)
- Test connection: `psql -U postgres -h localhost -d adslotpro`

### Problem: "DATABASE_URL must be set" error

**Solution:**
The `.env` file is not being loaded. This is now fixed with `dotenv/config`.
If you still see this error:
1. Make sure `.env` file exists in root directory
2. Restart the server: Stop and run `npm run dev` again
3. Check that `dotenv` is installed: `npm install dotenv`

### Problem: Email not sending

**Solution:**
- Use Gmail App Password (not regular password)
- Enable 2-Factor Authentication first
- Check SMTP settings are correct

### Problem: OTP not showing

**Solution:**
- Check your terminal/console logs
- OTP is printed there during development
- Format: `OTP for +919876543210: 123456`

### Problem: "Slot not available" error

**Solution:**
- Make sure you created slots as Manager first
- Check date range doesn't overlap with existing bookings
- Verify slot status is "available"

### Problem: Port 5000 already in use

**Solution:**
```bash
# Change port in .env
PORT=3000

# Or kill the process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill -9
```

---

## 🎯 User Roles & Permissions

| Role | Access Level | Can Do |
|------|--------------|--------|
| **Admin** | 🔴 Highest | Create users, manage roles, system control |
| **Manager** | 🟠 High | Create slots, approve bookings, view revenue |
| **VP** | 🟡 Medium-High | Second-level approval, view reports |
| **PV Sir** | 🟡 Medium-High | Final approval, executive dashboard |
| **Accounts** | 🟢 Medium | Track payments, attach invoices |
| **IT** | 🟢 Medium | Deploy banners, manage technical aspects |
| **Client** | 🔵 Standard | Book slots, upload banners, view analytics |

---

## 📞 Support

If you encounter issues:

1. Check the terminal for error messages
2. Check browser console (F12) for frontend errors
3. Verify `.env` file has all required variables
4. Make sure database is running and accessible
5. Check `IMPLEMENTATION_STATUS.md` for feature status

---

## 🎨 Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Notifications:** Nodemailer (Email), WhatsApp Business API
- **Analytics:** Recharts for visualization
- **Storage:** Replit Object Storage

---

## 📝 Environment Variables Reference

```env
# Required
DATABASE_URL=postgresql://user:pass@host:port/db
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5000
SESSION_SECRET=generate_using_command_above

# Email (Required for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# WhatsApp (Optional)
WHATSAPP_API_URL=https://api.provider.com
WHATSAPP_API_KEY=your_api_key
```

---

## 🚦 Getting Started Checklist

- [ ] Install Node.js 18+
- [ ] Install PostgreSQL
- [ ] Clone/download project
- [ ] Run `npm install`
- [ ] Create `.env` file
- [ ] Setup Gmail app password
- [ ] Run `npm run db:push`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:5000
- [ ] Create admin user in database (SQL)
- [ ] Login as admin
- [ ] Create manager through admin UI (no SQL!)
- [ ] Create other users as needed
- [ ] Login as manager and create slots
- [ ] Test booking flow

---

## 📚 Additional Documentation

- `QUICK_START.md` - Quick start guide
- `ADMIN_GUIDE.md` - Complete admin panel guide
- `PGADMIN_SETUP.md` - How to create admin using pgAdmin (NEW!)
- `ADMIN_PANEL_SUMMARY.md` - Admin features summary
- `SETUP_GUIDE.md` - Detailed setup instructions
- `IMPLEMENTATION_STATUS.md` - Feature completion status
- `CREATE_ADMIN.sql` - SQL to create first admin
- `.env.example` - Environment variable template

---

## 🎉 You're Ready!

Your Ad Banner Management System is now running with a powerful Admin Panel!

### 🚀 Quick Start:
1. Create admin user (one-time SQL)
2. Login as admin
3. Create all other users through the UI
4. No more SQL commands needed!

**Default URL:** http://localhost:5000

**Admin Panel:** Login with admin credentials to access full system control

**Happy Managing! 🚀**

---

## 🆕 What's New - Admin Panel

The latest update includes a **complete Admin Panel** that eliminates the need for SQL commands:

### Key Features:
- ✅ **Create Users** - Click button, fill form, done!
- ✅ **Change Roles** - Dropdown selection, instant update
- ✅ **Activate/Deactivate** - Toggle switch for account control
- ✅ **Delete Users** - With confirmation dialog
- ✅ **System Dashboard** - Statistics and monitoring
- ✅ **Complete Visibility** - View all bookings and slots

### Benefits:
- 🚫 **No SQL Required** - Everything through beautiful UI
- ⚡ **Instant Changes** - Real-time updates
- 🎨 **User-Friendly** - Clean, modern interface
- 🔒 **Safe Operations** - Confirmation dialogs
- 📊 **Complete Control** - Manage entire system

**See `ADMIN_GUIDE.md` for complete documentation!**
