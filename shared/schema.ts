import { pgTable, serial, text, integer, timestamp, boolean, decimal, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["client", "manager", "vp", "pv_sir", "accounts", "it", "admin", "material"]);
export const mediaTypeEnum = pgEnum("media_type", ["website", "mobile", "email", "magazine", "whatsapp"]);
export const pageTypeEnum = pgEnum("page_type", ["main", "course", "webinar", "student_login", "student_home", "other"]);
export const slotStatusEnum = pgEnum("slot_status", ["available", "booked", "pending", "expired"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending_manager", 
  "pending_vp", 
  "pending_pv", 
  "pending_payment",
  "pending_deployment",
  "approved", 
  "rejected", 
  "active", 
  "expired", 
  "paused"
]);
export const paymentTypeEnum = pgEnum("payment_type", ["full", "installment", "pay_later"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "partial"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"]);
export const bannerStatusEnum = pgEnum("banner_status", ["pending", "approved", "rejected", "active", "expired"]);
export const workOrderStatusEnum = pgEnum("work_order_status", [
  "draft",
  "quoted",
  "client_accepted",
  "rejected",
  "paid",
  "active",
  "completed",
]);
export const releaseOrderStatusEnum = pgEnum("release_order_status", [
  "issued",
  "pending_banner_upload",
  "pending_manager_review",
  "pending_vp_review",
  "pending_pv_review",
  "accepted",
  "ready_for_it",
  "ready_for_material",
  "deployed",
]);
export const invoiceTypeEnum = pgEnum("invoice_type", ["proforma", "tax_invoice"]);
export const addonTypeEnum = pgEnum("addon_type", ["email", "whatsapp"]);
export const deploymentStatusEnum = pgEnum("deployment_status", ["deployed", "removed", "expired"]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("client"),
  businessSchoolName: text("business_school_name"),
  schoolAddress: text("school_address"),
  gstNumber: text("gst_number"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Signup schema - business fields required for clients
export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  businessSchoolName: z.string().min(2, "Business school name is required"),
  schoolAddress: z.string().min(5, "School address is required"),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number format"),
});
export type SignupData = z.infer<typeof signupSchema>;

// Admin creation schema - business fields optional
export const adminCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  role: z.enum(["client", "manager", "vp", "pv_sir", "accounts", "it", "admin", "material"]),
  businessSchoolName: z.string().optional(),
  schoolAddress: z.string().optional(),
  gstNumber: z.string().optional(),
});
export type AdminCreateData = z.infer<typeof adminCreateSchema>;

// OTP codes table
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({ id: true, createdAt: true });
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;

