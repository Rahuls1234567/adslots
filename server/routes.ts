import type { Express } from "express";
import multer from "multer";
import { Client } from "@replit/object-storage";
import path from "path";
import { storage } from "./storage";
import { db } from "./db";
import { banners, versionHistory } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { insertUserSchema, insertOtpCodeSchema, insertSlotSchema, insertBookingSchema, insertBannerSchema, insertApprovalSchema, signupSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

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
        ...validatedData,
        role: "client",
      });
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.createOtpCode({ phone: validatedData.phone, code, expiresAt, verified: false });
      
      console.log(`OTP for ${validatedData.phone}: ${code}`);
      
      res.json({ success: true, message: "Account created! Please verify your phone with the OTP sent.", userId: user.id });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      
      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await storage.createOtpCode({ phone, code, expiresAt, verified: false });
      
      // TODO: Send OTP via SMS service
      console.log(`OTP for ${phone}: ${code}`);
      
      res.json({ success: true, message: "OTP sent successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
      const booking = await storage.createBooking(validatedData);
      
      // Create approval workflow entries
      await storage.createApproval({
        bookingId: booking.id,
        role: "manager",
        status: "pending",
        approverId: null,
      });
      
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
      let roleToUpdate: string | null = null;
      let nextRoleToCreate: string | null = null;
      
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
        await objectStorageClient.uploadFromBytes(fileName, req.file.buffer, {
          metadata: {
            bookingId: parsedBookingId.toString(),
            version: nextVersion.toString(),
            uploadedById: parsedUploadedById.toString(),
          }
        });
      } catch (storageError: any) {
        return res.status(500).json({ 
          error: "Failed to upload file to storage", 
          details: storageError.message 
        });
      }

      let fileUrl: string;
      try {
        fileUrl = await objectStorageClient.getDownloadUrl(fileName);
      } catch {
        fileUrl = fileName;
      }

      let banner;
      try {
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

          if (currentBanner) {
            await tx.update(banners).set({ isCurrent: false }).where(eq(banners.id, currentBanner.id));
          }

          if (existingBanners.length > 0) {
            await tx.insert(versionHistory).values({
              bannerId: newBanner.id,
              version: nextVersion,
              fileUrl: fileUrl,
              editedById: parsedUploadedById,
              comments: req.body.comments || null,
            });
          }

          return newBanner;
        });
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
      } else if (approval.role === "pv_sir" && booking.status === "pending_pv") {
        await storage.updateBooking(booking.id, { status: "pending_payment" });
        await storage.createApproval({
          bookingId: booking.id,
          role: "accounts",
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
    } else if (approval.status === "rejected") {
      await storage.updateBooking(approval.bookingId, { status: "rejected" });
    }
    
    res.json(approval);
  });

  // Notification routes
  app.get("/api/notifications/:userId", async (req, res) => {
    const notifications = await storage.getNotificationsByUser(parseInt(req.params.userId));
    res.json(notifications);
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    await storage.markNotificationAsRead(parseInt(req.params.id));
    res.json({ success: true });
  });

  // Analytics routes
  app.get("/api/analytics/banner/:bannerId", async (req, res) => {
    const analytics = await storage.getAnalyticsByBanner(parseInt(req.params.bannerId));
    res.json(analytics);
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

  // Installment routes
  app.get("/api/installments/booking/:bookingId", async (req, res) => {
    const installments = await storage.getInstallmentsByBooking(parseInt(req.params.bookingId));
    res.json(installments);
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
      }
      
      res.json({ success: true, booking });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}
