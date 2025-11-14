# ⚡ Quick Start - Ad Banner Management System

## ✅ Your Application is Running!

**Server URL:** http://localhost:5000

---

## 🎯 What Just Happened

1. ✅ Installed `dotenv` package to load environment variables
2. ✅ Fixed database connection to work with local PostgreSQL
3. ✅ Server started successfully on port 5000
4. ✅ Cron jobs are running for automated tasks

---

## 🚀 Next Steps

### 1. Open the Application

Open your browser and go to:
```
http://localhost:5000
```

### 2. Create Your First User

1. Click **"Sign Up"**
2. Fill in the form:
   - Name: Your Name
   - Email: your@email.com
   - Phone: +919876543210 (with country code)
   - Business School Name: TIME Institute
   - School Address: Your Address
   - GST Number: 27AABCT1234A1Z5
3. Click **"Sign Up"**
4. Check your **terminal** for OTP code (it will be printed there)
5. Enter the OTP to verify

### 3. Create an Admin User (Recommended)

**Best approach:** Create an admin user first to manage everything through the UI!

Open your PostgreSQL and run:

```sql
-- Connect to your database
\c adslotpro

-- Create admin user
INSERT INTO users (phone, name, email, role, business_school_name, school_address, gst_number, is_active)
VALUES (
  '+919999999999',
  'Admin User',
  'admin@time.com',
  'admin',
  'TIME Institute',
  'Mumbai, India',
  '27AABCT1234A1Z5',
  true
);
```

Or use this command:
```bash
psql -U postgres -h localhost -d adslotpro -f CREATE_ADMIN.sql
```

**Why Admin First?**
- Create managers, VPs, and other users through the UI
- No need for SQL commands anymore
- Full control over user management
- Activate/deactivate accounts easily

### 4. Login as Admin and Create Users

1. Go to http://localhost:5000/login
2. Enter phone: `+919999999999`
3. Get OTP from terminal
4. You'll see the **Admin Dashboard** 🎉
5. Click **"Create User"** button
6. Create a Manager:
   - Name: Manager Name
   - Email: manager@time.com
   - Phone: +918888888888
   - Role: **Manager**
   - Fill other details
7. Click **"Create User"**

**Now you can create any user without SQL!**

### 5. Login as Manager and Create Slots

1. Logout from admin
2. Login with manager phone: `+918888888888`
3. Click **"Create Slot"** button
4. Fill in slot details:
   - Media Type: Website
   - Page Type: Main
   - Position: header
   - Dimensions: 728x90
   - Price: 10000
5. Click **"Create Slot"**

### 6. Test Booking Flow

1. Logout and login as Client
2. Select date range (start and end date)
3. Choose page type from dropdown
4. Click on an available slot (green box)
5. Upload a banner image
6. Click **"Submit Booking"**
7. Check notifications!

---

## 📊 Features You Can Test Now

### ✅ Working Features:

1. **Authentication**
   - OTP-based login
   - Role-based dashboards

2. **Slot Management** (Manager)
   - Create slots
   - View all slots
   - Block/unblock slots

3. **Booking System** (Client)
   - Browse available slots
   - Book slots with date range
   - Upload banners
   - Track booking status

4. **Notifications**
   - In-app notification bell (top right)
   - Email notifications (if SMTP configured)
   - WhatsApp notifications (if API configured)

5. **Analytics** (Client)
   - View campaign performance
   - See impressions and clicks
   - Export to CSV

6. **Approval Workflow**
   - Manager → VP → PV Sir → Accounts → IT
   - Automatic progression
   - Status tracking

---

## 🔧 Current Configuration

Your `.env` file:
```env
DATABASE_URL=postgresql://postgres:Aswin2153@localhost:5432/adslotpro
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5000
SESSION_SECRET=a14b2c32bada72a7c956d6b8d16c1a24cef08795f420ce4156c643f06dc9a574
```

---

## 📧 Optional: Setup Email Notifications

To enable email notifications:

1. **Get Gmail App Password:**
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Create App Password for "Mail"

2. **Update `.env`:**
   ```env
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_16_char_app_password
   ```

3. **Restart server:**
   - Stop: Ctrl+C in terminal
   - Start: `npm run dev`

---

## 🎮 Testing Checklist

- [ ] Open http://localhost:5000
- [ ] Sign up as Client
- [ ] Verify with OTP
- [ ] Create Manager user in database
- [ ] Login as Manager
- [ ] Create at least 3 slots
- [ ] Logout and login as Client
- [ ] Book a slot
- [ ] Upload banner
- [ ] Check notification bell
- [ ] Login as Manager
- [ ] Approve booking
- [ ] Check client notifications
- [ ] View analytics

---

## 🐛 Common Issues

### Server not starting?
```bash
# Check if port 5000 is in use
lsof -ti:5000 | xargs kill -9

# Restart
npm run dev
```

### Database connection error?
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start
```

### OTP not showing?
- Check your terminal/console
- OTP is printed there during development
- Format: `OTP for +919876543210: 123456`

---

## 📞 Need Help?

1. Check terminal for error messages
2. Check browser console (F12)
3. Review `README.md` for detailed docs
4. Check `IMPLEMENTATION_STATUS.md` for feature status

---

## 🎉 You're All Set!

Your Ad Banner Management System is running and ready to use!

**Happy Managing! 🚀**
