import { pgTable, serial, text, integer, timestamp, boolean, decimal, pgEnum, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["client", "manager", "vp", "pv_sir", "accounts", "it"]);
export const mediaTypeEnum = pgEnum("media_type", ["website", "mobile", "email", "magazine"]);
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

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  role: userRoleEnum("role").notNull(),
  gstNumber: text("gst_number"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

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
  pageType: pageTypeEnum("page_type").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  position: text("position").notNull(), // e.g., "header", "sidebar", "footer"
  dimensions: text("dimensions").notNull(), // e.g., "728x90", "300x250"
  pricing: decimal("pricing", { precision: 10, scale: 2 }).notNull(),
  status: slotStatusEnum("status").default("available").notNull(),
  magazinePageNumber: integer("magazine_page_number"), // Only for magazine media type
  layoutData: text("layout_data"), // JSON string for manager's drag-drop layout
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSlotSchema = createInsertSchema(slots).omit({ id: true, createdAt: true });
export type InsertSlot = z.infer<typeof insertSlotSchema>;
export type Slot = typeof slots.$inferSelect;

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  slotId: integer("slot_id").notNull().references(() => slots.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: bookingStatusEnum("status").default("pending_manager").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentType: paymentTypeEnum("payment_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });
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
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  fileUrl: text("file_url").notNull(),
  generatedById: integer("generated_by_id").notNull().references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
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
