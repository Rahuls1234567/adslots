# Ad Banner Management System - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from Apple's premium ecosystem combined with sophisticated booking platforms and Apple Books' fluid interactions.

**Primary References**:
- Apple ecosystem (SF design language, premium interactions)
- Cinema seat selection systems (interactive slot booking)
- Apple Books (page-turning animations)
- Linear (clean dashboard aesthetics)
- Stripe (payment flows)

## Core Design Principles

### 1. Visual Hierarchy & Typography
**Font System**:
- Primary: SF Pro Display for headings and emphasis
- Secondary: Inter for body text and UI elements
- Display: 32px-48px (bold) for page titles
- Headings: 24px-28px (semibold) for section headers
- Subheadings: 18px-20px (medium) for card titles
- Body: 15px-16px (regular) for content
- Small: 13px-14px (regular) for metadata

### 2. Layout System
**Spacing Framework**: Tailwind units of 3, 4, 6, 8, 12, 16, 24
- Component padding: p-6 to p-8
- Section spacing: my-12 to my-16
- Card gaps: gap-6
- Element margins: m-3, m-4

**Two-Panel Layout Structure**:
- Left Sidebar: Fixed 320px width (1/4 viewport)
- Main Viewport: Remaining 3/4 width
- Sidebar includes: Stats cards, date filters, availability counters
- Responsive: Sidebar collapses to overlay drawer on mobile

### 3. Component Library

**Navigation & Layout**:
- Top Navigation Bar: Fixed header with role-specific menu items, notification bell, profile dropdown
- Sidebar: Sticky position with glass morphism effect (backdrop-blur-xl), subtle border
- Breadcrumbs: For deep navigation in manager/admin portals

**Interactive Slot Selection Grid**:
- Grid Layout: Responsive columns based on media type
  - Website slots: 12-column grid
  - Mobile slots: 4-column grid
  - Magazine pages: Full-page spread with dual-page view
