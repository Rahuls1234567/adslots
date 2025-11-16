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
  deployments, type Deployment, type InsertDeployment,
  roDetails, type RoDetails
} from "@shared/schema";
import { eq, and, desc, sql, like, or, distinct } from "drizzle-orm";

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
  createWorkOrder(data: InsertWorkOrder, items?: Array<{ customSlotId?: string | null; addonType?: "email" | "whatsapp" | null }>): Promise<WorkOrder>;
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
  getReleaseOrderByCustomId(customRoNumber: string): Promise<ReleaseOrder | undefined>;
  
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
  
  // RO Details
  getMediaTypes(): Promise<string[]>;
  getPositionsByMediaType(mediaType: string): Promise<string[]>;
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

  async getSlotByCustomId(customSlotId: string): Promise<Slot | undefined> {
    const result = await db.select().from(slots).where(eq(slots.slotId, customSlotId));
    return result[0];
  }

  /**
   * Generate the next slot ID based on media type
   * Format: web0001, mob0001, mag0001, emi0001, wap0001
   */
  private async generateNextSlotId(mediaType: string): Promise<string> {
    // Map media types to prefixes
    const prefixMap: Record<string, string> = {
      website: "web",
      mobile: "mob",
      magazine: "mag",
      email: "emi",
      whatsapp: "wap",
    };
    
    const prefix = prefixMap[mediaType.toLowerCase()] || mediaType.slice(0, 3).toLowerCase();
    
    // Find all slots with matching prefix
    const allSlots = await db.select({ slotId: slots.slotId }).from(slots);
    const matchingSlots = allSlots
      .filter(s => s.slotId && s.slotId.toLowerCase().startsWith(prefix.toLowerCase()))
      .map(s => s.slotId!);
    
    // Extract the highest number
    let maxNumber = 0;
    const prefixPattern = new RegExp(`^${prefix}(\\d+)$`, "i");
    
    for (const slotId of matchingSlots) {
      const match = slotId.match(prefixPattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    // Generate next number
    const nextNumber = maxNumber + 1;
    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  }

  async createSlot(slot: InsertSlot): Promise<Slot> {
    // Generate slot ID if not provided
    let slotId = slot.slotId;
    if (!slotId) {
      slotId = await this.generateNextSlotId(slot.mediaType as string);
    }
    
    const result = await db.insert(slots).values({
      ...slot,
      slotId,
    }).returning();
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
    // customSlotId is now required and passed directly
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

  /**
   * Determine the primary media type for a work order based on its items
   * Priority: Slots (by media type) > Email addon > WhatsApp addon
   */
  private async determineWorkOrderMediaType(workOrderId: number): Promise<"email" | "whatsapp" | "website" | "magazine"> {
    try {
      // Get work order items
      const items = await this.getWorkOrderItems(workOrderId);
      
      if (items.length === 0) {
        console.warn(`[Storage.determineWorkOrderMediaType] Work order ${workOrderId} has no items, defaulting to website`);
        return "website"; // Default to website if no items
      }
      
      // Check for slots first (slots take priority)
      const slotItems = items.filter(item => item.customSlotId);
      if (slotItems.length > 0) {
        // Get media types from slots
        const mediaTypes = await Promise.all(
          slotItems.map(async (item) => {
            if (!item.customSlotId) return null;
            try {
              const slot = await this.getSlotByCustomId(item.customSlotId);
              if (!slot) {
                console.warn(`[Storage.determineWorkOrderMediaType] Slot not found for customSlotId: ${item.customSlotId}`);
                return null;
              }
              return slot.mediaType;
            } catch (error: any) {
              console.error(`[Storage.determineWorkOrderMediaType] Error fetching slot ${item.customSlotId}:`, error);
              return null;
            }
          })
        );
        
        // Filter out null values
        const validMediaTypes = mediaTypes.filter(type => type !== null) as string[];
        
        if (validMediaTypes.length > 0) {
          // Determine primary media type (prioritize website > magazine > mobile > email)
          const typePriority: Record<string, number> = { website: 4, magazine: 3, mobile: 2, email: 1 };
          let primaryType: string | null = null;
          let maxPriority = 0;
          
          for (const type of validMediaTypes) {
            if (type && typePriority[type] > maxPriority) {
              maxPriority = typePriority[type];
              primaryType = type;
            }
          }
          
          // Map to our prefixes
          if (primaryType === "website") return "website";
          if (primaryType === "magazine") return "magazine";
          if (primaryType === "mobile") return "website"; // Mobile uses WEB prefix
          if (primaryType === "email") return "email";
        }
      }
      
      // Check for addons if no slots or slots failed
      const emailAddon = items.find(item => item.addonType === "email");
      if (emailAddon) return "email";
      
      const whatsappAddon = items.find(item => item.addonType === "whatsapp");
      if (whatsappAddon) return "whatsapp";
      
      // Default to website if unclear
      console.warn(`[Storage.determineWorkOrderMediaType] Could not determine media type for work order ${workOrderId}, defaulting to website`);
      return "website";
    } catch (error: any) {
      console.error(`[Storage.determineWorkOrderMediaType] Error determining media type for work order ${workOrderId}:`, error);
      // Default to website on error to prevent blocking
      return "website";
    }
  }

  /**
   * Generate the next work order ID based on media type and year
   * Format: WOWEB25260001, WOEMI25260001, WOWAP25260001, WOMAG25260001
   */
  private async generateNextWorkOrderId(mediaType: "email" | "whatsapp" | "website" | "magazine"): Promise<string> {
    // Map media types to prefixes
    const prefixMap: Record<string, string> = {
      email: "EMI",
      whatsapp: "WAP",
      website: "WEB",
      magazine: "MAG",
    };
    
    const prefix = prefixMap[mediaType] || "WEB";
    const currentYear = new Date().getFullYear();
    const year = String(currentYear); // Full 4-digit year (2026, 2027, etc.)
    
    // Find all work orders with matching prefix and year
    const allWorkOrders = await db.select({ customWorkOrderId: workOrders.customWorkOrderId }).from(workOrders);
    const pattern = new RegExp(`^WO${prefix}${year}(\\d+)$`, "i");
    
    let maxNumber = 0;
    for (const wo of allWorkOrders) {
      if (wo.customWorkOrderId) {
        const match = wo.customWorkOrderId.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }
    
    // Generate next number
    const nextNumber = maxNumber + 1;
    return `WO${prefix}${year}${String(nextNumber).padStart(4, "0")}`;
  }

  /**
   * Generate the next release order ID based on work order's media type and year
   * Format: ROWEB25260001, ROEMI25260001, ROWAP25260001, ROMAG25260001
   */
  private async generateNextReleaseOrderId(workOrderId: number): Promise<string> {
    // Get the work order to determine media type
    const mediaType = await this.determineWorkOrderMediaType(workOrderId);
    
    // Map media types to prefixes
    const prefixMap: Record<string, string> = {
      email: "EMI",
      whatsapp: "WAP",
      website: "WEB",
      magazine: "MAG",
    };
    
    const prefix = prefixMap[mediaType] || "WEB";
    const currentYear = new Date().getFullYear();
    const year = String(currentYear); // Full 4-digit year (2026, 2027, etc.)
    
    // Find all release orders with matching prefix and year
    const allReleaseOrders = await db.select({ customRoNumber: releaseOrders.customRoNumber }).from(releaseOrders);
    const pattern = new RegExp(`^RO${prefix}${year}(\\d+)$`, "i");
    
    let maxNumber = 0;
    for (const ro of allReleaseOrders) {
      if (ro.customRoNumber) {
        const match = ro.customRoNumber.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }
    
    // Generate next number
    const nextNumber = maxNumber + 1;
    return `RO${prefix}${year}${String(nextNumber).padStart(4, "0")}`;
  }

  /**
   * Determine media type from work order items (passed directly, not from database)
   */
  async determineMediaTypeFromItems(items: Array<{ customSlotId?: string | null; addonType?: "email" | "whatsapp" | null }>): Promise<"email" | "whatsapp" | "website" | "magazine"> {
    // Check for slots first (slots take priority)
    const slotItems = items.filter(item => item.customSlotId);
    if (slotItems.length > 0) {
      // Get media types from slots
      const mediaTypes = await Promise.all(
        slotItems.map(async (item) => {
          if (!item.customSlotId) return null;
          const slot = await this.getSlotByCustomId(item.customSlotId);
          return slot?.mediaType;
        })
      );
      
      // Determine primary media type (prioritize website > magazine > mobile > email)
      const typePriority: Record<string, number> = { website: 4, magazine: 3, mobile: 2, email: 1 };
      let primaryType: string | null = null;
      let maxPriority = 0;
      
      for (const type of mediaTypes) {
        if (type && typePriority[type] > maxPriority) {
          maxPriority = typePriority[type];
          primaryType = type;
        }
      }
      
      // Map to our prefixes
      if (primaryType === "website") return "website";
      if (primaryType === "magazine") return "magazine";
      if (primaryType === "mobile") return "website"; // Mobile uses WEB prefix
      if (primaryType === "email") return "email";
    }
    
    // Check for addons if no slots
    const emailAddon = items.find(item => item.addonType === "email");
    if (emailAddon) return "email";
    
    const whatsappAddon = items.find(item => item.addonType === "whatsapp");
    if (whatsappAddon) return "whatsapp";
    
    // Default to website if unclear
    return "website";
  }

  // Work Orders
  async createWorkOrder(data: InsertWorkOrder, items?: Array<{ customSlotId?: string | null; addonType?: "email" | "whatsapp" | null }>): Promise<WorkOrder> {
    // Determine media type and generate custom ID before creating
    let customWorkOrderId = data.customWorkOrderId;
    if (!customWorkOrderId && items) {
      const mediaType = await this.determineMediaTypeFromItems(items);
      customWorkOrderId = await this.generateNextWorkOrderId(mediaType);
    }
    
    const result = await db.insert(workOrders).values({
      ...data,
      customWorkOrderId,
    }).returning();
    
    const wo = result[0];
    
    // If we couldn't determine from items, try after items are added (fallback)
    if (!wo.customWorkOrderId) {
      const mediaType = await this.determineWorkOrderMediaType(wo.id);
      const customId = await this.generateNextWorkOrderId(mediaType);
      
      // Update with custom ID
      const updated = await db.update(workOrders)
        .set({ customWorkOrderId: customId })
        .where(eq(workOrders.id, wo.id))
        .returning();
      
      return updated[0] || wo;
    }
    
    return wo;
  }

  async addWorkOrderItems(items: InsertWorkOrderItem[]): Promise<WorkOrderItem[]> {
    // customSlotId and customWorkOrderId are now passed directly (null for addons)
    const result = await db.insert(workOrderItems).values(items).returning();
    return result;
  }

  async getWorkOrder(id: number): Promise<WorkOrder | undefined> {
    const result = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return result[0];
  }

  async getWorkOrderByCustomId(customWorkOrderId: string): Promise<WorkOrder | undefined> {
    const result = await db.select().from(workOrders).where(eq(workOrders.customWorkOrderId, customWorkOrderId));
    return result[0];
  }

  async getWorkOrderItems(workOrderId: number): Promise<WorkOrderItem[]> {
    // Get work order to find custom ID, then query by custom ID
    const wo = await this.getWorkOrder(workOrderId);
    if (!wo || !wo.customWorkOrderId) return [];
    return await db.select().from(workOrderItems).where(eq(workOrderItems.customWorkOrderId, wo.customWorkOrderId));
  }

  async getWorkOrderItemsByCustomId(customWorkOrderId: string): Promise<WorkOrderItem[]> {
    return await db.select().from(workOrderItems).where(eq(workOrderItems.customWorkOrderId, customWorkOrderId));
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
    // Generate custom RO number if not provided
    let customRoNumber = data.customRoNumber;
    if (!customRoNumber && data.customWorkOrderId) {
      try {
        // Get work order by custom ID to determine media type
        const wo = await this.getWorkOrderByCustomId(data.customWorkOrderId);
        if (!wo) {
          throw new Error(`Work order not found with custom ID: ${data.customWorkOrderId}`);
        }
        if (!wo.id) {
          throw new Error(`Work order ${data.customWorkOrderId} does not have an integer ID`);
        }
        console.log(`[Storage.createReleaseOrder] Generating RO number for work order ${wo.id} (custom: ${data.customWorkOrderId})`);
        customRoNumber = await this.generateNextReleaseOrderId(wo.id);
        console.log(`[Storage.createReleaseOrder] Generated RO number: ${customRoNumber}`);
      } catch (error: any) {
        console.error(`[Storage.createReleaseOrder] Error generating RO number:`, error);
        throw new Error(`Failed to generate release order number: ${error.message}`);
      }
    }
    
    if (!customRoNumber) {
      throw new Error("Cannot create release order: customRoNumber is required but was not generated");
    }
    
    try {
      const result = await db.insert(releaseOrders).values({
        ...data,
        customRoNumber,
        roNumber: customRoNumber, // Also set legacy roNumber field for backward compatibility
      }).returning();
      
      if (!result[0]) {
        throw new Error("Failed to create release order - no result returned from database");
      }
      
      console.log(`[Storage.createReleaseOrder] Release order created successfully with ID: ${result[0].id}, RO number: ${result[0].customRoNumber}`);
      return result[0];
    } catch (error: any) {
      console.error(`[Storage.createReleaseOrder] Database error:`, error);
      console.error(`[Storage.createReleaseOrder] Error code:`, error.code);
      console.error(`[Storage.createReleaseOrder] Error detail:`, error.detail);
      throw error;
    }
  }

  async addReleaseOrderItems(items: InsertReleaseOrderItem[]): Promise<ReleaseOrderItem[]> {
    // customRoNumber is now passed directly instead of releaseOrderId
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

  async getReleaseOrderByCustomId(customRoNumber: string): Promise<ReleaseOrder | undefined> {
    const result = await db.select().from(releaseOrders).where(eq(releaseOrders.customRoNumber, customRoNumber));
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
      // customSlotId is now passed directly
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

  // RO Details
  async getMediaTypes(): Promise<string[]> {
    const result = await db.select({ mediaType: roDetails.mediaType }).from(roDetails);
    const uniqueMediaTypes = [...new Set(result.map(r => r.mediaType).filter(Boolean))];
    return uniqueMediaTypes;
  }

  async getPositionsByMediaType(mediaType: string): Promise<string[]> {
    const result = await db.select({ position: roDetails.position })
      .from(roDetails)
      .where(eq(roDetails.mediaType, mediaType));
    return result.map(r => r.position).filter(Boolean);
  }
}

export const storage = new DbStorage();

