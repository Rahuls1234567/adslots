import { db } from "../db";
import { bookings, banners } from "@shared/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { notificationService } from "./notification";

class CronService {
  private intervals: NodeJS.Timeout[] = [];

  // Start all cron jobs
  start() {
    console.log("Starting cron jobs...");
    
    // Check for expiring campaigns every day at 9 AM
    this.scheduleExpiryCheck();
    
    // Check for expired campaigns every hour
    this.scheduleExpiredCampaignsCheck();
    
    // Send payment reminders every day at 10 AM
    this.schedulePaymentReminders();
  }

  // Stop all cron jobs
  stop() {
    console.log("Stopping cron jobs...");
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  // Check for campaigns expiring in 2 days
  private scheduleExpiryCheck() {
    // Run every 24 hours
    const interval = setInterval(async () => {
      try {
        await this.checkExpiringCampaigns();
      } catch (error) {
        console.error("Error in expiry check cron:", error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.intervals.push(interval);
    
    // Run immediately on start
    this.checkExpiringCampaigns();
  }

  // Check for expired campaigns
  private scheduleExpiredCampaignsCheck() {
    // Run every hour
    const interval = setInterval(async () => {
      try {
        await this.checkExpiredCampaigns();
      } catch (error) {
        console.error("Error in expired campaigns check:", error);
      }
    }, 60 * 60 * 1000); // 1 hour

    this.intervals.push(interval);
  }

  // Send payment reminders
  private schedulePaymentReminders() {
    // Run every 24 hours
    const interval = setInterval(async () => {
      try {
        await this.sendPaymentReminders();
      } catch (error) {
        console.error("Error in payment reminders cron:", error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.intervals.push(interval);
  }

  // Check for campaigns expiring in 2 days
  private async checkExpiringCampaigns() {
    try {
      const today = new Date();
      const twoDaysFromNow = new Date(today);
      twoDaysFromNow.setDate(today.getDate() + 2);

      const expiringBookings = await db
        .select({
          id: bookings.id,
          status: bookings.status,
          endDate: bookings.endDate,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.status, "active"),
            lte(bookings.endDate, twoDaysFromNow.toISOString().split('T')[0]),
            gte(bookings.endDate, today.toISOString().split('T')[0])
          )
        );

      console.log(`Found ${expiringBookings.length} campaigns expiring soon`);

      for (const booking of expiringBookings) {
        const endDate = new Date(booking.endDate);
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 2 && daysLeft >= 0) {
          await notificationService.notifyExpiryReminder(booking.id, daysLeft);
        }
      }
    } catch (error) {
      console.error("Error checking expiring campaigns:", error);
    }
  }

  // Check and handle expired campaigns
  private async checkExpiredCampaigns() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const expiredBookings = await db
        .select({
          id: bookings.id,
          status: bookings.status,
          endDate: bookings.endDate,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.status, "active"),
            lte(bookings.endDate, today)
          )
        );

      console.log(`Found ${expiredBookings.length} expired campaigns`);

      for (const booking of expiredBookings) {
        // Update booking status to expired
        await db
          .update(bookings)
          .set({ status: "expired" })
          .where(eq(bookings.id, booking.id));

        // Mark banner as expired
        await db
          .update(banners)
          .set({ status: "expired", isCurrent: false })
          .where(
            and(
              eq(banners.bookingId, booking.id),
              eq(banners.isCurrent, true)
            )
          );

        console.log(`Expired booking #${booking.id}`);
      }
    } catch (error) {
      console.error("Error checking expired campaigns:", error);
    }
  }

  // Send payment reminders for pending payments
  private async sendPaymentReminders() {
    try {
      const pendingPaymentBookings = await db
        .select({
          id: bookings.id,
          status: bookings.status,
        })
        .from(bookings)
        .where(eq(bookings.status, "pending_payment"));

      console.log(`Found ${pendingPaymentBookings.length} bookings with pending payments`);

      for (const booking of pendingPaymentBookings) {
        await notificationService.notifyPaymentReminder(booking.id);
      }
    } catch (error) {
      console.error("Error sending payment reminders:", error);
    }
  }
}

export const cronService = new CronService();
