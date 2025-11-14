import type { Express } from "express";
import multer from "multer";
import { Client } from "@replit/object-storage";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import { storage } from "./storage";
import { db } from "./db";
import { banners, versionHistory, workOrders, workOrderItems, releaseOrders, releaseOrderItems, invoices, activityLogs, deployments, bookings, payments, analytics, proposals } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { insertUserSchema, insertOtpCodeSchema, insertSlotSchema, insertBookingSchema, insertBannerSchema, insertApprovalSchema, signupSchema, users } from "@shared/schema";
import { notificationService } from "./services/notification";
import { analyticsService } from "./services/analytics";
import { emailService } from "./services/email";

const upload = multer({ storage: multer.memoryStorage() });

const SERVICE_PROVIDER = {
  brandLine1: "T.I.M.E.",
  brandLine2: "Triumphant Institute of Management Education Pvt. Ltd.",
  name: "Advanced Educational Activities Private Limited",
  addressLines: [
    "95B, II FLOOR,",
    "SIDDAMSHEETY COMPLEX,",
    "PARKLANE,",
    "SECUNDERABAD - 500 003",
    "STATE: TELANGANA",
  ],
  gst: "GST NO. 36AAGCS0684P1ZQ",
};

const BANK_DETAILS = {
  name: "Advanced Educational Activities Private Limited",
  accountNumber: "1077102100000230",
  bank: "PUNJAB NATIONAL BANK",
  branch: "BOWENPALLY",
  ifsc: "PUNB0107710",
};

const DEFAULT_HSN = "998365";

function formatCurrencyINR(value: number): string {
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0 }).format(Math.round(value));
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatSingleDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = String(date.getFullYear()).slice(-2);
  return `${day}${getOrdinalSuffix(day)} ${month}'${year}`;
}

function formatDateRange(start?: string | null, end?: string | null): string {
  if (start && end) {
    return `${formatSingleDate(start)} to ${formatSingleDate(end)}`;
  }
  if (start) return formatSingleDate(start);
  if (end) return formatSingleDate(end);
  return "";
}

function convertBelowThousand(num: number, ones: string[], tens: string[]): string {
  const hundred = Math.floor(num / 100);
  const rest = num % 100;
  let words = "";
  if (hundred > 0) {
    words += `${ones[hundred]} Hundred`;
    if (rest > 0) words += " ";
  }
  if (rest > 0) {
    if (rest < 20) {
      words += ones[rest];
    } else {
      const ten = Math.floor(rest / 10);
      const unit = rest % 10;
      words += tens[ten];
      if (unit > 0) words += ` ${ones[unit]}`;
    }
  }
  return words;
}

function numberToIndianWords(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const absolute = Math.floor(Math.abs(amount));
  if (absolute === 0) return "ZERO";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Lakh", "Crore", "Arab", "Kharab"];

  const segments: number[] = [];
  segments.push(absolute % 1000);
  let remaining = Math.floor(absolute / 1000);
  while (remaining > 0) {
    segments.push(remaining % 100);
    remaining = Math.floor(remaining / 100);
  }

  const words: string[] = [];
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (segment === 0) continue;
    const segmentWords = convertBelowThousand(segment, ones, tens);
    const scale = scales[i];
    words.push(scale ? `${segmentWords} ${scale}` : segmentWords);
  }

  const finalWords = words.join(" ").trim();
  return finalWords.toUpperCase();
}

