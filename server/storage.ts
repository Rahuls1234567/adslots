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
  versionHistory, type VersionHistory, type InsertVersionHistory,
  workOrders, type WorkOrder, type InsertWorkOrder,
  workOrderItems, type WorkOrderItem, type InsertWorkOrderItem,
  releaseOrders, type ReleaseOrder, type InsertReleaseOrder,
  releaseOrderItems, type ReleaseOrderItem, type InsertReleaseOrderItem,
  activityLogs, type ActivityLog, type InsertActivityLog,
  deployments, type Deployment, type InsertDeployment
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

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
  selectSlot(slotId: number, userId: number): Promise<Slot | null>;
  releaseSlot(slotId: number, userId: number): Promise<Slot | null>;
  confirmSlot(slotId: number, userId: number): Promise<Slot | null>;
  
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

  // Work Orders
  createWorkOrder(data: InsertWorkOrder): Promise<WorkOrder>;
  addWorkOrderItems(items: InsertWorkOrderItem[]): Promise<WorkOrderItem[]>;
  getWorkOrder(id: number): Promise<WorkOrder | undefined>;
  getWorkOrderItems(workOrderId: number): Promise<WorkOrderItem[]>;
  updateWorkOrder(id: number, data: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined>;
  updateWorkOrderItem(id: number, data: Partial<InsertWorkOrderItem>): Promise<WorkOrderItem | undefined>;
  recalcWorkOrderTotal(id: number): Promise<void>;

  // Release Orders
  createReleaseOrder(data: InsertReleaseOrder): Promise<ReleaseOrder>;
  addReleaseOrderItems(items: InsertReleaseOrderItem[]): Promise<ReleaseOrderItem[]>;
  getReleaseOrders(): Promise<ReleaseOrder[]>;
  getReleaseOrder(id: number): Promise<ReleaseOrder | undefined>;
  
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
  
  // Activity logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  
  // Deployments
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  getDeployment(id: number): Promise<Deployment | undefined>;
  getDeployments(filters?: { releaseOrderId?: number; workOrderItemId?: number; status?: string }): Promise<Deployment[]>;
  updateDeployment(id: number, deployment: Partial<InsertDeployment>): Promise<Deployment | undefined>;
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

  async selectSlot(slotId: number, userId: number): Promise<Slot | null> {
    const result = await db.update(slots)
      .set({
        status: "pending",
        reservedByUserId: userId,
        reservedAt: new Date(),
      })
      .where(
        and(
          eq(slots.id, slotId),
          eq(slots.status, "available")
        )
      )
      .returning();
    return result[0] || null;
  }

  async releaseSlot(slotId: number, userId: number): Promise<Slot | null> {
    const result = await db.update(slots)
      .set({
        status: "available",
        reservedByUserId: null,
        reservedAt: null,
      })
      .where(
        and(
          eq(slots.id, slotId),
          eq(slots.status, "pending"),
          eq(slots.reservedByUserId, userId)
        )
      )
      .returning();
    return result[0] || null;
  }

  async confirmSlot(slotId: number, userId: number): Promise<Slot | null> {
    const result = await db.update(slots)
      .set({
        status: "booked",
        reservedByUserId: null,
        reservedAt: null,
      })
      .where(
        and(
          eq(slots.id, slotId),
          eq(slots.status, "pending"),
          eq(slots.reservedByUserId, userId)
        )
      )
      .returning();
    return result[0] || null;
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
    console.log("[Storage.createBanner] Inserting banner:", JSON.stringify(banner, null, 2));
    try {
      const result = await db.insert(banners).values(banner).returning();
      console.log("[Storage.createBanner] Banner inserted successfully, ID:", result[0]?.id);
      if (!result[0]) {
        throw new Error("Failed to create banner - no result returned from database");
      }
      return result[0];
    } catch (error: any) {
      console.error("[Storage.createBanner] Database error:", error);
      console.error("[Storage.createBanner] Error code:", error.code);
      console.error("[Storage.createBanner] Error detail:", error.detail);
      throw error;
    }
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
    console.log("[Storage.createApproval] Inserting approval:", JSON.stringify(approval, null, 2));
    try {
      const result = await db.insert(approvals).values(approval).returning();
      console.log("[Storage.createApproval] Approval inserted successfully, ID:", result[0]?.id);
      if (!result[0]) {
        throw new Error("Failed to create approval - no result returned from database");
      }
      return result[0];
    } catch (error: any) {
      console.error("[Storage.createApproval] Database error:", error);
      console.error("[Storage.createApproval] Error code:", error.code);
      console.error("[Storage.createApproval] Error detail:", error.detail);
      throw error;
    }
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
    console.log("[Storage.createProposal] Inserting proposal:", JSON.stringify(proposal, null, 2));
    try {
      const result = await db.insert(proposals).values(proposal).returning();
      console.log("[Storage.createProposal] Proposal inserted successfully, ID:", result[0]?.id);
      if (!result[0]) {
        throw new Error("Failed to create proposal - no result returned from database");
      }
      return result[0];
    } catch (error: any) {
      console.error("[Storage.createProposal] Database error:", error);
      console.error("[Storage.createProposal] Error code:", error.code);
      console.error("[Storage.createProposal] Error detail:", error.detail);
      throw error;
    }
  }

  // Invoices
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values(invoice).returning();
    return result[0];
  }

  async getInvoicesByBooking(bookingId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.bookingId, bookingId));
  }

  // Work Orders
  async createWorkOrder(data: InsertWorkOrder): Promise<WorkOrder> {
    const result = await db.insert(workOrders).values(data).returning();
    return result[0];
  }

  async addWorkOrderItems(items: InsertWorkOrderItem[]): Promise<WorkOrderItem[]> {
    const result = await db.insert(workOrderItems).values(items).returning();
    return result;
  }

  async getWorkOrder(id: number): Promise<WorkOrder | undefined> {
    const result = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return result[0];
  }

  async getWorkOrderItems(workOrderId: number): Promise<WorkOrderItem[]> {
    return await db.select().from(workOrderItems).where(eq(workOrderItems.workOrderId, workOrderId));
  }

  async updateWorkOrder(id: number, data: Partial<InsertWorkOrder>): Promise<WorkOrder | undefined> {
    const result = await db.update(workOrders).set(data).where(eq(workOrders.id, id)).returning();
    return result[0];
  }

  async updateWorkOrderItem(id: number, data: Partial<InsertWorkOrderItem>): Promise<WorkOrderItem | undefined> {
    const result = await db.update(workOrderItems).set(data).where(eq(workOrderItems.id, id)).returning();
    return result[0];
  }

  async recalcWorkOrderTotal(id: number): Promise<void> {
    const items = await this.getWorkOrderItems(id);
    const base = items.reduce((sum, it) => sum + Number(it.subtotal as any), 0);
    const wo = await this.getWorkOrder(id);
    const gst = wo ? Number((wo as any).gstPercent || 0) : 0;
    const total = base + (base * gst) / 100;
    await db.update(workOrders).set({ totalAmount: String(total) }).where(eq(workOrders.id, id));
  }

  // Release Orders
  async createReleaseOrder(data: InsertReleaseOrder): Promise<ReleaseOrder> {
    const result = await db.insert(releaseOrders).values(data).returning();
    return result[0];
  }

  async addReleaseOrderItems(items: InsertReleaseOrderItem[]): Promise<ReleaseOrderItem[]> {
    const result = await db.insert(releaseOrderItems).values(items).returning();
    return result;
  }

  async getReleaseOrders(): Promise<ReleaseOrder[]> {
    return await db.select().from(releaseOrders).orderBy(desc(releaseOrders.issuedAt));
    
  }

  async getReleaseOrder(id: number): Promise<ReleaseOrder | undefined> {
    const result = await db.select().from(releaseOrders).where(eq(releaseOrders.id, id));
    return result[0];
  }

  // Analytics
  async createAnalytics(analytics: InsertAnalytics): Promise<Analytics> {
    console.log("[Storage.createAnalytics] Inserting analytics:", JSON.stringify(analytics, null, 2));
    try {
      const result = await db.insert(analytics).values(analytics).returning();
      console.log("[Storage.createAnalytics] Analytics inserted successfully, ID:", result[0]?.id);
      if (!result[0]) {
        throw new Error("Failed to create analytics - no result returned from database");
      }
      return result[0];
    } catch (error: any) {
      console.error("[Storage.createAnalytics] Database error:", error);
      console.error("[Storage.createAnalytics] Error code:", error.code);
      console.error("[Storage.createAnalytics] Error detail:", error.detail);
      throw error;
    }
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
    console.log("[Storage.createVersionHistory] Inserting version history:", JSON.stringify(version, null, 2));
    try {
      const result = await db.insert(versionHistory).values(version).returning();
      console.log("[Storage.createVersionHistory] Version history inserted successfully, ID:", result[0]?.id);
      if (!result[0]) {
        throw new Error("Failed to create version history - no result returned from database");
      }
      return result[0];
    } catch (error: any) {
      console.error("[Storage.createVersionHistory] Database error:", error);
      console.error("[Storage.createVersionHistory] Error code:", error.code);
      console.error("[Storage.createVersionHistory] Error detail:", error.detail);
      throw error;
    }
  }

  // Activity logs
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const result = await db.insert(activityLogs).values(log).returning();
    return result[0];
  }

  async getActivityLogs(limit = 200): Promise<ActivityLog[]> {
    const rows = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
    return rows.slice(0, limit);
  }

  // Deployments
  async createDeployment(deployment: InsertDeployment): Promise<Deployment> {
    console.log("[Storage.createDeployment] Inserting deployment:", JSON.stringify(deployment, null, 2));
    try {
      const result = await db.insert(deployments).values(deployment).returning();
      console.log("[Storage.createDeployment] Deployment inserted successfully, ID:", result[0]?.id);
      if (!result[0]) {
        throw new Error("Failed to create deployment - no result returned from database");
      }
      return result[0];
    } catch (error: any) {
      console.error("[Storage.createDeployment] Database error:", error);
      console.error("[Storage.createDeployment] Error code:", error.code);
      console.error("[Storage.createDeployment] Error detail:", error.detail);
      throw error;
    }
  }

  async getDeployment(id: number): Promise<Deployment | undefined> {
    const result = await db.select().from(deployments).where(eq(deployments.id, id));
    return result[0];
  }

  async getDeployments(filters?: { releaseOrderId?: number; workOrderItemId?: number; status?: string }): Promise<Deployment[]> {
    const conditions = [];
    
    if (filters?.releaseOrderId) {
      conditions.push(eq(deployments.releaseOrderId, filters.releaseOrderId));
    }
    if (filters?.workOrderItemId) {
      conditions.push(eq(deployments.workOrderItemId, filters.workOrderItemId));
    }
    if (filters?.status) {
      conditions.push(eq(deployments.status, filters.status as any));
    }
    
    if (conditions.length > 0) {
      const rows = await db.select().from(deployments).where(and(...conditions)).orderBy(desc(deployments.deployedAt));
      return rows;
    }
    
    const rows = await db.select().from(deployments).orderBy(desc(deployments.deployedAt));
    return rows;
  }

  async updateDeployment(id: number, deployment: Partial<InsertDeployment>): Promise<Deployment | undefined> {
    const result = await db.update(deployments).set(deployment).where(eq(deployments.id, id)).returning();
    return result[0];
  }
}

export const storage = new DbStorage();
