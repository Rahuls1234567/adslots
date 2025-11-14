# 🛡️ Admin Panel Guide

## Overview

The Admin Panel gives you complete control over the Ad Banner Management System. As an admin, you can:

- ✅ Create and manage users with any role
- ✅ Activate/deactivate user accounts
- ✅ Change user roles on the fly
- ✅ Delete users
- ✅ View all bookings and slots
- ✅ Monitor system statistics
- ✅ Configure system settings

---

## 🚀 Creating Your First Admin User

### Method 1: Using SQL (Recommended)

1. **Connect to your database:**
   ```bash
   psql -U postgres -h localhost -d adslotpro
   ```

2. **Run the SQL command:**
   ```sql
   INSERT INTO users (
     phone, 
     name, 
     email, 
     role, 
     business_school_name, 
     school_address, 
     gst_number,
     is_active
   )
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

3. **Verify:**
   ```sql
   SELECT id, name, email, phone, role FROM users WHERE role = 'admin';
   ```

### Method 2: Using SQL File

```bash
psql -U postgres -h localhost -d adslotpro -f CREATE_ADMIN.sql
```

---

## 🔐 Logging in as Admin

1. Go to http://localhost:5000/login
2. Enter admin phone: `+919999999999`
3. Click "Send OTP"
4. Check your terminal for OTP code
5. Enter OTP and login
6. You'll be redirected to the Admin Dashboard

---

## 📊 Admin Dashboard Features

### 1. **Statistics Overview**

At the top of the dashboard, you'll see 5 key metrics:

- **Total Users** - Number of registered users (active count)
- **Total Bookings** - All booking requests (active count)
- **Total Revenue** - Sum of all booking amounts
- **Total Slots** - Available advertising slots
- **System Status** - Current system health

### 2. **User Management Tab**

#### Create New User

1. Click **"Create User"** button
2. Fill in the form:
   - Name
   - Email
   - Phone (with country code: +91...)
   - Role (Client, Manager, VP, PV Sir, Accounts, IT, Admin)
   - Business School Name
   - School Address
   - GST Number
3. Click **"Create User"**

**No SQL needed!** The user is created instantly.

#### Manage Existing Users

For each user, you can:

- **Toggle Active/Inactive** - Use the switch to enable/disable accounts
- **Change Role** - Select new role from dropdown
- **Delete User** - Click trash icon (with confirmation)

**Real-time Updates:** All changes apply immediately!

### 3. **Bookings Tab**

View all booking requests across the system:

- Booking ID
- Date range
- Status (pending, active, rejected, etc.)
- Amount

### 4. **Slots Tab**

View all advertising slots:

- Page type and position
- Dimensions and media type
- Pricing
- Status (available, booked, expired)

### 5. **Settings Tab**

Configure system-wide settings:

- **Email Notifications** - Enable/disable email alerts
- **WhatsApp Notifications** - Enable/disable WhatsApp messages
- **Auto-Approve Bookings** - Skip manual approval process
- **Maintenance Mode** - Put system in maintenance

---

## 👥 User Role Management

### Available Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Admin** | Full system access | 🔴 Highest |
| **Manager** | Approve bookings, create slots | 🟠 High |
| **VP** | Second-level approval | 🟡 Medium-High |
| **PV Sir** | Final approval authority | 🟡 Medium-High |
| **Accounts** | Payment tracking, invoices | 🟢 Medium |
| **IT** | Deploy banners, technical tasks | 🟢 Medium |
| **Client** | Book slots, view analytics | 🔵 Standard |

### Changing User Roles

1. Go to **User Management** tab
2. Find the user
3. Click the role dropdown
4. Select new role
5. Done! User's dashboard changes immediately

### Activating/Deactivating Users

**Deactivate a user when:**
- They violate terms of service
- Account is suspended
- Temporary access restriction needed

**To deactivate:**
1. Find the user in User Management
2. Toggle the "Active/Inactive" switch
3. User cannot login when inactive

---

## 🎯 Common Admin Tasks

### Task 1: Add a New Manager

```
1. Click "Create User"
2. Fill in details
3. Select Role: "Manager"
4. Click "Create User"
5. Share phone number and OTP with the manager
```

### Task 2: Promote a Client to Manager

```
1. Go to User Management tab
2. Find the client user
3. Change role dropdown to "Manager"
4. Done! They now have manager access
```

### Task 3: Temporarily Disable a User

```
1. Find user in User Management
2. Toggle "Active" switch to OFF
3. User cannot login until reactivated
```

### Task 4: Delete a User Account

```
1. Find user in User Management
2. Click trash icon (🗑️)
3. Confirm deletion
4. User and their data are removed
```

### Task 5: View System Activity

```
1. Check Statistics cards for overview
2. Go to Bookings tab for all transactions
3. Monitor active vs pending bookings
4. Track total revenue
```

---

## 🔒 Security Best Practices

### 1. **Protect Admin Credentials**
- Don't share admin phone number
- Change admin phone if compromised
- Create separate admin accounts for different people

### 2. **Regular Audits**
- Review user list monthly
- Deactivate unused accounts
- Check for suspicious bookings

### 3. **Role Assignment**
- Only assign Manager/VP/PV roles to trusted staff
- Keep Admin role limited to 1-2 people
- Use Client role for external users

### 4. **Backup Admin Access**
- Create at least 2 admin accounts
- Store credentials securely
- Document admin phone numbers

---

## 🚨 Emergency Procedures

### Lost Admin Access

If you lose admin access:

1. **Connect to database:**
   ```bash
   psql -U postgres -h localhost -d adslotpro
   ```

2. **Create new admin:**
   ```sql
   INSERT INTO users (phone, name, email, role, business_school_name, school_address, gst_number, is_active)
   VALUES ('+919876543210', 'Emergency Admin', 'emergency@time.com', 'admin', 'TIME', 'India', '27AABCT1234A1Z5', true);
   ```

### Reset User Password (OTP)

Users login with OTP, so there's no password to reset. If a user can't receive OTP:

1. Update their phone number in User Management
2. Or create a new account for them

### Deactivate All Users (Emergency)

```sql
UPDATE users SET is_active = false WHERE role != 'admin';
```

This keeps only admin accounts active.

---

## 📈 Monitoring & Analytics

### Key Metrics to Watch

1. **User Growth**
   - Track new user registrations
   - Monitor active vs inactive ratio

2. **Booking Activity**
   - Active bookings count
   - Pending approvals backlog
   - Rejection rate

3. **Revenue Tracking**
   - Total revenue trend
   - Average booking value
   - Payment collection rate

4. **System Health**
   - All systems operational
   - No critical errors
   - Cron jobs running

---

## 🎓 Training New Admins

### Checklist for New Admin

- [ ] Understand all user roles
- [ ] Practice creating users
- [ ] Learn to change roles
- [ ] Know how to deactivate accounts
- [ ] Understand booking workflow
- [ ] Review security practices
- [ ] Know emergency procedures
- [ ] Have backup admin credentials

### Admin Onboarding Steps

1. **Create admin account** for new person
2. **Share credentials** securely
3. **Walk through dashboard** together
4. **Practice common tasks** in test environment
5. **Review security guidelines**
6. **Provide this guide** for reference

---

## 💡 Tips & Tricks

### Quick Actions

- **Bulk Role Change:** Change multiple users to same role by doing them one by one
- **Search Users:** Use browser search (Ctrl+F) to find users quickly
- **Monitor Active Users:** Check the "X active" count in statistics

### Keyboard Shortcuts

- `Ctrl + F` - Search on page
- `F5` - Refresh dashboard
- `Ctrl + Click` - Open in new tab

### Best Practices

1. **Regular Cleanup**
   - Deactivate inactive users monthly
   - Archive old bookings
   - Review slot utilization

2. **Communication**
   - Notify users before deactivating
   - Document role changes
   - Keep admin team informed

3. **Data Management**
   - Export reports regularly
   - Backup database weekly
   - Monitor storage usage

---

## 🆘 Support & Help

### Common Questions

**Q: Can I have multiple admins?**
A: Yes! Create as many admin accounts as needed.

**Q: What happens when I deactivate a user?**
A: They cannot login, but their data remains intact.

**Q: Can I undo a user deletion?**
A: No, deletions are permanent. Deactivate instead if unsure.

**Q: How do I change my own admin phone?**
A: Create a new admin account, then delete the old one.

**Q: Can clients see other clients' data?**
A: No, clients only see their own bookings and analytics.

---

## 📞 Contact

For technical support or questions about the admin panel:

1. Check this guide first
2. Review `README.md` for general help
3. Check `IMPLEMENTATION_STATUS.md` for feature status
4. Contact system administrator

---

## 🎉 You're Ready!

You now have complete control over the Ad Banner Management System. Use your admin powers wisely!

**Remember:** With great power comes great responsibility! 🦸‍♂️