- Slot States:
  - Available: White (#FFFFFF) with subtle shadow, hover lifts with scale-105
  - Booked: Grey (#8E8E93) with diagonal pattern overlay
  - Selected: Purple (#7334AE) with checkmark icon
  - Pending: Animated pulsing border in blue (#007AFF)
- Slot Cards: Rounded corners (rounded-xl), border-2, hover shadow-2xl transition

**Magazine Page Turner**:
- 3D perspective flip animation (rotateY transform)
- Page curl effect using gradient overlays
- Dual-page spread view (side-by-side pages)
- Navigation arrows with subtle glow effect
- Page counter display at bottom center
- Smooth 800ms transition with cubic-bezier easing

**Manager Portal - Layout Creator**:
- Canvas: White artboard with grid overlay (toggle-able)
- Tool Palette: Left sidebar with draggable components (slots, banners, zones)
- Properties Panel: Right sidebar showing selected element properties
- Components: Card-based draggable items with visual thumbnails
- Snap-to-Grid: Visual guides appear on drag (dashed lines)
- Action Toolbar: Top bar with save, preview, undo/redo, export options

**Dashboard Cards**:
- Stats Cards: Elevated design with icon, large number display, trend indicator
- Glass morphism effect for overlays
- Micro-animations: Counter animations, progress bars with smooth fills
- Color-coded borders for different metrics (success green, warning orange, info blue)

**Forms & Inputs**:
- Input Fields: Rounded-lg borders, focus ring in primary purple, floating labels
- Upload Zones: Dashed border drag-drop area with icon and helper text
- File Preview: Thumbnail grid with remove button overlay
- Validation: Inline error messages below fields in red
- Date Pickers: Calendar overlay with range selection highlighting

**Buttons**:
- Primary: Purple (#7334AE) with white text, rounded-lg, hover brightness increase
- Secondary: White with purple border and purple text
- Success: Green (#34C759) for approvals
- Destructive: Red for rejections
- Icon Buttons: Circular with subtle background, hover scale
- Buttons on images: backdrop-blur-md background with semi-transparency

**Tables & Lists**:
- Alternating row backgrounds for readability
- Sticky headers on scroll
- Row hover state with subtle background change
- Action column with icon buttons
- Expandable rows for detailed view
- Sorting indicators in column headers

**Modals & Overlays**:
- Centered modal with backdrop-blur and dim overlay
- Slide-in panels from right for detailed views
- Toast notifications: Top-right corner with auto-dismiss
- Confirmation dialogs: Centered with clear action buttons

**Analytics & Reports**:
- Chart Library: Use Recharts for consistent visualization
- Metric Cards: Large number display with percentage change
- Line/Bar Charts: Use purple gradient fills
- Pie Charts: Use defined color palette consistently
- Export Button: Top-right of report sections

**Version Control UI**:
- Timeline view with branch visualization
- Version cards showing thumbnail, timestamp, editor name
- Compare view: Side-by-side image comparison with slider
- Restore button with confirmation

### 4. Interactions & Animations

**Micro-Interactions**:
- Button hover: scale-105 transform with 200ms transition
- Card hover: Lift with shadow increase (shadow-lg to shadow-2xl)
- Slot selection: Quick scale feedback (scale-95 on click)
- Loading states: Skeleton screens with shimmer effect
- Success feedback: Checkmark animation with bounce

**Page Transitions**:
- Fade-in content on route change (300ms)
- Stagger animation for list items (50ms delay between items)
- Smooth scroll behavior for anchor links

**Magazine Specific**:
- Page flip: 3D rotation with realistic shadow progression
- Corner peel: Hover effect showing next page peek
- Zoom capability: Pinch-to-zoom or click for detailed view

**Minimal Animation Philosophy**:
- Focus on functional feedback over decorative motion
- Use animations to guide attention and confirm actions
- Avoid parallax or excessive scroll effects
- Keep transitions under 400ms for responsiveness

### 5. Role-Specific Dashboards

**Client Dashboard**:
- Hero section with campaign overview stats
- Available slots grid with visual selection
- Active campaigns list with performance metrics
- Quick action buttons (Upload Creative, View Reports)

**Manager Dashboard**:
- Multi-metric stats cards across top
- Pending approvals queue with priority indicators
- Expiring campaigns alert section
- Quick filters for slot status

**VP/PV Sir Dashboard**:
- Executive summary with high-level KPIs
- Approval workflow visualization
- Revenue charts and projections
- Recent activity feed

**IT Dashboard**:
- Slot master configuration table
- Deployment queue with status indicators
- Backup banner management
- Technical logs viewer

### 6. Responsive Strategy

**Breakpoints**:
- Mobile: < 768px (single column, drawer navigation)
- Tablet: 768px-1024px (adaptive two-column)
- Desktop: > 1024px (full two-panel layout)

**Mobile Adaptations**:
- Sidebar converts to slide-out drawer
- Grid slots stack vertically or 2-column
- Magazine view: Single page instead of spread
- Simplified manager tools with bottom sheet panels

### 7. Accessibility

**Standards Compliance**:
- WCAG 2.1 AA minimum contrast ratios
- Keyboard navigation for all interactive elements
- ARIA labels on icon buttons and custom controls
- Focus indicators with 2px purple ring
- Screen reader friendly status announcements

## Images

**Dashboard Hero Images**: None - focus on data visualization and metrics

**Slot Preview Images**: 
- Static mockup screenshots showing actual TIME pages (Main Page, Course Page, etc.)
- Displayed in slot selection cards as visual context
- Thumbnail size: 300px width, maintaining aspect ratio

**Marketing/Help Sections**:
- Feature explanation graphics showing workflow diagrams
- Tutorial screenshots demonstrating key actions
- Icon-based feature highlights (no large hero images)

**Manager Portal**:
- Template thumbnails for layout options
- Draggable component visual representations

This design system creates a premium, functional booking experience that balances Apple's refined aesthetics with the complex workflow requirements of an enterprise ad management platform.