export function registerRoutes(app: Express) {
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = signupSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered. Please login instead." });
      }
      
      const existingPhone = await storage.getUserByPhone(validatedData.phone);
      if (existingPhone) {
        return res.status(400).json({ error: "Phone number already registered. Please login instead." });
      }
      
      const user = await storage.createUser({
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        role: "client",
        businessSchoolName: validatedData.businessSchoolName,
        schoolAddress: validatedData.schoolAddress,
        gstNumber: validatedData.gstNumber,
      });
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.createOtpCode({ phone: validatedData.phone, code, expiresAt, verified: false });
      
      console.log(`OTP for ${validatedData.phone}: ${code}`);
      
      res.json({ success: true, message: "Account created! Please verify your phone with the OTP sent.", userId: user.id });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await storage.createOtpCode({ phone, code, expiresAt, verified: false });
      
      // TODO: Send OTP via SMS service
      console.log(`\n🔐 OTP for ${phone}: ${code}\n`);
      
      res.json({ success: true, message: "OTP sent successfully" });
    } catch (error: any) {
      console.error("Send OTP error:", error);
      res.status(500).json({ error: "Failed to send OTP. Please try again." });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, code } = req.body;
      
      const otp = await storage.getValidOtp(phone, code);
      if (!otp) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      
      if (new Date() > new Date(otp.expiresAt)) {
        return res.status(400).json({ error: "OTP has expired" });
      }
      
      await storage.markOtpAsVerified(otp.id);
      
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ error: "User not found. Please contact administrator to create your account." });
      }
      
      res.json({ success: true, user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  });

  // Slot routes
  app.get("/api/slots", async (req, res) => {
    const slots = await storage.getAllSlots();
    res.json(slots);
  });

  // Get available slots for date range
  app.get("/api/slots/available", async (req, res) => {
    try {
      const { startDate, endDate, pageType, mediaType } = req.query as Record<string, string | undefined>;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      // Get all slots
      let slots = await storage.getAllSlots();

      // Filter by page type if provided
      if (pageType) slots = slots.filter(s => s.pageType === pageType);
      // Filter by media type if provided
      if (mediaType) slots = slots.filter(s => s.mediaType === mediaType);

      // Blocked slots: if isBlocked and blockUntil >= startDate, exclude; if blockUntil < startDate, allow
      const start = new Date(startDate as string);
      slots = slots.filter(s => {
        if (!s.isBlocked) return true;
        if (!s.blockUntil) return false;
        const until = new Date(s.blockUntil as any);
        return until < start; // only available after blockUntil
      });
      // Only show slots marked available in DB
      slots = slots.filter(s => s.status === "available");

      // Get all bookings that overlap with the date range
      const allBookings = await storage.getAllBookings();
      const overlappingBookings = allBookings.filter(booking => {
        const bookingStart = new Date(booking.startDate);
        const bookingEnd = new Date(booking.endDate);
        const rangeStart = new Date(startDate as string);
        const rangeEnd = new Date(endDate as string);

        // Check if date ranges overlap
        return bookingStart <= rangeEnd && bookingEnd >= rangeStart;
      });

      // Filter out slots that are booked in the overlapping bookings
      const blockingStatuses = new Set([
        "pending_manager",
        "pending_vp",
        "pending_pv",
        "pending_payment",
        "pending_deployment",
        "approved",
        "active",
        "paused",
      ]);
      const bookedSlotIds = new Set(
        overlappingBookings.filter(b => blockingStatuses.has(b.status as any)).map(b => b.slotId)
      );
      const availableSlots = slots.filter(s => !bookedSlotIds.has(s.id));

      res.json(availableSlots);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch available slots", details: error.message });
    }
  });

  // All slots with computed availability for a given date range
  app.get("/api/slots/availability", async (req, res) => {
    try {
      const { startDate, endDate, pageType, mediaType } = req.query as Record<string, string | undefined>;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      const rangeStart = new Date(startDate as string);
      const rangeEnd = new Date(endDate as string);
      // Base slots
      let slotsList = await storage.getAllSlots();
      if (mediaType) slotsList = slotsList.filter(s => s.mediaType === mediaType);
      if (pageType) slotsList = slotsList.filter(s => s.pageType === pageType);

      // Preload work order items for relevant slots
      // We fetch all WO items and filter in-memory for simplicity
      const allWorkOrders = await db.select().from(workOrders);
      const allWorkOrderItems = await db.select().from(workOrderItems);
      const woById = new Map<number, any>(allWorkOrders.map((w: any) => [w.id, w]));

      const blocksForSlot = (slotId: number) => {
        // Blocks due to manager manual block (slot fields)
        // Overlapping if [blockStart, blockUntil] overlaps [rangeStart, rangeEnd]
        const slot = slotsList.find(s => s.id === slotId);
        let managerBlocked = false;
        if (slot?.isBlocked) {
          const s = slot.blockStart ? new Date(slot.blockStart as any) : null;
          const e = slot.blockUntil ? new Date(slot.blockUntil as any) : null;
          if (s && e && s <= rangeEnd && e >= rangeStart) {
            managerBlocked = true;
          } else if (s && !e && s <= rangeEnd) {
            managerBlocked = true;
          } else if (!s && e && e >= rangeStart) {
            managerBlocked = true;
          }
        }
        if (managerBlocked) return { blocked: true, blockType: "manager_block", state: "booked" };

        // Blocks due to work order items (for any non-rejected WO)
        const items = allWorkOrderItems.filter((it: any) => it.slotId === slotId);
        let hasBooked = false;
        let bookedWoId: number | null = null;
        for (const it of items) {
          const wo = woById.get(it.workOrderId);
          if (!wo) continue;
          // Consider WOs that are not rejected
          if (wo.status === "rejected") continue;
          const iStart = new Date(it.startDate as any);
          const iEnd = new Date(it.endDate as any);
          const overlap = iStart <= rangeEnd && iEnd >= rangeStart;
          if (overlap) {
            // Treat any requested/processing (draft/quoted) and later states as booked for availability
            // Only 'rejected' above is ignored; everything else blocks as 'booked'
            hasBooked = true;
            bookedWoId = wo.id;
          }
        }
        if (hasBooked) return { blocked: true, blockType: "work_order", state: "booked", workOrderId: bookedWoId };
        return { blocked: false, blockType: null, state: "available" };
      };

      const out = slotsList.map((s: any) => {
        const blk = blocksForSlot(s.id);
        return {
          ...s,
          status: blk.blocked ? (blk as any).state : "available",
          blockType: blk.blockType,
          blockingWorkOrderId: (blk as any).workOrderId || null,
        };
      });
      res.json(out);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to compute availability", details: error.message });
    }
  });
  app.get("/api/slots/:id", async (req, res) => {
    const slot = await storage.getSlot(parseInt(req.params.id));
    if (!slot) {
      return res.status(404).json({ error: "Slot not found" });
    }
    res.json(slot);
  });

  app.post("/api/slots", async (req, res) => {
    try {
      const validatedData = insertSlotSchema.parse(req.body);
      const slot = await storage.createSlot(validatedData);
      res.json(slot);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/slots/:id", async (req, res) => {
    const slot = await storage.updateSlot(parseInt(req.params.id), req.body);
    if (!slot) {
      return res.status(404).json({ error: "Slot not found" });
    }
    res.json(slot);
  });

  // Slot state transition routes
  app.post("/api/slots/:id/select", async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const updatedSlot = await storage.selectSlot(slotId, userId);

      if (!updatedSlot) {
        const slot = await storage.getSlot(slotId);
        if (!slot) {
          return res.status(404).json({ error: "Slot not found" });
        }
        return res.status(409).json({ 
          error: "Slot is not available", 
          currentStatus: slot.status,
          reservedBy: slot.reservedByUserId 
        });
      }

      res.json(updatedSlot);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/slots/:id/release", async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const updatedSlot = await storage.releaseSlot(slotId, userId);

      if (!updatedSlot) {
        const slot = await storage.getSlot(slotId);
        if (!slot) {
          return res.status(404).json({ error: "Slot not found" });
        }
        if (slot.status !== "pending") {
          return res.status(409).json({ 
            error: "Only pending slots can be released",
            currentStatus: slot.status
          });
        }
        return res.status(403).json({ 
          error: "You cannot release a slot reserved by another user" 
        });
      }

      res.json(updatedSlot);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/slots/:id/confirm", async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const updatedSlot = await storage.confirmSlot(slotId, userId);

      if (!updatedSlot) {
        const slot = await storage.getSlot(slotId);
        if (!slot) {
          return res.status(404).json({ error: "Slot not found" });
        }
        if (slot.status !== "pending") {
          return res.status(409).json({ 
            error: "Slot must be in pending status to confirm", 
            currentStatus: slot.status 
          });
        }
        return res.status(403).json({ 
          error: "You can only confirm slots you reserved" 
        });
      }

      res.json(updatedSlot);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manual slot blocking/unblocking
  app.post("/api/slots/:id/block", async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      const { reason, startDate, endDate, managerId } = req.body as { reason?: string; startDate?: string; endDate?: string; managerId?: number };
      const slot = await storage.getSlot(slotId);
      if (!slot) return res.status(404).json({ error: "Slot not found" });
      if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate are required to block a slot" });

      // Prevent blocking overlaps with existing client work orders (non-rejected)
      try {
        const s = new Date(startDate as any);
        const e = new Date(endDate as any);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) {
          return res.status(400).json({ error: "Invalid start or end date" });
        }
        const items = await db.select().from(workOrderItems).where(eq(workOrderItems.slotId, slotId));
        const woIds = Array.from(new Set(items.map((it: any) => it.workOrderId))).filter(Boolean) as number[];
        const allWos = await db.select().from(workOrders);
        const woMap = new Map<number, any>(allWos.map((w: any) => [w.id, w]));
        for (const it of items) {
          const wo = woMap.get(it.workOrderId);
          if (!wo || wo.status === "rejected") continue;
          const iStart = new Date(it.startDate as any);
          const iEnd = new Date(it.endDate as any);
          const overlap = iStart <= e && iEnd >= s;
          if (overlap) {
            return res.status(409).json({ error: "Cannot block this slot: overlaps with an existing client work order period." });
          }
        }
      } catch (err: any) {
        return res.status(500).json({ error: "Failed to validate block against existing work orders", details: err.message });
      }
      const updated = await storage.updateSlot(slotId, {
        isBlocked: true,
        blockReason: reason || null as any,
        blockedById: managerId as any,
        blockStart: startDate as any,
        blockUntil: endDate as any,
        status: "available" as any, // keep status but mark blocked
      } as any);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/slots/:id/unblock", async (req, res) => {
    try {
      const slotId = parseInt(req.params.id);
      const slot = await storage.getSlot(slotId);
      if (!slot) return res.status(404).json({ error: "Slot not found" });
      const updated = await storage.updateSlot(slotId, {
        isBlocked: false,
        blockReason: null as any,
        blockedById: null as any,
        blockStart: null as any,
        blockUntil: null as any,
      } as any);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Booking routes
  app.get("/api/bookings", async (req, res) => {
    const { clientId, status } = req.query;
    
    if (clientId) {
      const bookings = await storage.getBookingsByClient(parseInt(clientId as string));
      return res.json(bookings);
    }
    
    if (status) {
      const bookings = await storage.getBookingsByStatus(status as string);
      return res.json(bookings);
    }
    
    const bookings = await storage.getAllBookings();
    res.json(bookings);
  });

  app.get("/api/bookings/:id", async (req, res) => {
    const booking = await storage.getBooking(parseInt(req.params.id));
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.json(booking);
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);

      // Enforce: only one slot per section for a client (section = website:pageType, or mediaType for others)
      const slot = await storage.getSlot(validatedData.slotId);
      if (!slot) {
        return res.status(404).json({ error: "Slot not found" });
      }

      const incomingKey = slot.mediaType === "website" ? `website:${slot.pageType}` : slot.mediaType;
      const clientBookings = await storage.getBookingsByClient(validatedData.clientId);
      const blockingStatuses = new Set([
        "pending_manager",
        "pending_vp",
        "pending_pv",
        "pending_payment",
        "pending_deployment",
        "approved",
        "active",
        "paused",
      ]);
      const rangeStart = new Date(validatedData.startDate as any);
      const rangeEnd = new Date(validatedData.endDate as any);

      for (const b of clientBookings) {
        if (!blockingStatuses.has(b.status as any)) continue;
        // Overlapping date ranges
        const bStart = new Date(b.startDate as any);
        const bEnd = new Date(b.endDate as any);
        if (!(bStart <= rangeEnd && bEnd >= rangeStart)) continue;
        const bSlot = await storage.getSlot(b.slotId);
        if (!bSlot) continue;
        const bKey = bSlot.mediaType === "website" ? `website:${bSlot.pageType}` : bSlot.mediaType;
        if (bKey === incomingKey) {
          return res.status(400).json({ error: "Only one slot per section is allowed for the selected period" });
        }
      }

      const booking = await storage.createBooking(validatedData);
      
      // Create approval workflow entries
      await storage.createApproval({
        bookingId: booking.id,
        role: "manager",
        status: "pending",
        approverId: null,
      });
      
      // Create installments if payment type is installment
      const paymentType = (req.body as any).paymentType;
      if (paymentType === "installment") {
        try {
          console.log(`[POST /api/bookings] Creating installments for booking ${booking.id} with installment payment type`);
          const totalAmount = Number(booking.totalAmount);
          const startDate = new Date(validatedData.startDate as any);
          
          if (isNaN(totalAmount) || totalAmount <= 0) {
            console.error(`[POST /api/bookings] Invalid booking amount for installment creation: ${booking.totalAmount}`);
          } else {
            // Create 2 installments: 50% advance, 50% before campaign start
            const advanceAmount = totalAmount * 0.5;
            const balanceAmount = totalAmount * 0.5;
            
            // First installment: 50% advance (due 7 days from now)
            const advanceDueDate = new Date();
            advanceDueDate.setDate(advanceDueDate.getDate() + 7);
            
            // Second installment: 50% before campaign start (due 7 days before start date)
            const balanceDueDate = new Date(startDate);
            balanceDueDate.setDate(balanceDueDate.getDate() - 7);
            
            await storage.createInstallment({
              bookingId: booking.id,
              amount: String(advanceAmount),
              dueDate: advanceDueDate.toISOString().split('T')[0] as any,
              status: "pending" as any,
            });
            
            await storage.createInstallment({
              bookingId: booking.id,
              amount: String(balanceAmount),
              dueDate: balanceDueDate.toISOString().split('T')[0] as any,
              status: "pending" as any,
            });
            
            console.log(`[POST /api/bookings] Created 2 installments for booking ${booking.id}`);
          }
        } catch (installmentError: any) {
          console.error(`[POST /api/bookings] Error creating installments for booking ${booking.id}:`, installmentError);
          // Don't fail the booking creation if installments fail
        }
      }
      
      // Send notifications
      await notificationService.notifyBookingCreated(booking.id, booking.clientId);
      
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/bookings/:id", async (req, res) => {
    const booking = await storage.updateBooking(parseInt(req.params.id), req.body);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.json(booking);
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const bookingId = parseInt(req.params.id);
      
      // Get all approvals for this booking to update the current one
      const approvals = await storage.getApprovalsByBooking(bookingId);
      
      // Determine which approval to mark as approved/rejected based on the new status
      let roleToUpdate: "client" | "manager" | "vp" | "pv_sir" | "accounts" | "it" | null = null;
      let nextRoleToCreate: "client" | "manager" | "vp" | "pv_sir" | "accounts" | "it" | null = null;
      
      if (status === "pending_vp") {
        roleToUpdate = "manager";
        nextRoleToCreate = "vp";
      } else if (status === "pending_pv") {
        roleToUpdate = "vp";
        nextRoleToCreate = "pv_sir";
      } else if (status === "pending_payment") {
        roleToUpdate = "pv_sir";
        nextRoleToCreate = "accounts";
      } else if (status === "pending_deployment") {
        roleToUpdate = "accounts";
        nextRoleToCreate = "it";
      } else if (status === "active") {
        roleToUpdate = "it";
        nextRoleToCreate = null;
      } else if (status === "rejected") {
        // Find the pending approval and mark it as rejected
        const pendingApproval = approvals.find(a => a.status === "pending");
        if (pendingApproval) {
          await storage.updateApproval(pendingApproval.id, { status: "rejected" });
        }
      }
      
      // Update the current stage approval to "approved"
      if (roleToUpdate) {
        const currentApproval = approvals.find(a => a.role === roleToUpdate && a.status === "pending");
        if (currentApproval) {
          await storage.updateApproval(currentApproval.id, { status: "approved" });
        }
      }
      
      // Create next stage approval if needed (check for duplicates first)
      if (nextRoleToCreate) {
        const existingNextApproval = approvals.find(a => a.role === nextRoleToCreate);
        if (!existingNextApproval) {
          await storage.createApproval({
            bookingId,
            role: nextRoleToCreate,
            status: "pending",
            approverId: null,
          });
        }
      }
      
      // Finally update the booking status
      const booking = await storage.updateBooking(bookingId, { status });
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Banner routes
  app.get("/api/banners/booking/:bookingId", async (req, res) => {
    const banners = await storage.getBannersByBooking(parseInt(req.params.bookingId));
    res.json(banners);
  });

  app.get("/api/banners/current/:bookingId", async (req, res) => {
    const banner = await storage.getCurrentBanner(parseInt(req.params.bookingId));
    res.json(banner);
  });

  app.post("/api/banners", async (req, res) => {
    try {
      const validatedData = insertBannerSchema.parse(req.body);
      const banner = await storage.createBanner(validatedData);
      res.json(banner);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get banners by booking
  app.get("/api/banners/:bookingId", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      if (isNaN(bookingId)) {
        return res.status(400).json({ error: "Invalid booking ID" });
      }
      
      const banners = await storage.getBannersByBooking(bookingId);
      res.json(banners);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch banners", details: error.message });
    }
  });

  app.post("/api/banners/upload", upload.single("file"), async (req, res) => {
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    
    let uploadedFileName: string | null = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          error: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed" 
        });
      }

      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ 
          error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
        });
      }

      const { bookingId, uploadedById } = req.body;

      if (!bookingId || !uploadedById) {
        return res.status(400).json({ error: "bookingId and uploadedById are required" });
      }

      const parsedBookingId = parseInt(bookingId, 10);
      const parsedUploadedById = parseInt(uploadedById, 10);

      if (isNaN(parsedBookingId) || isNaN(parsedUploadedById)) {
        return res.status(400).json({ error: "bookingId and uploadedById must be valid numbers" });
      }

      const booking = await storage.getBooking(parsedBookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const existingBanners = await storage.getBannersByBooking(parsedBookingId);
      const nextVersion = existingBanners.length > 0 
        ? Math.max(...existingBanners.map(b => b.version)) + 1 
        : 1;

      const fileExtension = path.extname(req.file.originalname);
      const fileName = `banner-${parsedBookingId}-v${nextVersion}-${Date.now()}${fileExtension}`;
      uploadedFileName = fileName;
      
      const objectStorageClient = new Client();
      
      try {
        await objectStorageClient.uploadFromBytes(fileName, req.file.buffer);
      } catch (storageError: any) {
        return res.status(500).json({ 
          error: "Failed to upload file to storage", 
          details: storageError.message 
        });
      }

      // For Replit Object Storage, the file URL is just the filename
      const fileUrl = fileName;

      let banner;
      try {
        console.log(`[POST /api/banners/upload] Creating banner for booking ${parsedBookingId}, version ${nextVersion}`);
        banner = await db.transaction(async (tx) => {
          const currentBannerResult = await tx.select().from(banners)
            .where(and(eq(banners.bookingId, parsedBookingId), eq(banners.isCurrent, true)));
          const currentBanner = currentBannerResult[0];
          
          const [newBanner] = await tx.insert(banners).values({
            bookingId: parsedBookingId,
            fileUrl: fileUrl,
            version: nextVersion,
            uploadedById: parsedUploadedById,
            status: "pending",
            isCurrent: true,
          }).returning();
          
          console.log(`[POST /api/banners/upload] Banner inserted with ID: ${newBanner.id}`);

          if (currentBanner) {
            await tx.update(banners).set({ isCurrent: false }).where(eq(banners.id, currentBanner.id));
            console.log(`[POST /api/banners/upload] Marked previous banner ${currentBanner.id} as not current`);
          }

          // Create version history for all banners (including first one)
          console.log(`[POST /api/banners/upload] Creating version history for banner ${newBanner.id}, version ${nextVersion}`);
          try {
            await tx.insert(versionHistory).values({
              bannerId: newBanner.id,
              version: nextVersion,
              fileUrl: fileUrl,
              editedById: parsedUploadedById,
              comments: req.body.comments || null,
            });
            console.log(`[POST /api/banners/upload] Version history created for banner ${newBanner.id}`);
          } catch (vhError: any) {
            console.error(`[POST /api/banners/upload] Error creating version history:`, vhError);
            console.error(`[POST /api/banners/upload] Error message:`, vhError.message);
            console.error(`[POST /api/banners/upload] Error code:`, vhError.code);
            console.error(`[POST /api/banners/upload] Error detail:`, vhError.detail);
            // Don't fail the banner creation if version history fails
          }

          return newBanner;
        });
        console.log(`[POST /api/banners/upload] Banner ${banner.id} created successfully`);
      } catch (dbError: any) {
        try {
          await objectStorageClient.delete(fileName);
        } catch {
          // Cleanup failed - file will be orphaned
        }
        uploadedFileName = null;
        return res.status(500).json({ 
          error: "Database transaction failed", 
          details: dbError.message 
        });
      }

      res.json({
        success: true,
        banner,
        message: `Banner uploaded successfully as version ${nextVersion}`,
      });
    } catch (error: any) {
      if (uploadedFileName) {
        try {
          const objectStorageClient = new Client();
          await objectStorageClient.delete(uploadedFileName);
        } catch {
          // Cleanup failed - log but don't fail the request
        }
      }
      
      res.status(500).json({ 
        error: "Banner upload failed", 
        details: error.message 
      });
    }
  });

  // Approval routes
  app.get("/api/approvals/booking/:bookingId", async (req, res) => {
    const approvals = await storage.getApprovalsByBooking(parseInt(req.params.bookingId));
    res.json(approvals);
  });

  app.get("/api/approvals/pending/:role", async (req, res) => {
    const approvals = await storage.getPendingApprovals(req.params.role);
    res.json(approvals);
  });

  app.post("/api/approvals", async (req, res) => {
    try {
      const validatedData = insertApprovalSchema.parse(req.body);
      const approval = await storage.createApproval(validatedData);
      res.json(approval);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/approvals/:id", async (req, res) => {
    const approval = await storage.updateApproval(parseInt(req.params.id), req.body);
    if (!approval) {
      return res.status(404).json({ error: "Approval not found" });
    }
    
    // Handle approval workflow progression
    if (approval.status === "approved") {
      const booking = await storage.getBooking(approval.bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Progress to next stage
      if (approval.role === "manager" && booking.status === "pending_manager") {
        await storage.updateBooking(booking.id, { status: "pending_vp" });
        await storage.createApproval({
          bookingId: booking.id,
          role: "vp",
          status: "pending",
          approverId: null,
        });
      } else if (approval.role === "vp" && booking.status === "pending_vp") {
        await storage.updateBooking(booking.id, { status: "pending_pv" });
        await storage.createApproval({
          bookingId: booking.id,
          role: "pv_sir",
          status: "pending",
          approverId: null,
        });
      } else if (approval.role === "accounts" && booking.status === "pending_payment") {
        await storage.updateBooking(booking.id, { status: "pending_deployment" });
        await storage.createApproval({
          bookingId: booking.id,
          role: "it",
          status: "pending",
          approverId: null,
        });
      } else if (approval.role === "it" && booking.status === "pending_deployment") {
        await storage.updateBooking(booking.id, { status: "active" });
      }
      
      // Send approval notifications
      await notificationService.notifyApprovalStatusChange(
        approval.bookingId,
        "approved",
        approval.role,
        req.body.comments
      );
    } else if (approval.status === "rejected") {
      await storage.updateBooking(approval.bookingId, { status: "rejected" });
      
      // Send rejection notifications
      await notificationService.notifyApprovalStatusChange(
        approval.bookingId,
        "rejected",
        approval.role,
        req.body.comments
      );
    }
    
    res.json(approval);
  });

  // Notification routes
  app.get("/api/notifications/:userId", async (req, res) => {
    const notifications = await notificationService.getUserNotifications(parseInt(req.params.userId));
    res.json(notifications);
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    await notificationService.markAsRead(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.patch("/api/notifications/:userId/read-all", async (req, res) => {
    await notificationService.markAllAsRead(parseInt(req.params.userId));
    res.json({ success: true });
  });

  // Analytics routes
  app.get("/api/analytics/banner/:bannerId", async (req, res) => {
    const { startDate, endDate } = req.query;
    const analytics = await analyticsService.getBannerAnalytics(
      parseInt(req.params.bannerId),
      startDate as string,
      endDate as string
    );
    res.json(analytics);
  });

  app.get("/api/analytics/booking/:bookingId", async (req, res) => {
    const { startDate, endDate } = req.query;
    const analytics = await analyticsService.getBookingAnalytics(
      parseInt(req.params.bookingId),
      startDate as string,
      endDate as string
    );
    res.json(analytics);
  });

  app.post("/api/analytics/track/impression/:bannerId", async (req, res) => {
    const success = await analyticsService.trackImpression(parseInt(req.params.bannerId));
    res.json({ success });
  });

  app.post("/api/analytics/track/click/:bannerId", async (req, res) => {
    const success = await analyticsService.trackClick(parseInt(req.params.bannerId));
    res.json({ success });
  });

  // Proposals routes
  app.post("/api/proposals", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { bookingId } = req.body;
      if (!bookingId) {
        return res.status(400).json({ error: "bookingId is required" });
      }

      const parsedBookingId = parseInt(bookingId, 10);
      if (isNaN(parsedBookingId)) {
        return res.status(400).json({ error: "bookingId must be a valid number" });
      }

      // Check if booking exists
      const booking = await storage.getBooking(parsedBookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Save file
      const ext = path.extname(req.file.originalname) || '.pdf';
      const fileName = `proposal-${parsedBookingId}-${Date.now()}${ext}`;
      try {
        const uploadDir = path.resolve(process.cwd(), "server", "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
      } catch (fsError: any) {
        return res.status(500).json({ error: "Failed to store proposal", details: fsError.message });
      }

      // Create proposal record
      console.log(`[POST /api/proposals] Creating proposal for booking ${parsedBookingId}`);
      const proposal = await storage.createProposal({
        bookingId: parsedBookingId,
        fileUrl: `/uploads/${fileName}`,
      });
      console.log(`[POST /api/proposals] Proposal ${proposal.id} created successfully`);

      res.json({
        success: true,
        proposal,
        message: "Proposal uploaded successfully",
      });
    } catch (error: any) {
      console.error(`[POST /api/proposals] Error:`, error);
      res.status(400).json({ error: error.message });
    }
  });

  // Version history routes
  app.get("/api/version-history/:bannerId", async (req, res) => {
    const history = await storage.getVersionHistory(parseInt(req.params.bannerId));
    res.json(history);
  });

  // Payment routes
  app.get("/api/payments/booking/:bookingId", async (req, res) => {
    const payments = await storage.getPaymentsByBooking(parseInt(req.params.bookingId));
    res.json(payments);
  });

  // Get all payments for a work order (via bookings)
  app.get("/api/payments/work-order/:workOrderId", async (req, res) => {
    try {
      const workOrderId = parseInt(req.params.workOrderId);
      const allBookings = await db.select().from(bookings).where(eq(bookings.workOrderId, workOrderId));
      const allPayments = [];
      
      for (const booking of allBookings) {
        const payments = await storage.getPaymentsByBooking(booking.id);
        allPayments.push(...payments);
      }
      
      res.json(allPayments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get all installments for a work order (via bookings)
  app.get("/api/installments/work-order/:workOrderId", async (req, res) => {
    try {
      const workOrderId = parseInt(req.params.workOrderId);
      const allBookings = await db.select().from(bookings).where(eq(bookings.workOrderId, workOrderId));
      const allInstallments = [];
      
      for (const booking of allBookings) {
        const installments = await storage.getInstallmentsByBooking(booking.id);
        allInstallments.push(...installments);
      }
      
      res.json(allInstallments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get comprehensive payment data for a work order (bookings, installments, payments)
  app.get("/api/work-orders/:id/payment-data", async (req, res) => {
    try {
      const workOrderId = parseInt(req.params.id);
      const wo = await storage.getWorkOrder(workOrderId);
      if (!wo) return res.status(404).json({ error: "Work Order not found" });
      
      // Get all bookings for this work order
      const allBookings = await db.select().from(bookings).where(eq(bookings.workOrderId, workOrderId));
      
      // Get installments and payments for each booking
      const bookingsWithData = await Promise.all(
        allBookings.map(async (booking) => {
          const installments = await storage.getInstallmentsByBooking(booking.id);
          const payments = await storage.getPaymentsByBooking(booking.id);
          return {
            booking,
            installments,
            payments,
          };
        })
      );
      
      res.json({
        workOrder: wo,
        bookings: bookingsWithData,
        summary: {
          totalBookings: allBookings.length,
          totalInstallments: bookingsWithData.reduce((sum, b) => sum + b.installments.length, 0),
          totalPayments: bookingsWithData.reduce((sum, b) => sum + b.payments.length, 0),
          totalPaidAmount: bookingsWithData.reduce((sum, b) => 
            sum + b.payments.reduce((pSum, p) => pSum + Number(p.amount), 0), 0
          ),
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Work Orders
  app.post("/api/work-orders", async (req, res) => {
    try {
      const { clientId, businessSchoolName, contactName, items, includeEmail, includeWhatsApp, rangeStart, rangeEnd, createdById } = req.body as {
        clientId: number;
        businessSchoolName?: string;
        contactName?: string;
        items: Array<{ slotId: number; startDate: string; endDate: string; unitPrice?: string | number }>;
        includeEmail?: boolean;
        includeWhatsApp?: boolean;
        rangeStart?: string;
        rangeEnd?: string;
        createdById?: number;
      };

      if (!clientId || !Array.isArray(items)) {
        return res.status(400).json({ error: "clientId and items are required" });
      }
      if (items.length === 0 && !includeEmail && !includeWhatsApp) {
        return res.status(400).json({ error: "At least one slot or an add-on (email/whatsapp) must be selected" });
      }

      // create items with zero pricing; manager will set prices later
      const sectionKeys: string[] = [];
      const enriched = await Promise.all(
        items.map(async (it) => {
          const slot = await storage.getSlot(it.slotId);
          if (!slot) throw new Error(`Slot ${it.slotId} not found`);
          const key = slot.mediaType === "website" ? `website:${slot.pageType}` : slot.mediaType;
          sectionKeys.push(key);
          const unit = 0;
          return { ...it, unitPrice: unit, subtotal: unit };
        })
      );

      // Enforce: only one slot per section within a single request
      const seen = new Set<string>();
      for (const k of sectionKeys) {
        if (seen.has(k)) {
          return res.status(400).json({ error: "Only one slot per section can be selected in a single request" });
        }
        seen.add(k);
      }
      // Add-ons pricing
      const emailPrice = 0;
      const whatsappPrice = 0;

      let addonItems: Array<{ addonType: "email" | "whatsapp"; startDate: string; endDate: string; unitPrice: number; subtotal: number }> = [];
      const addonStart = items[0]?.startDate || rangeStart;
      const addonEnd = items[0]?.endDate || rangeEnd;
      if ((includeEmail || includeWhatsApp) && (!addonStart || !addonEnd)) {
        return res.status(400).json({ error: "Start and end dates are required for addons" });
      }
      if (includeEmail) addonItems.push({ addonType: "email", startDate: addonStart as string, endDate: addonEnd as string, unitPrice: emailPrice, subtotal: emailPrice });
      if (includeWhatsApp) addonItems.push({ addonType: "whatsapp", startDate: addonStart as string, endDate: addonEnd as string, unitPrice: whatsappPrice, subtotal: whatsappPrice });

      const totalAmount = [...enriched, ...addonItems].reduce((sum, it) => sum + (it.subtotal as number), 0);

      // Fetch client information to populate businessSchoolName and contactName if not provided
      let finalBusinessSchoolName = businessSchoolName;
      let finalContactName = contactName;
      
      if (!finalBusinessSchoolName || !finalContactName) {
        try {
          const [client] = await db.select().from(users).where(eq(users.id, clientId));
          if (client) {
            // Populate businessSchoolName if not provided
            if (!finalBusinessSchoolName) {
              finalBusinessSchoolName = client.businessSchoolName || null;
            }
            // Populate contactName if not provided (use client name)
            if (!finalContactName) {
              finalContactName = client.name || null;
            }
          }
        } catch (error) {
          console.error(`Error fetching client info for work order:`, error);
        }
      }

      // Determine creator name and created on (date/time) snapshots
      let creatorName: string | null = null;
      try {
        const [creator] = createdById ? await db.select().from(users).where(eq(users.id, createdById)) : [];
        if (creator) creatorName = creator.name as any;
        if (!creatorName) {
          const [client] = await db.select().from(users).where(eq(users.id, clientId));
          creatorName = client?.name || null;
        }
      } catch {}
      const now = new Date();
      const createdOnDate = now.toISOString().split("T")[0];
      const createdOnTime = now.toTimeString().split(" ")[0]; // HH:MM:SS

      // Get payment mode from request body (default to "full")
      const { paymentMode = "full" } = req.body as { paymentMode?: "full" | "installment" };
      
      const wo = await storage.createWorkOrder({
        clientId,
        businessSchoolName: finalBusinessSchoolName,
        contactName: finalContactName,
        status: "draft",
        paymentMode: paymentMode as any,
        totalAmount: String(totalAmount),
        createdById: createdById as any,
        createdByName: creatorName as any,
        createdOnDate: createdOnDate as any,
        createdOnTime: createdOnTime as any,
      });

      await storage.addWorkOrderItems(
        [
          ...enriched.map((it) => ({
          workOrderId: wo.id,
          slotId: it.slotId,
          startDate: it.startDate,
          endDate: it.endDate,
          unitPrice: String(it.unitPrice),
          subtotal: String(it.subtotal),
          })),
          ...addonItems.map((a) => ({
            workOrderId: wo.id,
            slotId: null as any,
            addonType: a.addonType,
            startDate: a.startDate,
            endDate: a.endDate,
            unitPrice: String(a.unitPrice),
            subtotal: String(a.subtotal),
          })),
        ]
      );

      // Create bookings for each slot item in the work order
      console.log("[POST /api/work-orders] Creating bookings from work order items...");
      for (const item of enriched) {
        if (item.slotId) {
          try {
            const slot = await storage.getSlot(item.slotId);
            if (slot) {
              // Check for existing bookings to avoid conflicts
              const clientBookings = await storage.getBookingsByClient(wo.clientId);
              const blockingStatuses = new Set([
                "pending_manager",
                "pending_vp",
                "pending_pv",
                "pending_payment",
                "pending_deployment",
                "approved",
                "active",
                "paused",
              ]);
              const rangeStart = new Date(item.startDate as any);
              const rangeEnd = new Date(item.endDate as any);
              
              const incomingKey = slot.mediaType === "website" ? `website:${slot.pageType}` : slot.mediaType;
              let hasConflict = false;
              
              for (const b of clientBookings) {
                if (!blockingStatuses.has(b.status as any)) continue;
                if (b.workOrderId === wo.id) continue; // Skip bookings from same work order
                const bStart = new Date(b.startDate as any);
                const bEnd = new Date(b.endDate as any);
                if (!(bStart <= rangeEnd && bEnd >= rangeStart)) continue;
                const bSlot = await storage.getSlot(b.slotId);
                if (!bSlot) continue;
                const bKey = bSlot.mediaType === "website" ? `website:${bSlot.pageType}` : bSlot.mediaType;
                if (bKey === incomingKey) {
                  hasConflict = true;
                  console.warn(`[POST /api/work-orders] Skipping booking for slot ${item.slotId} - conflict with existing booking ${b.id}`);
                  break;
                }
              }
              
              if (hasConflict) {
                continue; // Skip this booking
              }
              
              // Use slot pricing if unitPrice is 0 (work order pricing not set yet)
              const bookingAmount = item.unitPrice > 0 ? String(item.unitPrice) : String(slot.pricing);
              
              console.log(`[POST /api/work-orders] Creating booking for slot ${item.slotId}, work order ${wo.id}`);
              const booking = await storage.createBooking({
                clientId: wo.clientId,
                slotId: item.slotId,
                startDate: item.startDate as any,
                endDate: item.endDate as any,
                totalAmount: bookingAmount,
                workOrderId: wo.id,
              });
              
              // Create approval workflow entry
              try {
                await storage.createApproval({
                  bookingId: booking.id,
                  role: "manager",
                  status: "pending",
                  approverId: null,
                });
                console.log(`[POST /api/work-orders] Approval entry created for booking ${booking.id}`);
              } catch (approvalError) {
                console.error(`[POST /api/work-orders] Error creating approval for booking ${booking.id}:`, approvalError);
              }
              
              // Create installments if work order payment mode is installment
              if (wo.paymentMode === "installment") {
                try {
                  console.log(`[POST /api/work-orders] Work order ${wo.id} has installment payment mode, creating installments for booking ${booking.id}`);
                  const totalAmount = Number(bookingAmount);
                  const startDate = new Date(item.startDate as any);
                  
                  if (isNaN(totalAmount) || totalAmount <= 0) {
                    console.error(`[POST /api/work-orders] Invalid booking amount for installment creation: ${bookingAmount}`);
                  } else {
                    // Create 2 installments: 50% advance, 50% before campaign start
                    const advanceAmount = totalAmount * 0.5;
                    const balanceAmount = totalAmount * 0.5;
                    
                    // First installment: 50% advance (due 7 days from now)
                    const advanceDueDate = new Date();
                    advanceDueDate.setDate(advanceDueDate.getDate() + 7);
                    
                    // Second installment: 50% before campaign start (due 7 days before start date)
                    const balanceDueDate = new Date(startDate);
                    balanceDueDate.setDate(balanceDueDate.getDate() - 7);
                    
                    console.log(`[POST /api/work-orders] Creating installment 1: amount=${advanceAmount}, dueDate=${advanceDueDate.toISOString().split('T')[0]}`);
                    const installment1 = await storage.createInstallment({
                      bookingId: booking.id,
                      amount: String(advanceAmount),
                      dueDate: advanceDueDate.toISOString().split('T')[0] as any,
                      status: "pending" as any,
                    });
                    console.log(`[POST /api/work-orders] Installment 1 created with ID: ${installment1.id}`);
                    
                    console.log(`[POST /api/work-orders] Creating installment 2: amount=${balanceAmount}, dueDate=${balanceDueDate.toISOString().split('T')[0]}`);
                    const installment2 = await storage.createInstallment({
                      bookingId: booking.id,
                      amount: String(balanceAmount),
                      dueDate: balanceDueDate.toISOString().split('T')[0] as any,
                      status: "pending" as any,
                    });
                    console.log(`[POST /api/work-orders] Installment 2 created with ID: ${installment2.id}`);
                    
                    console.log(`[POST /api/work-orders] Successfully created 2 installments for booking ${booking.id} (work order ${wo.id})`);
                  }
                } catch (installmentError: any) {
                  console.error(`[POST /api/work-orders] Error creating installments for booking ${booking.id}:`, installmentError);
                  console.error(`[POST /api/work-orders] Error stack:`, installmentError.stack);
                  // Don't fail the booking creation if installments fail
                }
              } else {
                console.log(`[POST /api/work-orders] Work order ${wo.id} payment mode is "${wo.paymentMode}", skipping installment creation`);
              }
              
              console.log(`[POST /api/work-orders] Booking ${booking.id} created successfully`);
            }
          } catch (bookingError: any) {
            console.error(`[POST /api/work-orders] Error creating booking for slot ${item.slotId}:`, bookingError);
            // Continue with other items even if one fails
          }
        }
      }

      const workOrder = await storage.getWorkOrder(wo.id);
      const itemsOut = await storage.getWorkOrderItems(wo.id);

      // Notifications: inform client and all managers
      try {
        const [client] = await db.select().from(users).where(eq(users.id, clientId));
        if (client) {
          // Notify client: request submitted
          await notificationService.createNotification({
            userId: client.id,
            type: "work_order_created",
            message: `Your request (Work Order #${wo.id}) has been submitted and awaits manager quote.`,
          });

          // Notify managers: new request
          const managers = await db.select().from(users).where(eq(users.role, "manager"));
          for (const m of managers) {
            await notificationService.createNotification({
              userId: m.id,
              type: "approval_required",
              message: `New Work Order #${wo.id} from ${client.name} requires a quote.`,
            });
          }
        }
      } catch {}

      res.json({ workOrder, items: itemsOut });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/work-orders", async (req, res) => {
    const { clientId } = req.query as { clientId?: string };
    try {
      // Fetch work orders with client information using a join
      let all = await db
        .select({
          // Work order fields
          id: workOrders.id,
          clientId: workOrders.clientId,
          businessSchoolName: workOrders.businessSchoolName,
          contactName: workOrders.contactName,
          status: workOrders.status,
          paymentMode: workOrders.paymentMode,
          totalAmount: workOrders.totalAmount,
          gstPercent: workOrders.gstPercent,
          poUrl: workOrders.poUrl,
          poApproved: workOrders.poApproved,
          poApprovedAt: workOrders.poApprovedAt,
          negotiationRequested: workOrders.negotiationRequested,
          negotiationReason: workOrders.negotiationReason,
          negotiationRequestedAt: workOrders.negotiationRequestedAt,
          quotedById: workOrders.quotedById,
          createdById: workOrders.createdById,
          createdByName: workOrders.createdByName,
          createdOnDate: workOrders.createdOnDate,
          createdOnTime: workOrders.createdOnTime,
          createdAt: workOrders.createdAt,
          updatedAt: workOrders.updatedAt,
          // Client name from users table
          clientName: users.name,
        })
        .from(workOrders)
        .leftJoin(users, eq(workOrders.clientId, users.id))
        .orderBy(workOrders.createdAt as any);
      
      if (clientId) {
        const cid = Number(clientId);
        all = all.filter((w: any) => w.clientId === cid);
      }
      
      const result = await Promise.all(
        all.map(async (wo: any) => {
          const rawItems = await storage.getWorkOrderItems(wo.id);
          const items = await Promise.all(
            rawItems.map(async (it: any) => {
              if (it.slotId) {
                const s = await storage.getSlot(it.slotId);
                return {
                  ...it,
                  slot: s ? { id: s.id, mediaType: s.mediaType, pageType: s.pageType, position: s.position, dimensions: s.dimensions } : null,
                };
              }
              return it;
            })
          );
          const invoiceRows = await db.select().from(invoices).where(eq(invoices.workOrderId, wo.id));
          const proforma = invoiceRows.find((inv: any) => inv.invoiceType === "proforma");
          const workOrderWithProforma = {
            id: wo.id,
            clientId: wo.clientId,
            businessSchoolName: wo.businessSchoolName,
            contactName: wo.contactName,
            status: wo.status,
            paymentMode: wo.paymentMode,
            totalAmount: wo.totalAmount,
            gstPercent: wo.gstPercent,
            poUrl: wo.poUrl,
            poApproved: wo.poApproved,
            poApprovedAt: wo.poApprovedAt,
            negotiationRequested: wo.negotiationRequested,
            negotiationReason: wo.negotiationReason,
            negotiationRequestedAt: wo.negotiationRequestedAt,
            quotedById: wo.quotedById,
            createdById: wo.createdById,
            createdByName: wo.createdByName,
            createdOnDate: wo.createdOnDate,
            createdOnTime: wo.createdOnTime,
            createdAt: wo.createdAt,
            updatedAt: wo.updatedAt,
            proformaUrl: proforma?.fileUrl || null,
            proformaInvoiceId: proforma?.id || null,
            clientName: wo.clientName || wo.businessSchoolName || `Client #${wo.clientId}` || null,
          };
          return { workOrder: workOrderWithProforma, items };
        })
      );
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Expose addon prices to client UI
  app.get("/api/addon-prices", async (_req, res) => {
    const email = Number(process.env.ADDON_EMAIL_PRICE || 0);
    const whatsapp = Number(process.env.ADDON_WHATSAPP_PRICE || 0);
    res.json({ email, whatsapp });
  });

  app.patch("/api/addon-prices", async (req, res) => {
    try {
      const { email, whatsapp } = req.body as { email?: number; whatsapp?: number };
      if (email !== undefined) process.env.ADDON_EMAIL_PRICE = String(Number(email) || 0);
      if (whatsapp !== undefined) process.env.ADDON_WHATSAPP_PRICE = String(Number(whatsapp) || 0);
      res.json({
        email: Number(process.env.ADDON_EMAIL_PRICE || 0),
        whatsapp: Number(process.env.ADDON_WHATSAPP_PRICE || 0),
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/work-orders/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const workOrder = await storage.getWorkOrder(id);
    if (!workOrder) return res.status(404).json({ error: "Work Order not found" });
    const rawItems = await storage.getWorkOrderItems(id);
    const items = await Promise.all(
      rawItems.map(async (it: any) => {
        if (it.slotId) {
          const s = await storage.getSlot(it.slotId);
          return { ...it, slot: s ? { id: s.id, mediaType: s.mediaType, pageType: s.pageType, position: s.position, dimensions: s.dimensions } : null };
        }
        return it;
      })
    );
    // include release order id if exists
    const ros = await storage.getReleaseOrders();
    const ro = ros.find((r: any) => r.workOrderId === id);
    res.json({ workOrder, items, releaseOrderId: ro?.id || null, releaseOrderStatus: ro?.status || null });
  });

  app.patch("/api/work-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payload = req.body as Partial<{ totalAmount: string; paymentMode: string; status: string; quotedById: number; gstPercent: number; reason: string; actorId: number }>;
      // Determine previous state
      const before = await storage.getWorkOrder(id);
      const patchData: Record<string, unknown> = { ...payload };
      if (payload.status === "quoted") {
        patchData.negotiationRequested = false;
        patchData.negotiationReason = null;
        patchData.negotiationRequestedAt = null;
      }
      const updated = await storage.updateWorkOrder(id, patchData as any);
      if (!updated) return res.status(404).json({ error: "Work Order not found" });
      // Recalculate total to include latest items + GST (if provided/changed)
      await storage.recalcWorkOrderTotal(id);
      const after = await storage.getWorkOrder(id);
      // If status changed to quoted, notify client
      try {
        if (before?.status !== updated.status && updated.status === "quoted") {
          const [client] = await db.select().from(users).where(eq(users.id, updated.clientId));
          if (client) {
            await notificationService.createNotification({
              userId: client.id,
              type: "quote_ready",
              message: `Your Work Order #${updated.id} has been quoted. Please review.`,
            });
          }
          try {
            await storage.createActivityLog({
              actorId: (payload.quotedById ?? payload.actorId) as any,
              actorRole: "manager" as any,
              action: "work_order_quoted",
              entityType: "work_order",
              entityId: id,
              metadata: JSON.stringify({
                paymentMode: updated.paymentMode,
                gstPercent: payload.gstPercent ?? (updated as any)?.gstPercent ?? null,
                totalAmount: updated.totalAmount,
              }),
            });
          } catch {}
        } else if (before?.status !== updated.status && updated.status === "rejected") {
          // Notify client on rejection with optional reason
          const [client] = await db.select().from(users).where(eq(users.id, updated.clientId));
          if (client) {
            await notificationService.createNotification({
              userId: client.id,
              type: "work_order_rejected",
              message: `Your Work Order #${updated.id} was rejected${payload.reason ? `: ${payload.reason}` : "."}`,
            });
          }
          // Log activity
          await storage.createActivityLog({
            actorId: payload.actorId as any,
            actorRole: "manager" as any,
            action: "work_order_rejected",
            entityType: "work_order",
            entityId: id,
            metadata: payload.reason ? JSON.stringify({ reason: payload.reason }) : null as any,
          });
        }
      } catch {}
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update a work order item price (manager can edit addon prices)
  app.patch("/api/work-orders/:id/items/:itemId", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);
      const { unitPrice } = req.body as { unitPrice: string | number };
      const price = Number(unitPrice);
      if (isNaN(price) || price < 0) return res.status(400).json({ error: "Invalid price" });
      const item = await storage.updateWorkOrderItem(itemId, { unitPrice: String(price), subtotal: String(price) });
      await storage.recalcWorkOrderTotal(id);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Client accepts quote -> generate Release Order and Proforma
  app.post("/api/work-orders/:id/accept", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const wo = await storage.getWorkOrder(id);
      if (!wo) return res.status(404).json({ error: "Work Order not found" });

      // Enforce PO upload before acceptance
      if (!('poUrl' in wo) || !(wo as any).poUrl) {
        return res.status(400).json({ error: "Purchase Order (PO) must be uploaded before accepting the quote" });
      }

      // mark as client_accepted (if not already)
      if (wo.status !== "client_accepted") {
        await storage.updateWorkOrder(id, { status: "client_accepted" });
      }

      // Notify stakeholders that client accepted; Release Order will be generated after PO approval
      const items = await storage.getWorkOrderItems(id);
      try {
        const accountsUsers = await db.select().from(users).where(eq(users.role, "accounts"));
        for (const acc of accountsUsers) {
          await notificationService.createNotification({
            userId: acc.id,
            type: "client_accepted",
            message: `Client accepted quote for Work Order #${id}. Proceed to payment processing.${(wo as any).poUrl ? ` PO: /uploads/${(wo as any).poUrl}` : ''}`,
          });
        }
        const managers = await db.select().from(users).where(eq(users.role, "manager"));
        for (const m of managers) {
          await notificationService.createNotification({
            userId: m.id,
            type: "client_accepted",
            message: `Client accepted quote for Work Order #${id}.${(wo as any).poUrl ? ` PO: /uploads/${(wo as any).poUrl}` : ''}`,
          });
        }
        const vps = await db.select().from(users).where(eq(users.role, "vp"));
        for (const vp of vps) {
          await notificationService.createNotification({
            userId: vp.id,
            type: "client_accepted",
            message: `Client accepted quote for Work Order #${id}.${(wo as any).poUrl ? ` PO: /uploads/${(wo as any).poUrl}` : ''}`,
          });
        }
        const managersForReview = await db.select().from(users).where(eq(users.role, "manager"));
        for (const m of managersForReview) {
          await notificationService.createNotification({
            userId: m.id,
            type: "po_review_required",
            message: `Work Order #${id} has a new PO awaiting your approval.`,
          });
        }
      } catch {}

      try {
        await storage.createActivityLog({
          actorId: wo.clientId as any,
          actorRole: "client" as any,
          action: "work_order_client_accepted",
          entityType: "work_order",
          entityId: id,
          metadata: JSON.stringify({
            poUploaded: Boolean((wo as any).poUrl),
            items: items.length,
          }),
        });
      } catch {}

      res.json({ success: true, status: "client_accepted", items });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Client uploads Purchase Order (PO) for a Work Order
  app.post("/api/work-orders/:id/upload-po", upload.single("file"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const wo = await storage.getWorkOrder(id);
      if (!wo) return res.status(404).json({ error: "Work Order not found" });

      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      
      // Check file size (10 MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: `File size exceeds 10 MB limit. Current size: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB` });
      }
      
      // Check file format: JPG, PNG, GIF, HTML5, PDF
      const ALLOWED_MIME_TYPES = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "text/html",
        "application/xhtml+xml"
      ];
      const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".html", ".htm"];
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      
      // Validate file type: must match either MIME type or extension
      const isValidMimeType = ALLOWED_MIME_TYPES.includes(req.file.mimetype);
      const isValidExtension = allowedExtensions.includes(fileExt);
      
      if (!isValidMimeType && !isValidExtension) {
        return res.status(400).json({ error: "Invalid file type. Supported formats: JPG, PNG, GIF, HTML5, PDF" });
      }
      
      // Additional validation: ensure HTML files have proper extension
      if ((req.file.mimetype === "text/html" || req.file.mimetype === "application/xhtml+xml") && 
          !fileExt.match(/\.(html|htm)$/i)) {
        return res.status(400).json({ error: "HTML files must have .html or .htm extension" });
      }

      const ext = path.extname(req.file.originalname) || (req.file.mimetype === 'application/pdf' ? '.pdf' : '');
      const fileName = `po-${id}-${Date.now()}${ext}`;
      // Local-only storage
      try {
        const uploadDir = path.resolve(process.cwd(), "server", "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
      } catch (fsError: any) {
        return res.status(500).json({ error: "Failed to store PO file", details: fsError.message });
      }

      // Persist on the work order
      await storage.updateWorkOrder(id, { poUrl: fileName } as any);

      // Notify managers that PO was uploaded
      try {
        const managers = await db.select().from(users).where(eq(users.role, "manager"));
        for (const m of managers) {
          await notificationService.createNotification({
            userId: m.id,
            type: "po_uploaded",
            message: `PO uploaded for Work Order #${id}.`,
          });
        }
        // Notify accounts as well for dashboard visibility/action
        const accountsUsers = await db.select().from(users).where(eq(users.role, "accounts"));
        for (const acc of accountsUsers) {
          await notificationService.createNotification({
            userId: acc.id,
            type: "po_uploaded",
            message: `PO uploaded for Work Order #${id}.`,
          });
        }
      } catch {}

      res.json({ poUrl: fileName });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Manager approves PO -> notify Accounts and create Proforma
  app.post("/api/work-orders/:id/approve-po", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { actorId } = (req.body ?? {}) as { actorId?: number };
      const wo = await storage.getWorkOrder(id);
      if (!wo) return res.status(404).json({ error: "Work Order not found" });
      if (!(wo as any).poUrl) return res.status(400).json({ error: "No PO uploaded for this Work Order" });

      // Update PO approval status
      await storage.updateWorkOrder(id, { 
        poApproved: true,
        poApprovedAt: new Date(),
        status: wo.status !== "client_accepted" ? "client_accepted" : wo.status
      } as any);

      // Notify accounts
      const accountsUsers = await db.select().from(users).where(eq(users.role, "accounts"));
      for (const acc of accountsUsers) {
        await notificationService.createNotification({
          userId: acc.id,
          type: "po_approved",
          message: `PO approved for Work Order #${id}. Generate payment request.`,
        });
      }

      // Create Release Order if absent
      const existingRos = await storage.getReleaseOrders();
      let ro = existingRos.find((r: any) => r.workOrderId === id);
      if (!ro) {
        const roNumber = `RO-${id}-${Date.now()}`;
        ro = await storage.createReleaseOrder({
          workOrderId: id,
          roNumber,
          status: "pending_banner_upload" as any,
          createdById: (wo as any).quotedById,
          paymentStatus: "pending" as any,
        } as any);

        const items = await storage.getWorkOrderItems(id);
        await storage.addReleaseOrderItems(
          items.map((it) => ({ releaseOrderId: ro.id, workOrderItemId: it.id }))
        );
      } else if ((ro as any).status === "issued") {
        await db.update(releaseOrders)
          .set({ status: "pending_banner_upload" as any })
          .where(eq(releaseOrders.id, ro.id));
        ro = { ...ro, status: "pending_banner_upload" };
      }

      const existingInvoices = await db.select().from(invoices).where(eq(invoices.workOrderId, id));
      const proformaInvoice = existingInvoices.find((i: any) => i.invoiceType === "proforma");

      try {
        await storage.createActivityLog({
          actorId: actorId as any,
          actorRole: "manager" as any,
          action: "po_approved",
          entityType: "work_order",
          entityId: id,
          metadata: JSON.stringify({
            releaseOrderId: (ro as any)?.id ?? null,
            proformaInvoiceId: (proformaInvoice as any)?.id ?? null,
          }),
        });
      } catch {}

      res.json({ success: true, releaseOrder: ro, proforma: proformaInvoice ?? null });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Client uploads banner for a specific work order item
  app.post("/api/work-orders/:id/items/:itemId/upload-banner", upload.single("file"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemId = parseInt(req.params.itemId);
      const wo = await storage.getWorkOrder(id);
      if (!wo) return res.status(404).json({ error: "Work Order not found" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      // Validate file size (below 500KB)
      const maxSize = 500 * 1024; // 500KB
      const fileSize = req.file.size;

      if (fileSize > maxSize) {
        return res.status(400).json({ 
          error: `Banner size must be below 500KB. Current size: ${(fileSize / 1024).toFixed(2)}KB` 
        });
      }

      const ext = path.extname(req.file.originalname) || '.png';
      const fileName = `banner-${itemId}-${Date.now()}${ext}`;
      try {
        const uploadDir = path.resolve(process.cwd(), "server", "uploads");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
      } catch (fsError: any) {
        return res.status(500).json({ error: "Failed to store banner", details: fsError.message });
      }

      // Update work order item with banner URL
      await storage.updateWorkOrderItem(itemId, { bannerUrl: `/uploads/${fileName}` } as any);
      
      // Find the booking associated with this work order item
      const item = await storage.getWorkOrderItems(id).then(items => items.find(i => i.id === itemId));
      if (item && item.slotId) {
        // Find booking for this work order and slot
        const allBookings = await db.select().from(bookings).where(eq(bookings.workOrderId, id));
        const booking = allBookings.find(b => {
          // Try to match by slotId - we need to check if booking slot matches item slot
          return b.slotId === item.slotId;
        });
        
        if (booking) {
          try {
            // Get existing banners for this booking to determine next version
            const existingBanners = await storage.getBannersByBooking(booking.id);
            const nextVersion = existingBanners.length > 0 
              ? Math.max(...existingBanners.map(b => b.version)) + 1 
              : 1;
            
            // Get user ID from request (client uploading)
            const { user } = req as any;
            const uploadedById = user?.id || wo.clientId;
            
            console.log(`[POST /api/work-orders/:id/items/:itemId/upload-banner] Creating banner for booking ${booking.id}, version ${nextVersion}`);
            
            // Create banner record in database
            const banner = await db.transaction(async (tx) => {
              // Mark current banner as not current
              const currentBannerResult = await tx.select().from(banners)
                .where(and(eq(banners.bookingId, booking.id), eq(banners.isCurrent, true)));
              const currentBanner = currentBannerResult[0];
              
              if (currentBanner) {
                await tx.update(banners).set({ isCurrent: false }).where(eq(banners.id, currentBanner.id));
              }
              
              // Create new banner
              const [newBanner] = await tx.insert(banners).values({
                bookingId: booking.id,
                fileUrl: `/uploads/${fileName}`,
                version: nextVersion,
                uploadedById: uploadedById,
                status: "pending",
                isCurrent: true,
              }).returning();
              
              // Create version history
              console.log(`[POST /api/work-orders/:id/items/:itemId/upload-banner] Creating version history for banner ${newBanner.id}`);
              await tx.insert(versionHistory).values({
                bannerId: newBanner.id,
                version: nextVersion,
                fileUrl: `/uploads/${fileName}`,
                editedById: uploadedById,
                comments: null,
              });
              console.log(`[POST /api/work-orders/:id/items/:itemId/upload-banner] Version history created for banner ${newBanner.id}`);
              
              return newBanner;
            });
            
            console.log(`[POST /api/work-orders/:id/items/:itemId/upload-banner] Banner ${banner.id} created successfully for booking ${booking.id}`);
          } catch (bannerError: any) {
            console.error(`[POST /api/work-orders/:id/items/:itemId/upload-banner] Error creating banner record:`, bannerError);
            console.error(`[POST /api/work-orders/:id/items/:itemId/upload-banner] Error message:`, bannerError.message);
            console.error(`[POST /api/work-orders/:id/items/:itemId/upload-banner] Error stack:`, bannerError.stack);
            // Don't fail the upload if banner record creation fails
          }
        } else {
          console.warn(`[POST /api/work-orders/:id/items/:itemId/upload-banner] No booking found for work order ${id} with slot ${item.slotId}`);
        }
      }
      
      res.json({ url: `/uploads/${fileName}` });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Client submits banners (notify managers)
  app.post("/api/work-orders/:id/submit-banners", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const wo = await storage.getWorkOrder(id);
      if (!wo) return res.status(404).json({ error: "Work Order not found" });
      
      // Validate that all banners are uploaded
      const items = await storage.getWorkOrderItems(id);
      const itemsWithoutAddons = items.filter((it: any) => !it.addonType);
      const itemsWithoutBanners = itemsWithoutAddons.filter((it: any) => !it.bannerUrl);
      
      if (itemsWithoutBanners.length > 0) {
        return res.status(400).json({ 
          error: `Please upload banners for all slots before submitting. ${itemsWithoutBanners.length} slot(s) still missing banners.` 
        });
      }
      
      const releaseOrdersForWo = await storage.getReleaseOrders();
      const ro = releaseOrdersForWo.find((r: any) => r.workOrderId === id);
      if (ro && ["pending_banner_upload", "pending_manager_review"].includes(String(ro.status))) {
        await db.update(releaseOrders)
          .set({
            status: "pending_manager_review" as any,
            rejectionReason: null,
            rejectedById: null,
            rejectedAt: null,
          })
          .where(eq(releaseOrders.id, ro.id));
      }
      const managers = await db.select().from(users).where(eq(users.role, "manager"));
      for (const m of managers) {
        await notificationService.createNotification({
          userId: m.id,
          type: "banners_submitted",
          message: `Client submitted banners for Work Order #${id}.`,
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Manager approves Release Order (notify VP)
  app.post("/api/release-orders/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { actorId } = (req.body ?? {}) as { actorId?: number; comments?: string };
      const ro = await storage.getReleaseOrder(id);
      if (!ro) return res.status(404).json({ error: "Release Order not found" });
      const wo = await storage.getWorkOrder(ro.workOrderId);
      const client = wo ? await storage.getUser(wo.clientId) : undefined;

      let nextStatus: "pending_vp_review" | "pending_pv_review" | "accepted" | null = null;
      if (ro.status === "pending_manager_review") {
        nextStatus = "pending_vp_review";
      } else if (ro.status === "pending_vp_review") {
        nextStatus = "pending_pv_review";
      } else if (ro.status === "pending_pv_review") {
        nextStatus = "accepted";
      }

      if (!nextStatus) {
        return res.status(400).json({ error: "Release Order is not awaiting approval at this stage." });
      }

      const previousStatus = ro.status;
      const updatePayload: Record<string, any> = { status: nextStatus as any };
      if (ro.rejectionReason || ro.rejectedById || ro.rejectedAt) {
        updatePayload.rejectionReason = null;
        updatePayload.rejectedById = null;
        updatePayload.rejectedAt = null;
      }
      await db.update(releaseOrders).set(updatePayload).where(eq(releaseOrders.id, id));

      if (nextStatus === "pending_vp_review") {
        const vps = await db.select().from(users).where(eq(users.role, "vp"));
        for (const vp of vps) {
          await notificationService.createNotification({
            userId: vp.id,
            type: "ro_approved",
            message: `Release Order #${id} for ${client?.name ?? `WO ${ro.workOrderId}`} is ready for your approval.`,
          });
        }
      } else if (nextStatus === "pending_pv_review") {
        const pvs = await db.select().from(users).where(eq(users.role, "pv_sir"));
        const approvalUrl = `${process.env.APP_URL || 'http://localhost:5173'}/`; // PV dashboard route
        for (const pv of pvs) {
          await notificationService.createNotification({
            userId: pv.id,
            type: "ro_approved",
            message: `Release Order #${id} for ${client?.name ?? `WO ${ro.workOrderId}`} awaits your approval.`,
          });
          if (pv.email) {
            await emailService.sendReleaseOrderApprovalEmail(
              pv.email,
              pv.name || "PV Sir",
              id,
              ro.workOrderId,
              approvalUrl
            );
          }
        }
      } else if (nextStatus === "accepted") {
        const notifyRoles = ["manager", "vp", "pv_sir", "accounts", "it"] as const;
        for (const role of notifyRoles) {
          const recipients = await db.select().from(users).where(eq(users.role, role));
          for (const recipient of recipients) {
            await notificationService.createNotification({
              userId: recipient.id,
              type: "ro_accepted",
              message: `Release Order #${id} for ${client?.name ?? `WO ${ro.workOrderId}`} has been accepted.`,
            });
          }
        }
      }

      try {
        const actorRole =
          previousStatus === "pending_manager_review"
            ? "manager"
            : previousStatus === "pending_vp_review"
            ? "vp"
            : previousStatus === "pending_pv_review"
            ? "pv_sir"
            : null;
        await storage.createActivityLog({
          actorId: actorId as any,
          actorRole: actorRole as any,
          action: "release_order_stage_update",
          entityType: "release_order",
          entityId: id,
          metadata: JSON.stringify({
            previousStatus,
            nextStatus,
          }),
        });
      } catch {}

      res.json({ success: true, status: nextStatus });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/release-orders/:id/reject", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { actorId, reason } = (req.body ?? {}) as { actorId?: number; reason?: string };
      const ro = await storage.getReleaseOrder(id);
      if (!ro) return res.status(404).json({ error: "Release Order not found" });

      const currentStatus = String(ro.status);
      console.log(`[REJECT DEBUG] RO #${id} current status: "${currentStatus}"`);
      
      if (currentStatus !== "pending_vp_review" && currentStatus !== "pending_pv_review") {
        console.log(`[REJECT DEBUG] Invalid status: ${currentStatus}`);
        return res.status(400).json({ error: "Release Order is not awaiting VP/PV review." });
      }

      const trimmedReason = (reason ?? "").trim();
      const now = new Date();

      // Determine the actor role and next status based on current status
      let actorRole: "vp" | "pv_sir";
      let nextStatus: "pending_vp_review" | "pending_manager_review";
      let notifyRole: "vp" | "manager";
      
      if (currentStatus === "pending_pv_review") {
        // PV Sir is rejecting - send to VP first (not directly to manager)
        actorRole = "pv_sir";
        nextStatus = "pending_vp_review";
        notifyRole = "vp";
        console.log(`[REJECT] PV Sir rejecting RO #${id}: sending to VP (pending_vp_review)`);
      } else if (currentStatus === "pending_vp_review") {
        // VP is rejecting - send to manager
        actorRole = "vp";
        nextStatus = "pending_manager_review";
        notifyRole = "manager";
        console.log(`[REJECT] VP rejecting RO #${id}: sending to Manager (pending_manager_review)`);
      } else {
        console.log(`[REJECT ERROR] Unexpected status: ${currentStatus}`);
        return res.status(400).json({ error: "Invalid status for rejection." });
      }

      console.log(`[REJECT DEBUG] Updating RO #${id} to status: "${nextStatus}", notifying: ${notifyRole}`);
      
      const updateResult = await db
        .update(releaseOrders)
        .set({
          status: nextStatus as any,
          rejectionReason: trimmedReason || null,
          rejectedById: actorId as any,
          rejectedAt: now as any,
        })
        .where(eq(releaseOrders.id, id))
        .returning();
      
      console.log(`[REJECT DEBUG] Update result:`, updateResult.length > 0 ? `Status updated to: ${updateResult[0].status}` : 'No rows updated');

      // Verify the update was successful
      const updatedRo = await storage.getReleaseOrder(id);
      if (updatedRo) {
        console.log(`[REJECT DEBUG] Verified RO #${id} status after update: "${String(updatedRo.status)}"`);
      }

      try {
        await storage.createActivityLog({
          actorId: actorId as any,
          actorRole: actorRole as any,
          action: "release_order_rejected",
          entityType: "release_order",
          entityId: id,
          metadata: JSON.stringify({
            previousStatus: ro.status,
            reason: trimmedReason || null,
          }),
        });
      } catch {}

      if (notifyRole === "vp") {
        const vps = await db.select().from(users).where(eq(users.role, "vp"));
        console.log(`[REJECT DEBUG] Notifying ${vps.length} VP(s) about rejection`);
        for (const vp of vps) {
          await notificationService.createNotification({
            userId: vp.id,
            type: "ro_rejected",
            message: `Release Order #${id} was rejected by PV Sir for revisions${trimmedReason ? `: ${trimmedReason}` : ""}.`,
          });
        }
      } else {
        const managers = await db.select().from(users).where(eq(users.role, "manager"));
        console.log(`[REJECT DEBUG] Notifying ${managers.length} manager(s) about rejection`);
        for (const manager of managers) {
          await notificationService.createNotification({
            userId: manager.id,
            type: "ro_rejected",
            message: `Release Order #${id} was rejected for revisions${trimmedReason ? `: ${trimmedReason}` : ""}.`,
          });
        }
      }

      res.json({ success: true, newStatus: nextStatus, notifiedRole: notifyRole });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/release-orders/:id/return-to-client", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { actorId, reason } = (req.body ?? {}) as { actorId?: number; reason?: string };
      const ro = await storage.getReleaseOrder(id);
      if (!ro) return res.status(404).json({ error: "Release Order not found" });
      if (ro.status !== "pending_manager_review") {
        return res.status(400).json({ error: "Release Order must be in manager review before returning to client." });
      }

      const trimmedReason = (reason ?? "").trim();
      const now = new Date();

      await db
        .update(releaseOrders)
        .set({
          status: "pending_banner_upload" as any,
          rejectionReason: trimmedReason || ro.rejectionReason || null,
          rejectedById: actorId as any,
          rejectedAt: now as any,
        })
        .where(eq(releaseOrders.id, id));

      const wo = await storage.getWorkOrder(ro.workOrderId);
      if (wo) {
        await notificationService.createNotification({
          userId: wo.clientId,
          type: "ro_rejected",
          message: `Release Order #${id} requires updates${trimmedReason ? `: ${trimmedReason}` : ""}`,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Client requests negotiation on a quoted Work Order
  app.post("/api/work-orders/:id/negotiate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const wo = await storage.getWorkOrder(id);
      if (!wo) return res.status(404).json({ error: "Work Order not found" });

      const { reason } = req.body as { reason?: string };
      const trimmedReason = (reason || "").trim();
      if (!trimmedReason) {
        return res.status(400).json({ error: "Negotiation reason is required" });
      }

      await storage.updateWorkOrder(id, {
        negotiationRequested: true as any,
        negotiationReason: trimmedReason as any,
        negotiationRequestedAt: new Date() as any,
      });

      const managers = await db.select().from(users).where(eq(users.role, "manager"));
      for (const m of managers) {
        await notificationService.createNotification({
          userId: m.id,
          type: "negotiate_request",
          message: `Client requested negotiation on Work Order #${id}: ${trimmedReason}`,
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Release Orders
  app.get("/api/release-orders", async (req, res) => {
    try {
      const { status, rejectedById } = req.query as { status?: string; rejectedById?: string };
      let ros = await storage.getReleaseOrders();
      if (status) {
        ros = ros.filter((r: any) => String(r.status) === status);
      }
      if (rejectedById) {
        const rejectedByIdNum = parseInt(rejectedById);
        ros = ros.filter((r: any) => r.rejectedById === rejectedByIdNum && r.rejectionReason);
      }
      const result = await Promise.all(
        ros.map(async (ro: any) => {
          const rawItems = await db.select().from(workOrderItems)
            .where(eq(workOrderItems.workOrderId, ro.workOrderId));
          const items = await Promise.all(
            rawItems.map(async (it: any) => {
              if (it.slotId) {
                const s = await storage.getSlot(it.slotId);
                return { ...it, slot: s ? { id: s.id, mediaType: s.mediaType, pageType: s.pageType, position: s.position, dimensions: s.dimensions } : null };
              }
              return it;
            })
          );
          const workOrder = await storage.getWorkOrder(ro.workOrderId);
          const client = workOrder ? await storage.getUser(workOrder.clientId) : undefined;
          const createdBy = (ro as any).createdById ? await storage.getUser((ro as any).createdById) : undefined;
          return { releaseOrder: ro, items, workOrder, client, createdBy };
        })
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/release-orders/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const ro = await storage.getReleaseOrder(id);
    if (!ro) return res.status(404).json({ error: "Release Order not found" });
    const rawItems = await db.select().from(workOrderItems)
      .where(eq(workOrderItems.workOrderId, ro.workOrderId));
    const items = await Promise.all(
      rawItems.map(async (it: any) => {
        if (it.slotId) {
          const s = await storage.getSlot(it.slotId);
          return { ...it, slot: s ? { id: s.id, mediaType: s.mediaType, pageType: s.pageType, position: s.position, dimensions: s.dimensions } : null };
        }
        return it;
      })
    );
    const workOrder = await storage.getWorkOrder(ro.workOrderId);
    const client = workOrder ? await storage.getUser(workOrder.clientId) : undefined;
    const createdBy = (ro as any).createdById ? await storage.getUser((ro as any).createdById) : undefined;
    res.json({ releaseOrder: ro, items, workOrder, client, createdBy });
  });

  app.post("/api/payments/settle/:bookingId", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const { amount, paymentMethod } = req.body;
      
      const payment = await storage.createPayment({
        bookingId,
        amount,
        paymentMethod,
        status: "completed",
        paymentDate: new Date(),
      });
      
      // Update booking status and create IT deployment approval
      const booking = await storage.getBooking(bookingId);
      if (booking && booking.status === "pending_payment") {
        await storage.updateBooking(bookingId, { status: "pending_deployment" });
        
        // Update accounts approval to approved
        const approvals = await storage.getApprovalsByBooking(bookingId);
        const accountsApproval = approvals.find(a => a.role === "accounts" && a.status === "pending");
        if (accountsApproval) {
          await storage.updateApproval(accountsApproval.id, { 
            status: "approved",
            approvedAt: new Date()
          });
        }
        
        // Create IT deployment approval
        await storage.createApproval({
          bookingId,
          role: "it",
          status: "pending",
          approverId: null,
        });
      }
      
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Invoices by Work Order
  app.get("/api/invoices/work-order/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rows = await db.select().from(invoices).where(eq(invoices.workOrderId, id));
      res.json(rows);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/invoices", async (_req, res) => {
    try {
      const rows = await db.select().from(invoices);
      res.json(rows);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Pay invoice (mock settle)
  app.post("/api/invoices/:id/pay", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invs = await db.select().from(invoices).where(eq(invoices.id, id));
      const inv = invs[0];
      if (!inv) return res.status(404).json({ error: "Invoice not found" });
      
      console.log(`[POST /api/invoices/${id}/pay] Paying invoice:`, {
        invoiceId: inv.id,
        amount: inv.amount,
        bookingId: inv.bookingId,
        workOrderId: inv.workOrderId,
      });
      
      await db.update(invoices).set({ status: "completed" as any }).where(eq(invoices.id, id));
      
      // Create payment record(s) in payments table
      if (inv.bookingId) {
        // Invoice is linked directly to a booking
        try {
          console.log(`[POST /api/invoices/${id}/pay] Creating payment for booking ${inv.bookingId}`);
          await storage.createPayment({
            bookingId: inv.bookingId,
            amount: String(inv.amount),
            paymentDate: new Date(),
            status: "completed" as any,
            paymentMethod: "invoice" as any,
          });
          console.log(`[POST /api/invoices/${id}/pay] Payment created for booking ${inv.bookingId}`);
        } catch (paymentError: any) {
          console.error(`[POST /api/invoices/${id}/pay] Error creating payment for booking:`, paymentError);
        }
      } else if (inv.workOrderId) {
        // Invoice is linked to a work order - create payments for all bookings in that work order
        try {
          const wo = await storage.getWorkOrder(inv.workOrderId);
          if (wo) {
            // Get all bookings for this work order
            const allBookings = await db.select().from(bookings).where(eq(bookings.workOrderId, wo.id));
            console.log(`[POST /api/invoices/${id}/pay] Found ${allBookings.length} bookings for work order ${wo.id}`);
            
            // Distribute invoice amount across bookings (proportional to booking amounts)
            const totalBookingAmount = allBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
            
            for (const booking of allBookings) {
              if (totalBookingAmount > 0) {
                // Calculate proportional payment amount
                const bookingProportion = Number(booking.totalAmount) / totalBookingAmount;
                const paymentAmount = Number(inv.amount) * bookingProportion;
                
                console.log(`[POST /api/invoices/${id}/pay] Creating payment for booking ${booking.id}: amount=${paymentAmount}`);
                await storage.createPayment({
                  bookingId: booking.id,
                  amount: String(paymentAmount),
                  paymentDate: new Date(),
                  status: "completed" as any,
                  paymentMethod: "invoice" as any,
                });
                console.log(`[POST /api/invoices/${id}/pay] Payment created for booking ${booking.id}`);
              } else {
                // If total is 0, split equally
                const paymentAmount = Number(inv.amount) / allBookings.length;
                console.log(`[POST /api/invoices/${id}/pay] Creating equal payment for booking ${booking.id}: amount=${paymentAmount}`);
                await storage.createPayment({
                  bookingId: booking.id,
                  amount: String(paymentAmount),
                  paymentDate: new Date(),
                  status: "completed" as any,
                  paymentMethod: "invoice" as any,
                });
              }
            }
          }
        } catch (paymentError: any) {
          console.error(`[POST /api/invoices/${id}/pay] Error creating payments for work order:`, paymentError);
        }
        
        // After payment rules
        const wo = await storage.getWorkOrder(inv.workOrderId);
        if (wo) {
          const existingRos = await storage.getReleaseOrders();
          const targetRo = existingRos.find((r: any) => r.workOrderId === wo.id);
          if (targetRo) {
            await db.update(releaseOrders)
              .set({ paymentStatus: "completed" as any })
              .where(eq(releaseOrders.id, targetRo.id));
          }
          await storage.updateWorkOrder(wo.id, { status: "paid" } as any);
        }
      }
      
      res.json({ success: true });
    } catch (e: any) {
      const invoiceId = parseInt(req.params.id);
      console.error(`[POST /api/invoices/${invoiceId}/pay] Error:`, e);
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      // If invoice has an uploaded file, serve it directly instead of generating
      if (invoice.fileUrl) {
        const fileUrl = invoice.fileUrl as string;
        let filePath: string;
        
        if (fileUrl.startsWith('/uploads/')) {
          // File stored in server/uploads directory
          filePath = path.resolve(process.cwd(), "server", "uploads", path.basename(fileUrl));
        } else {
          // Direct file path
          filePath = path.resolve(process.cwd(), "server", "uploads", fileUrl);
        }
        
        if (fs.existsSync(filePath)) {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", `attachment; filename=proforma-invoice-${invoice.id}.pdf`);
          return res.sendFile(filePath);
        }
      }

      const workOrder = invoice.workOrderId ? await storage.getWorkOrder(invoice.workOrderId) : undefined;
      const rawItems = invoice.workOrderId ? await storage.getWorkOrderItems(invoice.workOrderId) : [];
      const client = workOrder ? await storage.getUser(workOrder.clientId) : undefined;

      const items = await Promise.all(
        rawItems.map(async (item: any) => {
          const slot = item.slotId ? await storage.getSlot(item.slotId) : null;
          return { ...item, slot };
        })
      );

      const toNumber = (value: any) => Number(value ?? 0);

      const earliestStartDate = items
        .map((it) => (it.startDate ? new Date(it.startDate as any) : null))
        .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      const earliestStart = earliestStartDate ? earliestStartDate.toISOString() : null;

      const describeSlot = (item: any) => {
        if (item.addonType) {
          return item.addonType === "email" ? "Email Campaign" : "WhatsApp Campaign";
        }
        if (item.slot) {
          const elements: string[] = [];
          if (item.slot.mediaType) elements.push(String(item.slot.mediaType).replace(/_/g, " ").replace(/\b\w/g, (m: string) => m.toUpperCase()));
          if (item.slot.pageType) elements.push(String(item.slot.pageType).replace(/_/g, " ").replace(/\b\w/g, (m: string) => m.toUpperCase()));
          if (item.slot.position) elements.push(String(item.slot.position).replace(/_/g, " ").replace(/\b\w/g, (m: string) => m.toUpperCase()));
          if (item.slot.dimensions) elements.push(item.slot.dimensions);
          return elements.join(" • ") || `Slot ${item.slotId}`;
        }
        return `Item ${item.id}`;
      };

      const invoiceLines: Array<{ sno: string; description: string; hsn?: string; amount: number; isNote?: boolean }> = [];
      let lineCounter = 1;
      let subtotal = 0;

      items.forEach((item: any) => {
        const amount = toNumber(item.subtotal ?? item.unitPrice);
        const descriptionParts = [describeSlot(item)];
        const range = formatDateRange(item.startDate, item.endDate);
        if (range) descriptionParts.push(`(${range})`);
        invoiceLines.push({
          sno: String(lineCounter++),
          description: descriptionParts.join("\n"),
          hsn: DEFAULT_HSN,
          amount,
        });
        subtotal += amount;
      });

      let paymentNote = "";
      if (workOrder?.paymentMode === "installment") {
        paymentNote = earliestStart
          ? `Payment 50% in advance & balance 50% before ${formatSingleDate(earliestStart)}`
          : "Payment 50% in advance & balance 50% before campaign start";
      } else if (workOrder?.paymentMode === "full") {
        paymentNote = earliestStart
          ? `Payment 100% in advance before ${formatSingleDate(earliestStart)}`
          : "Payment 100% in advance before campaign start";
      } else if (workOrder?.paymentMode === "pay_later") {
        paymentNote = earliestStart
          ? `Payment to be completed before ${formatSingleDate(earliestStart)}`
          : "Payment to be completed before campaign start";
      }
      if (paymentNote) {
        invoiceLines.push({
          sno: "*",
          description: paymentNote,
          hsn: "",
          amount: 0,
          isNote: true,
        });
      }

      const generatedAt = invoice.generatedAt ? new Date(invoice.generatedAt as any) : new Date();
      const fiscalYearStart = generatedAt.getMonth() >= 3 ? generatedAt.getFullYear() : generatedAt.getFullYear() - 1;
      const fiscalYearEnd = (fiscalYearStart + 1).toString().slice(-2);
      const invoiceNumber = `PI/${String(fiscalYearStart).slice(-2)}-${fiscalYearEnd}/${invoice.id.toString().padStart(3, "0")}`;
      const invoiceDate = generatedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

      const gstPercent = Number(workOrder?.gstPercent ?? 0);
      const storedTotal = toNumber(invoice.amount);
      const calculatedGst = Math.round((subtotal * gstPercent) / 100);
      const total = storedTotal > 0 ? storedTotal : subtotal + calculatedGst;
      const effectiveGst = Math.max(0, Math.round(total - subtotal));
      const taxLines = effectiveGst > 0 ? [{ label: gstPercent ? `IGST ${gstPercent}%` : "Tax", amount: effectiveGst }] : [];
      const amountInWords = numberToIndianWords(Math.round(total));

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=proforma-invoice-${invoice.id}.pdf`);

      const doc = new PDFDocument({ size: "A4", margin: 36 });
      doc.pipe(res);

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const width = right - left;
      const columnRight = left + width * 0.55;

      doc.font("Helvetica-Bold").fontSize(12).text(SERVICE_PROVIDER.brandLine1, columnRight, doc.page.margins.top - 12, {
        width: width * 0.45,
        align: "right",
      });
      doc.font("Helvetica").fontSize(8).text(SERVICE_PROVIDER.brandLine2, columnRight, doc.y, {
        width: width * 0.45,
        align: "right",
      });

      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(16).text("PROFORMA INVOICE", left, doc.y, { align: "center" });
      doc.moveDown(0.5);

      const infoTop = doc.y + 10;

      doc.font("Helvetica-Bold").fontSize(9).text("Proforma Invoice No:", columnRight, infoTop, { width: width * 0.45 });
      doc.font("Helvetica").fontSize(9).text(invoiceNumber, columnRight + 110, infoTop, { width: width * 0.35 });
      doc.font("Helvetica-Bold").fontSize(9).text("Dated:", columnRight, doc.y + 2, { width: width * 0.45 });
      doc.font("Helvetica").fontSize(9).text(invoiceDate, columnRight + 110, doc.y, { width: width * 0.35 });

      doc.y = infoTop;
      doc.font("Helvetica-Bold").fontSize(10).text("Service Provider :", left, doc.y, { width: width * 0.45 });
      doc.font("Helvetica").fontSize(10).text(SERVICE_PROVIDER.name, left + 120, doc.y, { width: width * 0.4 });
      SERVICE_PROVIDER.addressLines.forEach((line) => {
        doc.text(line, left + 120, doc.y, { width: width * 0.4 });
      });
      doc.text(SERVICE_PROVIDER.gst, left + 120, doc.y, { width: width * 0.4 });
      const providerBottom = doc.y;

      doc.y = infoTop;
      doc.font("Helvetica-Bold").fontSize(10).text("Service Receiver :", columnRight, doc.y, { width: width * 0.45 });
      const receiverName =
        workOrder?.businessSchoolName ||
        client?.businessSchoolName ||
        client?.name ||
        "Client";
      doc.font("Helvetica").fontSize(10).text(receiverName, columnRight + 120, doc.y, { width: width * 0.35 });
      if (client?.schoolAddress) {
        doc.text(client.schoolAddress, columnRight + 120, doc.y, { width: width * 0.35 });
      }
      if (client?.gstNumber) {
        doc.text(`GSTN: ${client.gstNumber}`, columnRight + 120, doc.y, { width: width * 0.35 });
      }
      const receiverBottom = doc.y;

      doc.y = Math.max(providerBottom, receiverBottom) + 18;

      const tableTop = doc.y;
      const tableWidth = width;
      const snoWidth = 40;
      const hsnWidth = 90;
      const amountWidth = 110;
      const particularsWidth = tableWidth - snoWidth - hsnWidth - amountWidth;
      const snoX = left;
      const particularsX = snoX + snoWidth;
      const hsnX = particularsX + particularsWidth;
      const amountX = hsnX + hsnWidth;

      const headerHeight = 24;
      doc.lineWidth(0.7);
      doc.rect(left, tableTop, tableWidth, headerHeight).stroke();
      doc.font("Helvetica-Bold").fontSize(9).text("S.No.", snoX + 5, tableTop + 7, { width: snoWidth - 10 });
      doc.text("Particulars", particularsX + 5, tableTop + 7, { width: particularsWidth - 10 });
      doc.text("HSN/SAC", hsnX + 5, tableTop + 7, { width: hsnWidth - 10 });
      doc.text("Amount (Rs)", amountX, tableTop + 7, { width: amountWidth - 10, align: "right" });

      let currentY = tableTop + headerHeight;
      invoiceLines.forEach((line) => {
        const rowHeight = Math.max(
          24,
          doc.heightOfString(line.description, {
            width: particularsWidth - 10,
          }) + 12
        );
        doc.rect(left, currentY, tableWidth, rowHeight).stroke();
        doc.font(line.isNote ? "Helvetica-Bold" : "Helvetica").fontSize(9).text(line.sno, snoX + 5, currentY + 6, {
          width: snoWidth - 10,
        });
        doc.font(line.isNote ? "Helvetica-Bold" : "Helvetica").text(line.description, particularsX + 5, currentY + 6, {
          width: particularsWidth - 10,
        });
        doc.font("Helvetica").text(line.hsn ?? "", hsnX + 5, currentY + 6, { width: hsnWidth - 10 });
        doc.font(line.isNote ? "Helvetica-Bold" : "Helvetica").text(
          line.amount && !line.isNote ? formatCurrencyINR(line.amount) : "",
          amountX,
          currentY + 6,
          { width: amountWidth - 10, align: "right" }
        );
        currentY += rowHeight;
      });

      const summaryTop = currentY + 10;
      doc.font("Helvetica-Bold").fontSize(9).text("Amount Chargeable (in words)", left, summaryTop, { width: 200 });
      doc.font("Helvetica").fontSize(9).text(`Rupees ${amountInWords} ONLY`, left + 180, summaryTop, {
        width: width - 200,
      });

      const summaryBoxX = hsnX;
      const summaryBoxWidth = tableWidth - (summaryBoxX - left);
      const summaryRows = [
        { label: "Amount", value: subtotal, bold: false },
        ...taxLines.map((tax) => ({ label: tax.label, value: tax.amount, bold: false })),
        { label: "Total", value: total, bold: true },
      ];

      let summaryY = summaryTop - 6;
      const summaryRowHeight = 18;
      const summaryBoxHeight = summaryRows.length * summaryRowHeight + 12;
      doc.rect(summaryBoxX, summaryY, summaryBoxWidth, summaryBoxHeight).stroke();
      summaryY += 8;
      summaryRows.forEach((row) => {
        doc.font(row.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).text(row.label, summaryBoxX + 6, summaryY, {
          width: summaryBoxWidth - amountWidth,
        });
        doc.font(row.bold ? "Helvetica-Bold" : "Helvetica").text(formatCurrencyINR(row.value), summaryBoxX + summaryBoxWidth - amountWidth, summaryY, {
          width: amountWidth - 12,
          align: "right",
        });
        summaryY += summaryRowHeight;
      });
      doc.font("Helvetica").fontSize(8).text("E. & O. E", summaryBoxX + 6, summaryY - 4);

      const bankBoxTop = Math.max(summaryTop + 60, summaryY + 20);
      const bankBoxHeight = 90;
      doc.rect(left, bankBoxTop, width, bankBoxHeight).stroke();
      doc.font("Helvetica-Bold").fontSize(9).text("BANK DETAILS:", left + 8, bankBoxTop + 10);
      doc.font("Helvetica").fontSize(9).text(`Name: ${BANK_DETAILS.name}`, left + 8, bankBoxTop + 24);
      doc.text(`A/c No: ${BANK_DETAILS.accountNumber}`, left + 8, doc.y);
      doc.text(`Bank: ${BANK_DETAILS.bank}`, left + 8, doc.y);
      doc.text(`Branch: ${BANK_DETAILS.branch}`, left + 8, doc.y);
      doc.text(`IFSC Code : ${BANK_DETAILS.ifsc}`, left + 8, doc.y);

      const signatureX = left + width - 260;
      doc.font("Helvetica").fontSize(9).text(
        "for Advanced Educational Activities Private Limited",
        signatureX,
        bankBoxTop + 12,
        { width: 240 }
      );
      doc.text("(Authorised Signatory)", signatureX + 60, bankBoxTop + bankBoxHeight - 18);

      doc.moveTo(left, doc.page.height - doc.page.margins.bottom - 40)
        .lineTo(right, doc.page.height - doc.page.margins.bottom - 40)
        .stroke();

      doc.font("Helvetica-Bold").fontSize(10).text(
        "Advanced Educational Activities Pvt. Ltd.",
        left,
        doc.page.height - doc.page.margins.bottom - 30,
        { width }
      );
      doc.font("Helvetica").fontSize(8).text(
        "Regd. Office: 95B, 2nd Floor, Siddamsetty Complex, Park Lane, Secunderabad, Telangana - 500 003. Tel: 040-40088300/400.",
        left,
        doc.y,
        { width }
      );
      doc.text(
        "CIN No.: U80100TG1994PTC018452   e-mail: hoaccounts@time4education.com   website: www.time4education.com",
        left,
        doc.y,
        { width }
      );

      doc.end();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/release-orders/:id/accounts-invoice", upload.single("file"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ro = await storage.getReleaseOrder(id);
      if (!ro) return res.status(404).json({ error: "Release Order not found" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }

      const uploadDir = path.resolve(process.cwd(), "server", "uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      if ((ro as any).accountsInvoiceUrl) {
        try {
          fs.unlinkSync(path.join(uploadDir, (ro as any).accountsInvoiceUrl));
        } catch {}
      }

      const fileName = `accounts-tax-invoice-${id}-${Date.now()}.pdf`;
      fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);

      await db
        .update(releaseOrders)
        .set({ accountsInvoiceUrl: fileName as any })
        .where(eq(releaseOrders.id, id));

      // Create or update invoice record in invoices table
      const workOrder = await storage.getWorkOrder((ro as any).workOrderId);
      if (workOrder) {
        // Get the total amount from work order
        const totalAmount = Number(workOrder.totalAmount ?? 0);

        // Check if invoice already exists for this work order with tax_invoice type
        const existingInvoices = await db
          .select()
          .from(invoices)
          .where(and(
            eq(invoices.workOrderId, (ro as any).workOrderId),
            eq(invoices.invoiceType, "tax_invoice")
          ));

        // Get authenticated user ID from request (if available)
        const userId = (req as any).user?.id || (req as any).session?.userId || 1;

        // If no invoice exists, create one
        if (existingInvoices.length === 0) {
          await db.insert(invoices).values({
            workOrderId: (ro as any).workOrderId,
            amount: String(totalAmount),
            status: "pending",
            fileUrl: `/uploads/${fileName}`,
            invoiceType: "tax_invoice",
            generatedById: userId,
          } as any);
        } else {
          // Update existing invoice with new file URL
          await db
            .update(invoices)
            .set({ fileUrl: `/uploads/${fileName}` })
            .where(eq(invoices.id, existingInvoices[0].id));
        }
      }

      res.json({ success: true, accountsInvoiceUrl: fileName });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Installment routes
  app.get("/api/installments/booking/:bookingId", async (req, res) => {
    const installments = await storage.getInstallmentsByBooking(parseInt(req.params.bookingId));
    res.json(installments);
  });

  // Activity Logs
  app.get("/api/logs", async (req, res) => {
    try {
      const { limit } = req.query as any;
      const rows = await storage.getActivityLogs(limit ? Number(limit) : 200);
      // Enrich with actor name if possible
      const withNames = await Promise.all(rows.map(async (r: any) => {
        const u = r.actorId ? await storage.getUser(r.actorId) : undefined;
        return { ...r, actorName: u?.name || null };
      }));
      res.json(withNames);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Configure installment plan at Work Order scope -> creates multiple invoices with due dates
  app.post("/api/work-orders/:id/installments", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { schedule, generatedById } = req.body as { schedule: Array<{ amount: number; dueDate: string }>; generatedById: number };
      const wo = await storage.getWorkOrder(id);
      if (!wo) return res.status(404).json({ error: "Work Order not found" });
      if (!Array.isArray(schedule) || schedule.length === 0) {
        return res.status(400).json({ error: "Installment schedule is required" });
      }
      // Remove existing pending invoices (if any) for this WO to avoid duplicates
      const existing = await db.select().from(invoices).where(eq(invoices.workOrderId, id));
      for (const inv of existing) {
        if (inv.status === "pending") {
          await db.delete(invoices).where(eq(invoices.id, inv.id));
        }
      }
      // Create invoices for each installment
      for (const part of schedule) {
        await storage.createInvoice({
          workOrderId: id,
          amount: String(Number(part.amount) || 0),
          status: "pending" as any,
          generatedById,
          fileUrl: null as any,
          invoiceType: "tax_invoice" as any,
          dueDate: part.dueDate as any,
        } as any);
      }
      const rows = await db.select().from(invoices).where(eq(invoices.workOrderId, id));
      res.json(rows);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Admin routes
  // Simple client management API for managers (list/search/update clients)
  app.get("/api/clients", async (req, res) => {
    try {
      const { q } = req.query as { q?: string };
      let rows = await db.select().from(users).where(eq(users.role, "client"));
      if (q && q.trim().length > 0) {
        const needle = String(q).toLowerCase();
        rows = rows.filter((u: any) => {
          return [
            u.name,
            u.email,
            u.phone,
            u.businessSchoolName,
            u.schoolAddress,
            u.gstNumber,
          ].some((v: any) => String(v || "").toLowerCase().includes(needle));
        });
      }
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      const allowed = ["name", "email", "phone", "businessSchoolName", "schoolAddress", "gstNumber"] as const;
      const payload: any = {};
      for (const k of allowed) {
        if (k in updates) payload[k] = updates[k as any];
      }
      const [updatedUser] = await db
        .update(users)
        .set(payload)
        .where(eq(users.id, userId))
        .returning();
      if (!updatedUser) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const { name, email, phone, businessSchoolName, schoolAddress, gstNumber } = req.body as {
        name: string; email: string; phone: string;
        businessSchoolName?: string; schoolAddress?: string; gstNumber?: string;
      };
      if (!name || !email || !phone) {
        return res.status(400).json({ error: "name, email and phone are required" });
      }
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }
      const existingPhone = await storage.getUserByPhone(phone);
      if (existingPhone) {
        return res.status(400).json({ error: "Phone already exists" });
      }
      const user = await storage.createUser({
        name,
        email,
        phone,
        role: "client" as any,
        businessSchoolName,
        schoolAddress,
        gstNumber,
        isActive: true,
      } as any);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const [user] = await db.insert(users).values(validatedData).returning();
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const [updatedUser] = await db
        .update(users)
        .set(req.body)
        .where(eq(users.id, userId))
        .returning();
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      await db.delete(users).where(eq(users.id, userId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Deployment routes
  app.post("/api/deployments/complete/:bookingId", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.status === "pending_deployment") {
        await storage.updateBooking(bookingId, { status: "active" });
        
        // Update IT approval to approved
        const approvals = await storage.getApprovalsByBooking(bookingId);
        const itApproval = approvals.find(a => a.role === "it" && a.status === "pending");
        if (itApproval) {
          await storage.updateApproval(itApproval.id, { 
            status: "approved",
            approvedAt: new Date()
          });
        }
        
        // Mark banner as active
        const currentBanner = await storage.getCurrentBanner(bookingId);
        if (currentBanner) {
          await storage.updateBanner(currentBanner.id, { status: "active" });
        }
        
        // Notify client that campaign is live
        await notificationService.notifyCampaignLive(bookingId);
      }
      
      res.json({ success: true, booking });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/work-orders/:id/upload-proforma", upload.single("file"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { actorId } = (req.body ?? {}) as { actorId?: string };
      const wo = await storage.getWorkOrder(id);
      if (!wo) return res.status(404).json({ error: "Work Order not found" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }

      const uploadDir = path.resolve(process.cwd(), "server", "uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const fileName = `proforma-${id}-${Date.now()}.pdf`;
      fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
      const publicPath = `/uploads/${fileName}`;

      const existing = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.workOrderId, id), eq(invoices.invoiceType, "proforma" as any)));

      const total = Number((wo as any)?.totalAmount ?? 0);
      let proforma = existing[0];

      if (proforma) {
        if (proforma.fileUrl) {
          try {
            fs.unlinkSync(path.join(uploadDir, path.basename(proforma.fileUrl)));
          } catch {}
        }
        const updated = await db
          .update(invoices)
          .set({ amount: String(total), fileUrl: publicPath as any, generatedAt: new Date() as any })
          .where(eq(invoices.id, proforma.id))
          .returning();
        proforma = updated[0];
      } else {
        const generatedById = actorId ? Number(actorId) : (wo as any)?.quotedById || wo.clientId;
        proforma = await storage.createInvoice({
          workOrderId: id,
          amount: String(total),
          status: "pending" as any,
          generatedById,
          fileUrl: publicPath as any,
          invoiceType: "proforma" as any,
        } as any);
      }

      try {
        await notificationService.createNotification({
          userId: wo.clientId,
          type: "proforma_ready",
          message: `Proforma invoice for Work Order #${id} is ready.`,
        });
      } catch {}

      // Return the updated/created invoice with all details to ensure client gets the latest
      const [returnedInvoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, proforma.id));
      
      res.json({ success: true, invoice: returnedInvoice || proforma });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Accounts: Get payment tracking data with alerts
  app.get("/api/accounts/payments", async (req, res) => {
    try {
      const allWorkOrders = await db.select().from(workOrders);
      const allInvoices = await db.select().from(invoices);
      const allReleaseOrders = await db.select().from(releaseOrders);
      
      const paymentData = await Promise.all(
        allWorkOrders.map(async (wo) => {
          const woInvoices = allInvoices.filter((inv) => inv.workOrderId === wo.id);
          const proformaInvoice = woInvoices.find((inv) => inv.invoiceType === "proforma");
          const ro = allReleaseOrders.find((r: any) => r.workOrderId === wo.id);
          
          const totalAmount = Number(wo.totalAmount ?? 0);
          const paidAmount = woInvoices
            .filter((inv) => inv.status === "completed")
            .reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
          const pendingAmount = totalAmount - paidAmount;
          
          const dueDate = proformaInvoice?.dueDate || ro?.dueDate || null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          let daysOverdue = 0;
          if (dueDate) {
            const due = new Date(dueDate);
            due.setHours(0, 0, 0, 0);
            const diff = today.getTime() - due.getTime();
            daysOverdue = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
          }
          
          const isOverdue = daysOverdue > 0 && pendingAmount > 0;
          const isDueSoon = daysOverdue === 0 && pendingAmount > 0 && dueDate;
          
          let paymentStatus = "pending";
          if (paidAmount >= totalAmount) {
            paymentStatus = "paid";
          } else if (isOverdue) {
            paymentStatus = "overdue";
          } else if (isDueSoon) {
            paymentStatus = "due_soon";
          }

          const client = await storage.getUser(wo.clientId);
          const items = await storage.getWorkOrderItems(wo.id);

          return {
            workOrderId: wo.id,
            clientId: wo.clientId,
            clientName: wo.businessSchoolName || client?.name || `Client #${wo.clientId}`,
            paymentMode: wo.paymentMode || "full",
            totalAmount,
            paidAmount,
            pendingAmount,
            dueDate,
            daysOverdue,
            isOverdue,
            isDueSoon,
            paymentStatus,
            proformaInvoice,
            releaseOrder: ro,
            invoices: woInvoices,
            items: await Promise.all(
              items.map(async (item: any) => {
                if (item.slotId) {
                  const slot = await storage.getSlot(item.slotId);
                  return { ...item, slot };
                }
                return item;
              })
            ),
          };
        })
      );

      res.json(paymentData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Accounts: Get payment alerts (overdue and due soon)
  app.get("/api/accounts/payment-alerts", async (req, res) => {
    try {
      const allWorkOrders = await db.select().from(workOrders);
      const allInvoices = await db.select().from(invoices);
      const allReleaseOrders = await db.select().from(releaseOrders);
      
      const alerts: Array<{ type: string; workOrderId: number; clientName: string; amount: number; daysOverdue?: number; dueDate?: string }> = [];
      
      for (const wo of allWorkOrders) {
        const woInvoices = allInvoices.filter((inv) => inv.workOrderId === wo.id);
        const proformaInvoice = woInvoices.find((inv) => inv.invoiceType === "proforma");
        const ro = allReleaseOrders.find((r: any) => r.workOrderId === wo.id);
        
        const totalAmount = Number(wo.totalAmount ?? 0);
        const paidAmount = woInvoices
          .filter((inv) => inv.status === "completed")
          .reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);
        const pendingAmount = totalAmount - paidAmount;
        
        if (pendingAmount <= 0) continue;
        
        const dueDate = proformaInvoice?.dueDate || ro?.dueDate || null;
        if (!dueDate) continue;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diff = today.getTime() - due.getTime();
        const daysOverdue = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        const client = await storage.getUser(wo.clientId);
        const clientName = wo.businessSchoolName || client?.name || `Client #${wo.clientId}`;
        
        if (daysOverdue > 0) {
          alerts.push({
            type: "overdue",
            workOrderId: wo.id,
            clientName,
            amount: pendingAmount,
            daysOverdue,
            dueDate,
          });
        } else if (daysOverdue === 0) {
          alerts.push({
            type: "due_soon",
            workOrderId: wo.id,
            clientName,
            amount: pendingAmount,
            dueDate,
          });
        }
      }
      
      res.json({ alerts, overdueCount: alerts.filter((a) => a.type === "overdue").length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Deployment endpoints for IT team
  app.post("/api/deployments/deploy", async (req, res) => {
    try {
      const { releaseOrderId, workOrderItemId, bannerUrl, deployedById } = req.body;

      if (!releaseOrderId || !workOrderItemId || !bannerUrl || !deployedById) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get release order
      const ro = await storage.getReleaseOrder(releaseOrderId);
      if (!ro) {
        return res.status(404).json({ error: "Release Order not found" });
      }

      // Get work order item
      const items = await storage.getWorkOrderItems(ro.workOrderId);
      const item = items.find((it: any) => it.id === workOrderItemId);
      if (!item) {
        return res.status(404).json({ error: "Work Order Item not found" });
      }

      // Get work order
      const wo = await storage.getWorkOrder(ro.workOrderId);
      if (!wo) {
        return res.status(404).json({ error: "Work Order not found" });
      }

      // Get deployer user
      const deployer = await storage.getUser(deployedById);
      if (!deployer) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create deployment record in database
      const deployment = await storage.createDeployment({
        releaseOrderId,
        workOrderItemId,
        bannerUrl,
        slotId: item.slotId || null,
        deployedById: deployedById as any,
        status: "deployed" as any,
      });

      // Create activity log for deployment
      await storage.createActivityLog({
        actorId: deployedById as any,
        actorRole: "it" as any,
        action: "banner_deployed",
        entityType: "deployment",
        entityId: deployment.id,
        metadata: JSON.stringify({
          releaseOrderId,
          workOrderId: ro.workOrderId,
          workOrderItemId,
          bannerUrl,
          slotId: item.slotId,
          deploymentId: deployment.id,
          deployedAt: deployment.deployedAt,
        }),
      });

      res.json({
        success: true,
        message: "Banner deployed successfully",
        deployment: {
          id: deployment.id,
          releaseOrderId,
          workOrderItemId,
          bannerUrl,
          slotId: item.slotId,
          deployedAt: deployment.deployedAt,
          status: deployment.status,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get deployments with optional status filter
  app.get("/api/deployments", async (req, res) => {
    try {
      const { status, releaseOrderId, workOrderItemId } = req.query as { 
        status?: string; 
        releaseOrderId?: string; 
        workOrderItemId?: string;
      };
      
      const filters: { releaseOrderId?: number; workOrderItemId?: number; status?: string } = {};
      
      if (status) {
        filters.status = status;
      }
      if (releaseOrderId) {
        filters.releaseOrderId = parseInt(releaseOrderId);
      }
      if (workOrderItemId) {
        filters.workOrderItemId = parseInt(workOrderItemId);
      }
      
      const deploymentList = await storage.getDeployments(filters);
      res.json(deploymentList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get deployment logs for IT team
  app.get("/api/deployments/logs", async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const logs = await storage.getActivityLogs(Number(limit));
      
      // Filter to deployment-related actions
      const deploymentLogs = logs.filter((log: any) => 
        log.action === "banner_deployed" || 
        log.action === "banner_removed" || 
        log.action === "banner_replaced"
      );

      res.json(deploymentLogs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
