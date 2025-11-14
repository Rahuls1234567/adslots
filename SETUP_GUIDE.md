# Ad Banner Management System - Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Gmail account (for SMTP) or other email service
- WhatsApp Business API account (optional)

## Installation Steps

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Database Setup

Create a PostgreSQL database and get the connection string.

```bash
# Push database schema
npm run db:push
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Application
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5000

# Email Configuration (Gmail Example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password

# WhatsApp Business API (Optional)
WHATSAPP_API_URL=https://api.whatsapp.com/send
WHATSAPP_API_KEY=your_api_key

# Session
SESSION_SECRET=generate_a_random_secret_here
```

### 4. Gmail App Password Setup

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Generate a new app password for "Mail"
5. Use this password in `SMTP_PASSWORD`

### 5. WhatsApp Business API Setup (Optional)

You can use one of these providers:
- **Twilio**: https://www.twilio.com/whatsapp
- **MessageBird**: https://messagebird.com/whatsapp
- **Gupshup**: https://www.gupshup.io/
- **WhatsApp Business API**: Direct integration

Update the `WHATSAPP_API_URL` and `WHATSAPP_API_KEY` accordingly.

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:5000`

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Default User Roles

The system supports 6 user roles:

1. **Client** - Book ad slots, view analytics
2. **Manager** - Approve bookings, manage slots
3. **VP** - Second-level approval
4. **PV Sir** - Final approval authority
5. **Accounts** - Handle payments and invoices
6. **IT** - Deploy banners, manage technical aspects

## Creating Users

Users can sign up via the `/login` page with:
- Phone number (for OTP)
- Name
- Email
- Business school name
- School address
- GST number

After signup, they'll receive an OTP to verify their phone number.

## Features Overview

### ✅ Implemented Features

1. **Authentication**
   - OTP-based login
   - Role-based access control

2. **Slot Management**
   - Create/edit slots
   - Multiple media types (Website, Mobile, Email, Magazine)
   - Multiple page types
   - Real-time availability checking

3. **Booking Workflow**
   - Client requests booking
   - Multi-stage approval (Manager → VP → PV Sir)
   - Banner upload with versioning
   - Status tracking

4. **Notifications**
   - Email notifications (HTML templates)
   - WhatsApp notifications
   - In-app notification bell
   - Real-time updates

5. **Analytics**
   - Impression tracking
   - Click tracking
   - CTR calculation
   - Visual charts (Line & Bar)
   - CSV export

6. **Automation**
   - Expiry reminders (2 days before)
   - Auto-expire campaigns
   - Payment reminders
   - Automated workflow progression

### ⏳ Pending Features

- Payment gateway integration
- Magazine page turner UI
- Manager layout creator (drag-drop)
- Tally integration
- Advanced version control UI
- Backup banner system

## Testing the Application

### 1. Create a Manager User

First, you'll need to manually create a manager user in the database or modify the signup to allow role selection during development.

### 2. Create Slots

As a manager:
1. Login to the manager dashboard
2. Click "Create Slot"
3. Fill in slot details (media type, page type, position, dimensions, pricing)
4. Save the slot

### 3. Book a Slot

As a client:
1. Login/Signup
2. Select date range
3. Choose page type
4. Select available slot
5. Upload banner
6. Submit booking

### 4. Approve Booking

As a manager:
1. View pending approvals
2. Review booking details
3. Approve or reject

The system will automatically:
- Send notifications to client
- Progress to next approval stage
- Notify next approver

### 5. View Analytics

As a client:
1. Go to Analytics page
2. Select your campaign
3. View impressions, clicks, and CTR
4. Export data as CSV

## Troubleshooting

### Email Not Sending

- Check SMTP credentials
- Ensure "Less secure app access" is enabled (Gmail)
- Use App Password instead of regular password
- Check firewall/network settings

### WhatsApp Not Working

- Verify API credentials
- Check API endpoint URL
- Review provider documentation
- Test with provider's sandbox environment

### Database Connection Issues

- Verify DATABASE_URL format
- Check database server is running
- Ensure network connectivity
- Verify user permissions

### Cron Jobs Not Running

- Check server logs
- Verify cron service started
- Check for any errors in console
- Ensure proper timezone configuration

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP and login

### Slots
- `GET /api/slots` - Get all slots
- `GET /api/slots/available` - Get available slots for date range
- `POST /api/slots` - Create new slot
- `PATCH /api/slots/:id` - Update slot

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id/status` - Update booking status

### Banners
- `POST /api/banners/upload` - Upload banner
- `GET /api/banners/:bookingId` - Get banners for booking

### Analytics
- `GET /api/analytics/booking/:bookingId` - Get booking analytics
- `POST /api/analytics/track/impression/:bannerId` - Track impression
- `POST /api/analytics/track/click/:bannerId` - Track click

### Notifications
- `GET /api/notifications/:userId` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/:userId/read-all` - Mark all as read

## Support

For issues or questions:
1. Check the IMPLEMENTATION_STATUS.md file
2. Review server logs
3. Check browser console for client-side errors
4. Verify environment variables are set correctly

## Next Steps

1. Test all implemented features
2. Configure email and WhatsApp services
3. Create initial slots and test bookings
4. Review analytics tracking
5. Plan Phase 4 implementation (Advanced Features)
