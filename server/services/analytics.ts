import { db } from "../db";
import { analytics, banners } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

class AnalyticsService {
  // Track banner impression
  async trackImpression(bannerId: number) {
    console.log(`[AnalyticsService.trackImpression] Tracking impression for banner ${bannerId}`);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if analytics record exists for today
      const existing = await db
        .select()
        .from(analytics)
        .where(and(eq(analytics.bannerId, bannerId), eq(analytics.date, today)))
        .limit(1);

      if (existing.length > 0) {
        // Increment impressions
        console.log(`[AnalyticsService.trackImpression] Updating existing analytics record ${existing[0].id}`);
        await db
          .update(analytics)
          .set({ impressions: sql`${analytics.impressions} + 1` })
          .where(eq(analytics.id, existing[0].id));
        console.log(`[AnalyticsService.trackImpression] Analytics record ${existing[0].id} updated successfully`);
      } else {
        // Create new analytics record
        console.log(`[AnalyticsService.trackImpression] Creating new analytics record for banner ${bannerId}, date ${today}`);
        const result = await db.insert(analytics).values({
          bannerId,
          impressions: 1,
          clicks: 0,
          date: today,
        }).returning();
        console.log(`[AnalyticsService.trackImpression] Analytics record created with ID: ${result[0]?.id}`);
      }

      return true;
    } catch (error) {
      console.error("Error tracking impression:", error);
      return false;
    }
  }

  // Track banner click
  async trackClick(bannerId: number) {
    console.log(`[AnalyticsService.trackClick] Tracking click for banner ${bannerId}`);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if analytics record exists for today
      const existing = await db
        .select()
        .from(analytics)
        .where(and(eq(analytics.bannerId, bannerId), eq(analytics.date, today)))
        .limit(1);

      if (existing.length > 0) {
        // Increment clicks
        console.log(`[AnalyticsService.trackClick] Updating existing analytics record ${existing[0].id}`);
        await db
          .update(analytics)
          .set({ clicks: sql`${analytics.clicks} + 1` })
          .where(eq(analytics.id, existing[0].id));
        console.log(`[AnalyticsService.trackClick] Analytics record ${existing[0].id} updated successfully`);
      } else {
        // Create new analytics record with click
        console.log(`[AnalyticsService.trackClick] Creating new analytics record for banner ${bannerId}, date ${today}`);
        const result = await db.insert(analytics).values({
          bannerId,
          impressions: 0,
          clicks: 1,
          date: today,
        }).returning();
        console.log(`[AnalyticsService.trackClick] Analytics record created with ID: ${result[0]?.id}`);
      }

      return true;
    } catch (error) {
      console.error("Error tracking click:", error);
      return false;
    }
  }

  // Get analytics for a banner
  async getBannerAnalytics(bannerId: number, startDate?: string, endDate?: string) {
    try {
      let results;
      
      if (startDate && endDate) {
        results = await db
          .select()
          .from(analytics)
          .where(
            and(
              eq(analytics.bannerId, bannerId),
              sql`${analytics.date} >= ${startDate}`,
              sql`${analytics.date} <= ${endDate}`
            )
          );
      } else {
        results = await db
          .select()
          .from(analytics)
          .where(eq(analytics.bannerId, bannerId));
      }

      // Calculate totals and CTR
      const totalImpressions = results.reduce((sum, r) => sum + r.impressions, 0);
      const totalClicks = results.reduce((sum, r) => sum + r.clicks, 0);
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      return {
        data: results,
        summary: {
          totalImpressions,
          totalClicks,
          ctr: parseFloat(ctr.toFixed(2)),
        },
      };
    } catch (error) {
      console.error("Error getting banner analytics:", error);
      return {
        data: [],
        summary: {
          totalImpressions: 0,
          totalClicks: 0,
          ctr: 0,
        },
      };
    }
  }

  // Get analytics for a booking (all banners)
  async getBookingAnalytics(bookingId: number, startDate?: string, endDate?: string) {
    try {
      // Get all banners for this booking
      const bookingBanners = await db
        .select()
        .from(banners)
        .where(eq(banners.bookingId, bookingId));

      if (bookingBanners.length === 0) {
        return {
          data: [],
          summary: {
            totalImpressions: 0,
            totalClicks: 0,
            ctr: 0,
          },
        };
      }

      const bannerIds = bookingBanners.map(b => b.id);
      
      // Get analytics for all banners
      let results;
      if (startDate && endDate) {
        results = await db
          .select()
          .from(analytics)
          .where(
            and(
              sql`${analytics.bannerId} IN (${sql.join(bannerIds.map(id => sql`${id}`), sql`, `)})`,
              sql`${analytics.date} >= ${startDate}`,
              sql`${analytics.date} <= ${endDate}`
            )
          );
      } else {
        results = await db
          .select()
          .from(analytics)
          .where(sql`${analytics.bannerId} IN (${sql.join(bannerIds.map(id => sql`${id}`), sql`, `)})`);
      }

      // Calculate totals and CTR
      const totalImpressions = results.reduce((sum, r) => sum + r.impressions, 0);
      const totalClicks = results.reduce((sum, r) => sum + r.clicks, 0);
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      return {
        data: results,
        summary: {
          totalImpressions,
          totalClicks,
          ctr: parseFloat(ctr.toFixed(2)),
        },
      };
    } catch (error) {
      console.error("Error getting booking analytics:", error);
      return {
        data: [],
        summary: {
          totalImpressions: 0,
          totalClicks: 0,
          ctr: 0,
        },
      };
    }
  }

  // Get analytics summary for a client (all their bookings)
  async getClientAnalytics(clientId: number, startDate?: string, endDate?: string) {
    try {
      // This would require joining bookings, banners, and analytics tables
      // For now, return a placeholder
      return {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalImpressions: 0,
        totalClicks: 0,
        averageCTR: 0,
      };
    } catch (error) {
      console.error("Error getting client analytics:", error);
      return {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalImpressions: 0,
        totalClicks: 0,
        averageCTR: 0,
      };
    }
  }
}

export const analyticsService = new AnalyticsService();
