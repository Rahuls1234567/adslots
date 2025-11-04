# Ad Banner Management System

A sophisticated web-based ad banner management system with BookMyShow-style slot booking interface. Features date-range selection, multi-role workflow automation, and premium Apple-inspired design.

## Features

- **BookMyShow-Style Booking**: Date range picker on the left (25% width) with dynamic slot grid on the right (75% width)
- **Business School Signup**: Complete registration flow with business details (school name, address, GST number) and OTP authentication
- **Multi-Role Workflow**: Six-role system (Client, Manager, VP, PV Sir, Accounts, IT) with automated approval flow
- **Real-Time Availability**: Dynamic slot filtering based on selected dates and existing bookings
- **Analytics Dashboard**: Animated stat cards with counter animations and trend indicators
- **Premium Design**: Apple-inspired UI with glassmorphism effects

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL (Neon)
- **UI Components**: Shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **State Management**: TanStack Query v5
- **Authentication**: Passport.js (local strategy)

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL database (automatically configured in Replit)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database setup:**
   The database is automatically configured via environment variables. The schema includes:
   - Users (with business school details)
   - Slots (website, mobile, email, magazine ad slots)
   - Bookings (with multi-stage approval workflow)

3. **Environment variables:**
   The following secrets are pre-configured:
   - `DATABASE_URL` - PostgreSQL connection string
   - `SESSION_SECRET` - Session encryption key
   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - Database credentials

### Running the Application

**Start the development server:**
```bash
npm run dev
```

This starts both the backend (Express) and frontend (Vite) servers on port 5000.

**Access the application:**
- Open your browser to: `https://<your-replit-url>.replit.dev`
- Or click the "Webview" button in Replit

### Default Test Accounts

**Client Account:**
- Email: `test@client.com`
- Password: `password123`

**Manager Account:**
- Email: `manager@example.com`
- Password: `password123`

**VP Account:**
- Email: `vp@example.com`
- Password: `password123`

## Application Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   │   ├── client-dashboard.tsx    # BookMyShow-style booking interface
│   │   │   ├── analytics.tsx           # Analytics with animated stats
│   │   │   ├── login.tsx               # Login page
│   │   │   ├── signup.tsx              # Signup with business details
│   │   │   └── manager-dashboard.tsx   # Manager portal
│   │   ├── components/    # Reusable components
│   │   │   ├── booking-modal.tsx       # Slot booking modal
│   │   │   ├── date-range-picker.tsx   # Custom date picker
│   │   │   └── ui/                     # Shadcn components
│   │   └── lib/           # Utilities and query client
│   └── index.html
├── server/                # Backend Express application
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Data layer interface
│   └── vite.ts           # Vite middleware
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema (Drizzle ORM)
└── package.json
```

## Key Features & Usage

### 1. Client Dashboard (BookMyShow-Style)

**Booking Flow:**
1. Select a date range using the calendar on the left sidebar
2. View available slots in the grid on the right
3. Click "Book Now" on any slot
4. Complete payment details in the modal
5. Submit booking for approval

**Features:**
- Auto-swap dates if you select an earlier date after selecting a later one
- Real-time slot availability based on selected dates
- Filter by page type (Landing, Course, Blog, Contact, About)
- Dynamic availability counter

### 2. Signup Flow

**Required Information:**
- Email and password
- Business school name (required)
- School address (required)
- GST number (required, validated format)
- Phone number for OTP

### 3. Manager Dashboard

**Capabilities:**
- View all bookings with approval status
- Approve/reject client bookings
- Block/unblock specific ad slots
- Drag-and-drop layout creator (coming soon)

### 4. Analytics Page

**Metrics:**
- Total Bookings (with animated counter)
- Active Slots
- Revenue (with trend indicators)
- Approval Rate

## API Endpoints

### Authentication
- `POST /api/register` - Register new user with business details
- `POST /api/login` - Login with email/password
- `POST /api/logout` - Logout current user
- `GET /api/user` - Get current user

### Slots
- `GET /api/slots` - Get all slots
- `GET /api/slots/available` - Get available slots for date range
  - Query params: `startDate`, `endDate`, `pageType` (optional)
- `GET /api/slots/:id` - Get slot by ID
- `POST /api/slots` - Create new slot (Manager only)
- `PATCH /api/slots/:id` - Update slot (Manager only)

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/user/:userId` - Get user's bookings
- `POST /api/bookings` - Create new booking
- `PATCH /api/bookings/:id/status` - Update booking status

## Database Schema

### Users Table
- Basic info: id, email, password, role
- Business details: businessSchoolName, schoolAddress, gstNumber
- Phone and verification

### Slots Table
- Media type: website, mobile, email, magazine
- Page type: main, course, blog, contact, about
- Position and dimensions
- Pricing and availability
- Block status (isBlocked)

### Bookings Table
- Client and slot references
- Date range (startDate, endDate)
- Payment info (type, amount, status)
- Multi-stage approval (clientApproved, managerApproved, vpApproved, etc.)

## Troubleshooting

### Port Already in Use
If you see `EADDRINUSE` error:
```bash
pkill -f "tsx server/index.ts"
npm run dev
```

### Database Connection Issues
Check that all database environment variables are set:
```bash
echo $DATABASE_URL
```

### Application Not Loading
1. Check the workflow status in Replit
2. Restart the workflow
3. Check browser console for errors

## Development Tips

### Adding New Pages
1. Create page component in `client/src/pages/`
2. Register route in `client/src/App.tsx`
3. Update sidebar navigation if needed

### Adding New API Routes
1. Add route in `server/routes.ts`
2. Update storage interface in `server/storage.ts` if needed
3. Use Zod schemas for validation

### Styling Guidelines
- Use existing Shadcn components
- Follow Tailwind utility-first approach
- Maintain consistent spacing (small, medium, large)
- Use semantic color tokens (primary, accent, muted, etc.)

## Future Enhancements

- [ ] Magazine page-turning interface (Apple Books-style)
- [ ] Manager drag-and-drop layout creator
- [ ] Advanced analytics with charts
- [ ] Email notifications for approval workflow
- [ ] Payment gateway integration (Stripe ready)
- [ ] Mobile responsive optimizations

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact the development team.
