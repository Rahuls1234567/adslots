# 🐘 Creating Admin User with pgAdmin

## Step-by-Step Guide

### Method 1: Using Query Tool (Recommended)

1. **Open pgAdmin**
   - Launch pgAdmin application

2. **Connect to Your Server**
   - Expand "Servers" in left panel
   - Click on your PostgreSQL server
   - Enter password if prompted

3. **Select Your Database**
   - Expand "Databases"
   - Right-click on **"adslotpro"** database
   - Select **"Query Tool"**

4. **Copy and Paste SQL**
   
   Copy this SQL code (admins don't need business details!):
   ```sql
   INSERT INTO users (
     phone, 
     name, 
     email, 
     role,
     is_active
   )
   VALUES (
     '+919999999999',
     'Admin User',
     'admin@time.com',
     'admin',
     true
   );
   ```

5. **Execute the Query**
   - Click the **"Execute/Run"** button (▶️ icon)
   - Or press **F5**

6. **Verify Success**
   - You should see: `INSERT 0 1` in the output
   - This means 1 row was inserted successfully!

7. **Check the User**
   
   Run this query to verify:
   ```sql
   SELECT id, name, email, phone, role, is_active 
   FROM users 
   WHERE role = 'admin';
   ```
   
   You should see your admin user in the results!

---

### Method 2: Using SQL File (Alternative)

1. **Open pgAdmin**

2. **Connect to Database**
   - Navigate to your "adslotpro" database

3. **Open Query Tool**
   - Right-click on database → Query Tool

4. **Open File**
   - Click **"Open File"** icon (📁)
   - Navigate to your project folder
   - Select **`CREATE_ADMIN.sql`**

5. **Execute**
   - Click **"Execute/Run"** button (▶️)
   - Done!

---

## 🎯 Quick Copy-Paste

Just copy this and paste in pgAdmin Query Tool:

```sql
-- Create Admin User (no business details needed!)
INSERT INTO users (
  phone, 
  name, 
  email, 
  role,
  is_active
)
VALUES (
  '+919999999999',
  'Admin User',
  'admin@time.com',
  'admin',
  true
);

-- Verify it was created
SELECT id, name, email, phone, role, is_active 
FROM users 
WHERE role = 'admin';
```

---

## 📸 Visual Guide

### Step 1: Open Query Tool
```
pgAdmin → Servers → PostgreSQL → Databases → 
Right-click "adslotpro" → Query Tool
```

### Step 2: Paste SQL
```
[Query Tool Window]
┌─────────────────────────────────────┐
│ INSERT INTO users (                 │
│   phone,                            │
│   name,                             │
│   ...                               │
│ );                                  │
└─────────────────────────────────────┘
```

### Step 3: Click Execute
```
[Toolbar]
▶️ Execute/Run (F5)
```

### Step 4: See Success
```
[Output]
INSERT 0 1
Query returned successfully in 45 msec.
```

---

## ✅ Verification Steps

After creating the admin, verify it worked:

1. **Check in pgAdmin:**
   ```sql
   SELECT * FROM users WHERE role = 'admin';
   ```

2. **Try to Login:**
   - Go to http://localhost:5000/login
   - Phone: `+919999999999`
   - Get OTP from terminal
   - Login should work!

---

## 🔧 Troubleshooting

### Error: "relation 'users' does not exist"

**Solution:** Run database migration first
```bash
npm run db:push
```

Then try creating admin again.

### Error: "duplicate key value violates unique constraint"

**Solution:** Admin already exists! Try logging in with:
- Phone: `+919999999999`

Or check existing users:
```sql
SELECT * FROM users;
```

### Error: "invalid input value for enum user_role"

**Solution:** Make sure you ran `npm run db:push` to update the schema with the new "admin" role.

---

## 🎨 Alternative: Create Custom Admin

Want different details? Modify the SQL:

```sql
INSERT INTO users (
  phone, 
  name, 
  email, 
  role,
  is_active
)
VALUES (
  '+918888888888',           -- Your phone number
  'Your Name',               -- Your name
  'your@email.com',          -- Your email
  'admin',                   -- Keep as 'admin'
  true                       -- Keep as true
);
```

**Note:** Admins don't need business details (GST, school name, address). Those are only for clients!

---

## 📱 After Creating Admin

1. **Login:**
   - http://localhost:5000/login
   - Enter your phone number
   - Get OTP from terminal (check console)
   - Enter OTP

2. **You'll See:**
   - Admin Dashboard with shield icon 🛡️
   - "Create User" button
   - Statistics cards
   - User management interface

3. **Start Creating Users:**
   - Click "Create User"
   - Fill form
   - Select role (Manager, VP, Client, etc.)
   - No more SQL needed!

---

## 🎉 You're Done!

Once you see the admin user in the query results, you're all set!

**Next Steps:**
1. Login as admin
2. Create other users through the UI
3. Enjoy your Admin Panel! 🚀

---

## 💡 Pro Tips

### Tip 1: Save Your Queries
In pgAdmin, you can save frequently used queries:
- File → Save
- Give it a name like "Create Admin"
- Reuse anytime!

### Tip 2: Use Multiple Admins
Create multiple admin accounts for your team:
```sql
-- Admin 1
INSERT INTO users (phone, name, email, role, is_active)
VALUES ('+919999999999', 'Admin 1', 'admin1@time.com', 'admin', true);

-- Admin 2
INSERT INTO users (phone, name, email, role, is_active)
VALUES ('+918888888888', 'Admin 2', 'admin2@time.com', 'admin', true);
```

### Tip 3: Bookmark Query Tool
Right-click on "adslotpro" database → Add to Favorites
Quick access next time!

---

## 📞 Need Help?

If you're stuck:
1. Check that database "adslotpro" exists
2. Make sure you ran `npm run db:push`
3. Verify PostgreSQL is running
4. Check the error message in pgAdmin output panel

---

**Happy Admin Creating!** 🐘✨
