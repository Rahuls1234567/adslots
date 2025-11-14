import { emailService } from "./email";
import { whatsappService } from "./whatsapp";
import { db } from "../db";
import { notifications, users, bookings } from "@shared/schema";
import { eq } from "drizzle-orm";

interface NotificationPayload {
  userId: number;
  type: string;
  message: string;
  sendEmail?: boolean;
  sendWhatsApp?: boolean;
}

class NotificationService {
  // Create in-app notification
  async createNotification(payload: NotificationPayload) {
    try {
      const [notification] = await db.insert(notifications).values({
        userId: payload.userId,
        type: payload.type,
        message: payload.message,
        read: false,
      }).returning();

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  // Send notification via all channels
  async sendNotification(payload: NotificationPayload) {
    // Create in-app notification
    await this.createNotification(payload);

    // Get user details
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    if (!user) {
      console.error("User not found for notification");
      return;
    }

    // Send email if enabled
    if (payload.sendEmail !== false) {
      // Email sending logic handled by specific methods
    }

    // Send WhatsApp if enabled
    if (payload.sendWhatsApp !== false) {
      // WhatsApp sending logic handled by specific methods
    }
  }

  // Booking created notifications
  async notifyBookingCreated(bookingId: number, clientId: number) {
    try {
      const [client] = await db.select().from(users).where(eq(users.id, clientId));
      if (!client) return;

      // Notify client
      await this.createNotification({
        userId: clientId,
        type: "booking_created",
        message: `Your booking request #${bookingId} has been submitted successfully and is under review.`,
      });

      // Send email and WhatsApp to client
      await emailService.sendBookingCreatedEmail(client.email, client.name, bookingId);
      await whatsappService.sendBookingCreated(client.phone, client.name, bookingId);

      // Notify all managers
      const managers = await db.select().from(users).where(eq(users.role, "manager"));
      for (const manager of managers) {
        await this.createNotification({
          userId: manager.id,
          type: "approval_required",
          message: `New booking request #${bookingId} from ${client.name} requires your approval.`,
        });

        await emailService.sendManagerApprovalEmail(manager.email, manager.name, bookingId, client.name);
      }
    } catch (error) {
      console.error("Error in notifyBookingCreated:", error);
    }
  }

  // Approval status change notifications
  async notifyApprovalStatusChange(
    bookingId: number,
    status: "approved" | "rejected",
    approverRole: string,
    comments?: string
  ) {
    try {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (!booking) return;

      const [client] = await db.select().from(users).where(eq(users.id, booking.clientId));
      if (!client) return;

      // Notify client
      await this.createNotification({
        userId: client.id,
        type: `booking_${status}`,
        message: `Your booking #${bookingId} has been ${status} by ${approverRole}.${comments ? ` Comment: ${comments}` : ''}`,
      });

      // Send email and WhatsApp to client
      await emailService.sendApprovalStatusEmail(
        client.email,
        client.name,
        bookingId,
        status,
        approverRole,
        comments
      );
      await whatsappService.sendApprovalUpdate(client.phone, client.name, bookingId, status, approverRole);

      // If approved, notify next approver
      if (status === "approved") {
        let nextRole: "client" | "manager" | "vp" | "pv_sir" | "accounts" | "it" | null = null;
        
        if (booking.status === "pending_vp") nextRole = "vp";
        else if (booking.status === "pending_pv") nextRole = "pv_sir";
        else if (booking.status === "pending_payment") nextRole = "accounts";
        else if (booking.status === "pending_deployment") nextRole = "it";

        if (nextRole) {
          const nextApprovers = await db.select().from(users).where(eq(users.role, nextRole));
          for (const approver of nextApprovers) {
            await this.createNotification({
              userId: approver.id,
              type: "approval_required",
              message: `Booking #${bookingId} from ${client.name} requires your approval.`,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error in notifyApprovalStatusChange:", error);
    }
  }

  // Campaign expiry reminder
  async notifyExpiryReminder(bookingId: number, daysLeft: number) {
    try {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (!booking) return;

      const [client] = await db.select().from(users).where(eq(users.id, booking.clientId));
      if (!client) return;

      await this.createNotification({
        userId: client.id,
        type: "campaign_expiring",
        message: `Your campaign #${bookingId} is expiring in ${daysLeft} day${daysLeft > 1 ? 's' : ''}!`,
      });

      await emailService.sendExpiryReminderEmail(client.email, client.name, bookingId, daysLeft);
      await whatsappService.sendExpiryReminder(client.phone, client.name, bookingId, daysLeft);
    } catch (error) {
      console.error("Error in notifyExpiryReminder:", error);
    }
  }

  // Payment reminder
  async notifyPaymentReminder(bookingId: number) {
    try {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (!booking) return;

      const [client] = await db.select().from(users).where(eq(users.id, booking.clientId));
      if (!client) return;

      await this.createNotification({
        userId: client.id,
        type: "payment_reminder",
        message: `Payment of ₹${booking.totalAmount} is pending for booking #${bookingId}.`,
      });

      await whatsappService.sendPaymentReminder(
        client.phone,
        client.name,
        bookingId,
        booking.totalAmount.toString()
      );
    } catch (error) {
      console.error("Error in notifyPaymentReminder:", error);
    }
  }

  // Campaign live notification
  async notifyCampaignLive(bookingId: number) {
    try {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      if (!booking) return;

      const [client] = await db.select().from(users).where(eq(users.id, booking.clientId));
      if (!client) return;

      await this.createNotification({
        userId: client.id,
        type: "campaign_live",
        message: `🚀 Your campaign #${bookingId} is now live!`,
      });

      await whatsappService.sendCampaignLive(client.phone, client.name, bookingId);
    } catch (error) {
      console.error("Error in notifyCampaignLive:", error);
    }
  }

  // IT deployment notification
  async notifyDeployment(bookingId: number, bannerUrl: string) {
    try {
      const itUsers = await db.select().from(users).where(eq(users.role, "it"));
      
      for (const itUser of itUsers) {
        await this.createNotification({
          userId: itUser.id,
          type: "deployment_required",
          message: `Banner for booking #${bookingId} is ready for deployment.`,
        });

        await emailService.sendDeploymentNotificationEmail(itUser.email, bookingId, bannerUrl);
        await whatsappService.sendDeploymentNotification(itUser.phone, bookingId);
      }
    } catch (error) {
      console.error("Error in notifyDeployment:", error);
    }
  }

  // Get user notifications
  async getUserNotifications(userId: number) {
    try {
      return await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(notifications.createdAt);
    } catch (error) {
      console.error("Error getting user notifications:", error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: number) {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId));
      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  // Mark all user notifications as read
  async markAllAsRead(userId: number) {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));
      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
