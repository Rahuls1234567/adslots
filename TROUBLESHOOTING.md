# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### 1. ❌ Error: "POST /api/auth/send-otp 400"

**Problem:** Cannot send OTP when trying to login

**Possible Causes:**
1. Phone number doesn't exist in database
2. Database connection issue
3. Invalid phone format

**Solutions:**

#### Solution A: Create Admin User First
Before you can login, you need to create an admin user in the database:

```sql
INSERT INTO users (phone, name, email, role, is_active)
VALUES ('+919999999999', 'Admin User', 'admin@time.com', 'admin', true);
```

#### Solution B: Check Phone Format
Make sure phone number includes country code:
- ✅ Correct: `+919999999999`
- ❌ Wrong: `9999999999`
- ❌ Wrong: `919999999999`

#### Solution C: Verify Database Connection
```bash
# Check if database is running
psql -U postgres -h localhost -d adslotpro -c "SELECT 1;"
```

---

### 2. ❌ Error: "relation 'users' does not exist"

**Problem:** Database tables not created

**Solution:**
```bash
npm run db:push
```

---

### 3. ❌ Error: "DATABASE_URL must be set"

**Problem:** Environment variables not loading

**Solution:**
1. Make sure `.env` file exists in root directory
2. Check `.env` has `DATABASE_URL` set
3. Restart the server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

---

### 4. ⚠️ Warning: "Error checking expiring campaigns"

**Problem:** WebSocket connection error (Neon-specific)

**Status:** ✅ **This is NORMAL for local PostgreSQL!**

**Explanation:** This error appears because the code tries to use Neon's WebSocket connection, but you're using local PostgreSQL. It doesn't affect functionality.

**To Fix (Optional):**
The error is already handled in the code. You can ignore it, or it will disappear once you have actual bookings to check.

---

### 5. ❌ Cannot Login - "Invalid or expired OTP"

**Problem:** OTP not working

**Solutions:**

#### Check Terminal for OTP
The OTP is printed in your terminal/console:
```
🔐 OTP for +919999999999: 123456
```

#### OTP Expired
OTPs expire after 10 minutes. Request a new one.

#### Wrong Phone Number
Make sure you're using the exact phone number from the database.

---

### 6. ❌ "Email already registered" or "Phone already registered"

**Problem:** Trying to sign up with existing credentials

**Solution:**
Use the **Login** option instead of Sign Up, or use different email/phone.

---

### 7. 🐘 pgAdmin Connection Issues

**Problem:** Cannot connect to database in pgAdmin

**Solutions:**

#### Check PostgreSQL is Running
```bash
# Linux/Mac
sudo service postgresql status

# Windows
# Check Services app for PostgreSQL service
```

#### Verify Connection Details
- Host: `localhost`
- Port: `5432`
- Database: `adslotpro`
- Username: `postgres`
- Password: Your PostgreSQL password

---

### 8. ❌ "invalid input value for enum user_role: 'admin'"

**Problem:** Database schema not updated with admin role

**Solution:**
```bash
npm run db:push
```

This adds the 'admin' role to the database.

---

### 9. 🔄 Changes Not Reflecting

**Problem:** Code changes not showing up

**Solutions:**

#### Restart Development Server
```bash
# Stop server (Ctrl+C in terminal)
npm run dev
```

#### Clear Browser Cache
- Press `Ctrl + Shift + R` (hard refresh)
- Or clear browser cache

#### Check Console for Errors
- Press `F12` in browser
- Check Console tab for errors

---

### 10. ❌ Port 5000 Already in Use

**Problem:** Another process using port 5000

**Solutions:**

#### Linux/Mac:
```bash
# Find process
lsof -ti:5000

# Kill process
lsof -ti:5000 | xargs kill -9
```

#### Windows:
```bash
# Find process
netstat -ano | findstr :5000

# Kill process (replace PID with actual number)
taskkill /PID <PID> /F
```

#### Or Change Port:
Edit `.env`:
```env
PORT=3000
```

---

## 🔍 Debugging Steps

### Step 1: Check Server is Running
Look for this message:
```
[express] serving on port 5000
```

### Step 2: Check Database Connection
```bash
psql -U postgres -h localhost -d adslotpro -c "\dt"
```

Should show list of tables.

### Step 3: Check Admin User Exists
```sql
SELECT * FROM users WHERE role = 'admin';
```

Should return at least one row.

### Step 4: Test OTP Generation
Try to login and check terminal for:
```
🔐 OTP for +919999999999: 123456
```

### Step 5: Check Browser Console
Press `F12` and look for errors in Console tab.

---

## 📞 Still Having Issues?

### Collect This Information:

1. **Error Message** - Full error from terminal
2. **Browser Console** - Any errors in F12 console
3. **What You're Trying** - Login? Signup? Create user?
4. **Database Status** - Is PostgreSQL running?
5. **Environment** - Check `.env` file exists

### Common Fixes Checklist:

- [ ] Ran `npm install`
- [ ] Ran `npm run db:push`
- [ ] Created `.env` file
- [ ] PostgreSQL is running
- [ ] Created admin user in database
- [ ] Server is running (`npm run dev`)
- [ ] Using correct phone format (+91...)
- [ ] Checked terminal for OTP code

---

## 💡 Pro Tips

### Tip 1: Always Check Terminal
The OTP code is printed in the terminal where you ran `npm run dev`.

### Tip 2: Use pgAdmin
It's easier to manage database with pgAdmin than command line.

### Tip 3: Fresh Start
If everything is broken:
```bash
# Stop server
Ctrl+C

# Push schema
npm run db:push

# Start server
npm run dev

# Create admin in pgAdmin
# Then try to login
```

### Tip 4: Check Logs
Server logs show all API calls and errors. Watch the terminal!

---

## 🎯 Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| Can't login | Create admin user first |
| No OTP | Check terminal output |
| Database error | Run `npm run db:push` |
| Port in use | Change PORT in `.env` |
| Changes not showing | Restart server |
| Can't connect DB | Check PostgreSQL running |

---

**Most Common Issue:** Trying to login before creating admin user!

**Solution:** Create admin user in pgAdmin first, then login.
