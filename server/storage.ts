import { db } from "./db";
import { 
  users, type User, type InsertUser,
  otpCodes, type OtpCode, type InsertOtpCode,
  slots, type Slot, type InsertSlot,
  bookings, type Booking, type InsertBooking,
  banners, type Banner, type InsertBanner,
  approvals, type Approval, type InsertApproval,
  payments, type Payment, type InsertPayment,
  installments, type Installment, type InsertInstallment,
  proposals, type Proposal, type InsertProposal,
  invoices, type Invoice, type InsertInvoice,
  analytics, type Analytics, type InsertAnalytics,
  notifications, type Notification, type InsertNotification,
  versionHistory, type VersionHistory, type InsertVersionHistory
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // OTP
  createOtpCode(otp: InsertOtpCode): Promise<OtpCode>;
  getValidOtp(phone: string, code: string): Promise<OtpCode | undefined>;
  markOtpAsVerified(id: number): Promise<void>;
  
  // Slots
  getAllSlots(): Promise<Slot[]>;
  getSlot(id: number): Promise<Slot | undefined>;
  createSlot(slot: InsertSlot): Promise<Slot>;
  updateSlot(id: number, slot: Partial<InsertSlot>): Promise<Slot | undefined>;
  
  // Bookings
  getAllBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByClient(clientId: number): Promise<Booking[]>;
  getBookingsByStatus(status: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  
  // Banners
  getBanner(id: number): Promise<Banner | undefined>;
  getBannersByBooking(bookingId: number): Promise<Banner[]>;
  getCurrentBanner(bookingId: number): Promise<Banner | undefined>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: number, banner: Partial<InsertBanner>): Promise<Banner | undefined>;
  
  // Approvals
  getApprovalsByBooking(bookingId: number): Promise<Approval[]>;
  getPendingApprovals(role: string): Promise<Approval[]>;
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApproval(id: number, approval: Partial<InsertApproval>): Promise<Approval | undefined>;
  
  // Payments
  getPaymentsByBooking(bookingId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Installments
  getInstallmentsByBooking(bookingId: number): Promise<Installment[]>;
  createInstallment(installment: InsertInstallment): Promise<Installment>;
  updateInstallment(id: number, installment: Partial<InsertInstallment>): Promise<Installment | undefined>;
  
  // Proposals
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  
  // Invoices
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoicesByBooking(bookingId: number): Promise<Invoice[]>;
  
  // Analytics
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  getAnalyticsByBanner(bannerId: number): Promise<Analytics[]>;
  
  // Notifications
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Version History
  getVersionHistory(bannerId: number): Promise<VersionHistory[]>;
  createVersionHistory(version: InsertVersionHistory): Promise<VersionHistory>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.phone, phone));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // OTP
  async createOtpCode(otp: InsertOtpCode): Promise<OtpCode> {
    const result = await db.insert(otpCodes).values(otp).returning();
    return result[0];
  }

  async getValidOtp(phone: string, code: string): Promise<OtpCode | undefined> {
    const result = await db.select().from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, code),
          eq(otpCodes.verified, false)
        )
      )
      .orderBy(desc(otpCodes.createdAt));
    return result[0];
  }

  async markOtpAsVerified(id: number): Promise<void> {
    await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, id));
  }

  // Slots
  async getAllSlots(): Promise<Slot[]> {
    return await db.select().from(slots);
  }

  async getSlot(id: number): Promise<Slot | undefined> {
    const result = await db.select().from(slots).where(eq(slots.id, id));
    return result[0];
  }

  async createSlot(slot: InsertSlot): Promise<Slot> {
    const result = await db.insert(slots).values(slot).returning();
    return result[0];
  }

  async updateSlot(id: number, slot: Partial<InsertSlot>): Promise<Slot | undefined> {
    const result = await db.update(slots).set(slot).where(eq(slots.id, id)).returning();
    return result[0];
  }

  // Bookings
  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings);
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  }

  async getBookingsByClient(clientId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.clientId, clientId));
  }

  async getBookingsByStatus(status: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.status, status as any));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const result = await db.insert(bookings).values(booking).returning();
    return result[0];
  }

  async updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | undefined> {
    const result = await db.update(bookings).set(booking).where(eq(bookings.id, id)).returning();
    return result[0];
  }

  // Banners
  async getBanner(id: number): Promise<Banner | undefined> {
    const result = await db.select().from(banners).where(eq(banners.id, id));
    return result[0];
  }

  async getBannersByBooking(bookingId: number): Promise<Banner[]> {
    return await db.select().from(banners).where(eq(banners.bookingId, bookingId));
  }

  async getCurrentBanner(bookingId: number): Promise<Banner | undefined> {
    const result = await db.select().from(banners)
      .where(
        and(
          eq(banners.bookingId, bookingId),
          eq(banners.isCurrent, true)
        )
      );
    return result[0];
  }

  async createBanner(banner: InsertBanner): Promise<Banner> {
    const result = await db.insert(banners).values(banner).returning();
    return result[0];
  }

  async updateBanner(id: number, banner: Partial<InsertBanner>): Promise<Banner | undefined> {
    const result = await db.update(banners).set(banner).where(eq(banners.id, id)).returning();
    return result[0];
  }

  // Approvals
  async getApprovalsByBooking(bookingId: number): Promise<Approval[]> {
    return await db.select().from(approvals).where(eq(approvals.bookingId, bookingId));
  }

  async getPendingApprovals(role: string): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(
        and(
          eq(approvals.role, role as any),
          eq(approvals.status, "pending")
        )
      );
  }

  async createApproval(approval: InsertApproval): Promise<Approval> {
    const result = await db.insert(approvals).values(approval).returning();
    return result[0];
  }

  async updateApproval(id: number, approval: Partial<InsertApproval>): Promise<Approval | undefined> {
    const result = await db.update(approvals).set(approval).where(eq(approvals.id, id)).returning();
    return result[0];
  }

  // Payments
  async getPaymentsByBooking(bookingId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.bookingId, bookingId));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }

  // Installments
  async getInstallmentsByBooking(bookingId: number): Promise<Installment[]> {
    return await db.select().from(installments).where(eq(installments.bookingId, bookingId));
  }

  async createInstallment(installment: InsertInstallment): Promise<Installment> {
    const result = await db.insert(installments).values(installment).returning();
    return result[0];
  }

  async updateInstallment(id: number, installment: Partial<InsertInstallment>): Promise<Installment | undefined> {
    const result = await db.update(installments).set(installment).where(eq(installments.id, id)).returning();
    return result[0];
  }

  // Proposals
  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const result = await db.insert(proposals).values(proposal).returning();
    return result[0];
  }

  // Invoices
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values(invoice).returning();
    return result[0];
  }

  async getInvoicesByBooking(bookingId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.bookingId, bookingId));
  }

  // Analytics
  async createAnalytics(analytics: InsertAnalytics): Promise<Analytics> {
    const result = await db.insert(analytics).values(analytics).returning();
    return result[0];
  }

  async getAnalyticsByBanner(bannerId: number): Promise<Analytics[]> {
    return await db.select().from(analytics).where(eq(analytics.bannerId, bannerId));
  }

  // Notifications
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  // Version History
  async getVersionHistory(bannerId: number): Promise<VersionHistory[]> {
    return await db.select().from(versionHistory)
      .where(eq(versionHistory.bannerId, bannerId))
      .orderBy(desc(versionHistory.createdAt));
  }

  async createVersionHistory(version: InsertVersionHistory): Promise<VersionHistory> {
    const result = await db.insert(versionHistory).values(version).returning();
    return result[0];
  }
}

export const storage = new DbStorage();