// Slots table
export const slots = pgTable("slots", {
  id: serial("id").primaryKey(),
  slotId: text("slot_id"), // Custom slot ID like web0001, mob0001, mag0001, emi0001, wap0001
  pageType: pageTypeEnum("page_type").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  position: text("position").notNull(), // e.g., "header", "sidebar", "footer"
  dimensions: text("dimensions").notNull(), // e.g., "728x90", "300x250"
  pricing: decimal("pricing", { precision: 10, scale: 2 }).notNull(),
  status: slotStatusEnum("status").default("available").notNull(),
  isBlocked: boolean("is_blocked").default(false).notNull(), // Manager can block slots
  blockReason: text("block_reason"),
  blockedById: integer("blocked_by_id").references(() => users.id),
  blockStart: date("block_start"),
  magazinePageNumber: integer("magazine_page_number"), // Only for magazine media type
  layoutData: text("layout_data"), // JSON string for manager's drag-drop layout
  reservedByUserId: integer("reserved_by_user_id").references(() => users.id),
  reservedAt: timestamp("reserved_at"),
  blockUntil: date("block_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdById: integer("created_by_id").references(() => users.id),
});

export const insertSlotSchema = createInsertSchema(slots).omit({ id: true, createdAt: true });
export type InsertSlot = z.infer<typeof insertSlotSchema>;
export type Slot = typeof slots.$inferSelect;

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  customSlotId: text("custom_slot_id"), // Custom slot ID like web0001, mob0001, etc. (will be made NOT NULL after data migration)
  customWorkOrderId: text("custom_work_order_id"), // Custom work order ID like WOWEB20260001, WOEMI20260001, etc.
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: bookingStatusEnum("status").default("pending_manager").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentType: paymentTypeEnum("payment_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true, paymentType: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Banners table
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  fileUrl: text("file_url").notNull(),
  version: integer("version").default(1).notNull(),
  uploadedById: integer("uploaded_by_id").notNull().references(() => users.id),
  status: bannerStatusEnum("status").default("pending").notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertBannerSchema = createInsertSchema(banners).omit({ id: true, uploadedAt: true });
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;

// Approvals table
export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  approverId: integer("approver_id").references(() => users.id),
  role: userRoleEnum("role").notNull(),
  status: approvalStatusEnum("status").default("pending").notNull(),
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({ id: true, createdAt: true });
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvals.$inferSelect;

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date"),
  status: paymentStatusEnum("status").default("pending").notNull(),
  paymentMethod: text("payment_method"),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Installments table
export const installments = pgTable("installments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInstallmentSchema = createInsertSchema(installments).omit({ id: true, createdAt: true });
export type InsertInstallment = z.infer<typeof insertInstallmentSchema>;
export type Installment = typeof installments.$inferSelect;

// Proposals table
export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, uploadedAt: true });
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id),
  customWorkOrderId: text("custom_work_order_id"), // Custom work order ID like WOWEB20260001, WOEMI20260001, etc.
  amount: decimal("amount", { precision: 10, scale: 2 }).default("0").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  fileUrl: text("file_url"),
  generatedById: integer("generated_by_id").notNull().references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  invoiceType: invoiceTypeEnum("invoice_type").default("tax_invoice").notNull(),
  dueDate: date("due_date"),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, generatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Analytics table
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  bannerId: integer("banner_id").notNull().references(() => banners.id),
  clicks: integer("clicks").default(0).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  date: date("date").notNull(),
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({ id: true });
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Analytics = typeof analytics.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // e.g., "booking_created", "approval_required", etc.
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Version History table
export const versionHistory = pgTable("version_history", {
  id: serial("id").primaryKey(),
  bannerId: integer("banner_id").notNull().references(() => banners.id),
  version: integer("version").notNull(),
  fileUrl: text("file_url").notNull(),
  editedById: integer("edited_by_id").notNull().references(() => users.id),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVersionHistorySchema = createInsertSchema(versionHistory).omit({ id: true, createdAt: true });
export type InsertVersionHistory = z.infer<typeof insertVersionHistorySchema>;
export type VersionHistory = typeof versionHistory.$inferSelect;

// Work Orders
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  customWorkOrderId: text("custom_work_order_id"), // Custom WO ID like WOWEB25260001, WOEMI25260001, etc.
  clientId: integer("client_id").notNull().references(() => users.id),
  businessSchoolName: text("business_school_name"), // snapshot for RO
  contactName: text("contact_name"),
  status: workOrderStatusEnum("status").default("draft").notNull(),
  paymentMode: paymentTypeEnum("payment_mode").default("full").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  poUrl: text("po_url"),
  poApproved: boolean("po_approved").default(false).notNull(),
  poApprovedAt: timestamp("po_approved_at"),
  negotiationRequested: boolean("negotiation_requested").default(false).notNull(),
  negotiationReason: text("negotiation_reason"),
  negotiationRequestedAt: timestamp("negotiation_requested_at"),
  quotedById: integer("quoted_by_id").references(() => users.id),
  createdById: integer("created_by_id").references(() => users.id),
  createdByName: text("created_by_name"),
  createdOnDate: date("created_on_date"),
  createdOnTime: text("created_on_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;

export const workOrderItems = pgTable("work_order_items", {
  id: serial("id").primaryKey(),
  customWorkOrderId: text("custom_work_order_id").notNull(), // Custom work order ID like WOWEB20260001, WOEMI20260001, etc.
  customSlotId: text("custom_slot_id"), // Custom slot ID like web0001, mob0001, etc. (null for addons)
  addonType: addonTypeEnum("addon_type"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  bannerUrl: text("banner_url"),
});

export const insertWorkOrderItemSchema = createInsertSchema(workOrderItems).omit({ id: true });
export type InsertWorkOrderItem = z.infer<typeof insertWorkOrderItemSchema>;
export type WorkOrderItem = typeof workOrderItems.$inferSelect;

// Release Orders
export const releaseOrders = pgTable("release_orders", {
  id: serial("id").primaryKey(),
  customWorkOrderId: text("custom_work_order_id").notNull(), // Custom work order ID like WOWEB20260001, WOEMI20260001, etc.
  customRoNumber: text("custom_ro_number"), // Custom RO ID like ROWEB20260001, ROEMI20260001, etc.
  roNumber: text("ro_number"), // Legacy field, will be replaced by customRoNumber
  status: releaseOrderStatusEnum("status").default("issued").notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  pdfUrl: text("pdf_url"),
  createdById: integer("created_by_id").references(() => users.id),
  paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
  accountsInvoiceUrl: text("accounts_invoice_url"),
  rejectionReason: text("rejection_reason"),
  rejectedById: integer("rejected_by_id").references(() => users.id),
  rejectedAt: timestamp("rejected_at"),
});

export const insertReleaseOrderSchema = createInsertSchema(releaseOrders).omit({ id: true, issuedAt: true });
export type InsertReleaseOrder = z.infer<typeof insertReleaseOrderSchema>;
export type ReleaseOrder = typeof releaseOrders.$inferSelect;

export const releaseOrderItems = pgTable("release_order_items", {
  id: serial("id").primaryKey(),
  customRoNumber: text("custom_ro_number").notNull(), // Custom RO ID like ROWEB20260001, ROEMI20260001, etc.
  workOrderItemId: integer("work_order_item_id").notNull().references(() => workOrderItems.id),
  bannerId: integer("banner_id").references(() => banners.id),
});

export const insertReleaseOrderItemSchema = createInsertSchema(releaseOrderItems).omit({ id: true });
export type InsertReleaseOrderItem = z.infer<typeof insertReleaseOrderItemSchema>;
export type ReleaseOrderItem = typeof releaseOrderItems.$inferSelect;

// Activity Logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id),
  actorRole: userRoleEnum("actor_role"),
  action: text("action").notNull(), // e.g., work_order_rejected
  entityType: text("entity_type").notNull(), // e.g., work_order
  entityId: integer("entity_id").notNull(),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Deployments table
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  customRoNumber: text("custom_ro_number").notNull(), // Custom RO ID like ROWEB20260001, ROEMI20260001, etc.
  workOrderItemId: integer("work_order_item_id").notNull().references(() => workOrderItems.id),
  bannerUrl: text("banner_url").notNull(),
  customSlotId: text("custom_slot_id"), // Custom slot ID like web0001, mob0001, etc.
  deployedById: integer("deployed_by_id").notNull().references(() => users.id),
  deployedAt: timestamp("deployed_at").defaultNow().notNull(),
  status: deploymentStatusEnum("status").default("deployed").notNull(),
  removedAt: timestamp("removed_at"),
  removedById: integer("removed_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({ id: true, deployedAt: true, createdAt: true });
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;

// RO Details table
export const roDetails = pgTable("ro_details", {
  id: serial("id").primaryKey(),
  mediaType: text("media_type").notNull(), // e.g., "Website", "Mobile APP", "Email", "Whatsapp", "Magazine"
  position: text("position").notNull(), // e.g., "Student Homepage", "Chatpages", "Front Cover Inside"
  status: integer("status").default(0).notNull(),
  propertyPrefix: text("property_prefix").notNull(), // e.g., "WEB", "APP", "EML", "WAP", "MAG"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoDetailsSchema = createInsertSchema(roDetails).omit({ id: true, createdAt: true });
export type InsertRoDetails = z.infer<typeof insertRoDetailsSchema>;
export type RoDetails = typeof roDetails.$inferSelect;
