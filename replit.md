# Ad Banner Management System - Project Documentation

## Overview
A sophisticated web-based ad banner management system with BookMyShow-style slot booking interface. Built with React, TypeScript, Express, and PostgreSQL. Features multi-role workflow automation across six roles and premium Apple-inspired design.

## Project Status: Active Development

**Last Updated:** October 30, 2025

**Current State:** MVP features complete with BookMyShow-style client dashboard, business school signup flow, and real-time availability filtering.

## Recent Changes (October 2025)

### Client Dashboard Redesign (BookMyShow-Style)
- Implemented two-panel layout: 25% sidebar for date selection, 75% main area for slot grid
- Added DateRangePicker component with auto-swap logic preventing inverted date ranges
- Created /api/slots/available endpoint with date-based filtering and booking overlap detection
- Fixed booking modal to accept and display pre-selected dates
- Added useEffect hook to reset form values when dates change
- Implemented proper query invalidation for all relevant endpoints after booking

### Business School Signup
- Added required fields: businessSchoolName, schoolAddress, gstNumber
- Implemented GST number validation (format: 22AAAAA0000A1Z5)
- Updated schema and database with new business fields
- All fields mandatory for signup completion

### Analytics Page
- Separated analytics from main dashboard
- Added animated stat cards with counter animations
- Implemented trend indicators for key metrics
- Smooth number transitions and visual polish

### Database Schema Updates
- Added isBlocked field to slots table for manager control
- Added business school fields to users table
- Maintained all existing booking workflow fields

## Project Architecture

### Frontend (React + TypeScript)
- **Pages:**
  - `/login` - Login page
  - `/signup` - Signup with business school details
  - `/client-dashboard` - BookMyShow-style booking interface
  - `/analytics` - Analytics dashboard with animated stats
  - `/manager-dashboard` - Manager portal (in progress)
  
- **Key Components:**
  - `DateRangePicker` - Custom date range selector with validation
  - `BookingModal` - Slot booking form with pre-populated dates
  - `AppSidebar` - Navigation sidebar using Shadcn
  
- **State Management:**
  - TanStack Query v5 for server state
  - React Hook Form for form state
  - Zod for validation

### Backend (Express + TypeScript)
- **API Routes:**
  - Auth: `/api/register`, `/api/login`, `/api/logout`, `/api/user`
  - Slots: `/api/slots`, `/api/slots/available`, `/api/slots/:id`
  - Bookings: `/api/bookings`, `/api/bookings/user/:userId`
  
- **Storage Layer:**
  - In-memory storage (MemStorage) for development
  - Interface-based design for easy database migration
  - Drizzle ORM schema defined in shared/schema.ts

### Database Schema
```typescript
// Users
- id, email, password, role
- businessSchoolName, schoolAddress, gstNumber
- phone, isPhoneVerified

// Slots
- id, mediaType, pageType, position
- dimensions, pricing, status
- isBlocked (for manager control)

// Bookings
- id, clientId, slotId
- startDate, endDate
- paymentType, paymentStatus, totalAmount
- Multi-stage approvals (client, manager, vp, pvSir, accounts, it)
```

## Key Technical Patterns

### Date Range Filtering
- Client selects dates in sidebar
- Query `/api/slots/available?startDate=2025-01-01&endDate=2025-01-31`
- Backend filters slots:
  1. By page type (if specified)
  2. Remove blocked slots (isBlocked = true)
  3. Remove slots with overlapping bookings
- Returns only truly available slots

### Booking Flow
1. User selects date range in DateRangePicker
2. Available slots query automatically updates
3. User clicks "Book Now" on a slot
4. BookingModal opens with dates pre-populated (via useEffect)
5. User completes payment details
6. Booking submitted and queries invalidated
7. Slot disappears from grid immediately

### Query Invalidation Strategy
After booking mutation:
- Invalidate `/api/slots` - All slots
- Invalidate `/api/slots/available` - Available slots with filters
- Invalidate `/api/bookings` - All bookings

## Running the Application

### Start Development Server
```bash
npm run dev
```
- Starts Express backend and Vite frontend on port 5000
- Auto-restarts on file changes
- Access via Replit webview or browser

### Test Accounts
- Client: `test@client.com` / `password123`
- Manager: `manager@example.com` / `password123`
- VP: `vp@example.com` / `password123`

## Remaining Features

### High Priority
- [ ] Manager slot blocking UI (schema ready, UI pending)
- [ ] Magazine page-turning interface (Apple Books-style)
- [ ] Manager drag-and-drop layout creator

### Medium Priority
- [ ] Advanced analytics with charts
- [ ] Email notifications for workflow
- [ ] Mobile responsive optimizations

### Low Priority
- [ ] Payment gateway integration (Stripe ready)
- [ ] Export booking reports
- [ ] Bulk slot management

## User Preferences

### Design Guidelines
- Apple-inspired premium design
- Glassmorphism effects where appropriate
- Consistent spacing (small, medium, large)
- Semantic color tokens
- Shadcn components for consistency

### Code Conventions
- TypeScript strict mode
- ESLint + Prettier
- Component-first architecture
- Minimize files (collapse similar components)
- Interface-based storage layer

## Development Notes

### Critical Patterns
- **Date Handling:** Always normalize dates (setHours to 0:00:00)
- **Form Reset:** Use useEffect to reset form when props change
- **Query Keys:** Use arrays for hierarchical keys `['/api/slots', id]`
- **Invalidation:** Invalidate all related queries after mutations

### Common Pitfalls to Avoid
- Don't use `process.env` in frontend (use `import.meta.env`)
- Always prefix frontend env vars with `VITE_`
- Include `value` prop on all `<SelectItem>` components
- Use `@/` path alias for imports
- Never modify `vite.config.ts` or `package.json` scripts

### File Structure Guidelines
- Pages go in `client/src/pages/`
- Reusable components in `client/src/components/`
- UI primitives in `client/src/components/ui/`
- Shared types in `shared/schema.ts`
- API routes in `server/routes.ts`
- Storage interface in `server/storage.ts`

## Dependencies

### Core
- React 18 + TypeScript
- Express + TypeScript
- PostgreSQL (Neon)
- Drizzle ORM

### UI & Styling
- Shadcn/ui
- Radix UI primitives
- Tailwind CSS
- Lucide React icons
- Framer Motion

### Forms & Validation
- React Hook Form
- Zod
- @hookform/resolvers

### State & Data
- TanStack Query v5
- Wouter (routing)

## Environment Variables

### Pre-configured
- `DATABASE_URL` - PostgreSQL connection
- `SESSION_SECRET` - Session encryption
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- `PUBLIC_OBJECT_SEARCH_PATHS` - Object storage
- `PRIVATE_OBJECT_DIR` - Private storage

### Optional (for features)
- `STRIPE_SECRET_KEY` - Stripe integration
- `VITE_STRIPE_PUBLIC_KEY` - Stripe frontend

## Troubleshooting

### Port Conflicts
```bash
pkill -f "tsx server/index.ts"
npm run dev
```

### Database Issues
- Check environment variables
- Verify PostgreSQL connection
- Run `npm run db:push` to sync schema

### Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npx tsc --noEmit`
- Verify all imports use correct paths

## Support & Contact

For development questions or issues:
1. Check this documentation
2. Review README.md for setup instructions
3. Check workflow logs in Replit
4. Contact development team

---

**Project Goal:** Create a sophisticated, production-ready ad banner management system with intuitive BookMyShow-style booking experience and comprehensive multi-role workflow automation.
