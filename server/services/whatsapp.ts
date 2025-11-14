import axios from "axios";

interface WhatsAppMessage {
  to: string;
  message: string;
}

class WhatsAppService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    // Using WhatsApp Business API or services like Twilio, MessageBird, or Gupshup
    this.apiUrl = process.env.WHATSAPP_API_URL || "";
    this.apiKey = process.env.WHATSAPP_API_KEY || "";
  }

  async sendMessage(options: WhatsAppMessage): Promise<boolean> {
    try {
      if (!this.apiUrl || !this.apiKey) {
        console.log("WhatsApp not configured. Message would be sent:", options.message);
        return true; // Return true in development
      }

      // Example using generic WhatsApp Business API format
      // Adjust based on your provider (Twilio, MessageBird, etc.)
      await axios.post(
        this.apiUrl,
        {
          to: options.to,
          message: options.message,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`WhatsApp message sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      return false;
    }
  }

  // Booking created notification
  async sendBookingCreated(phone: string, clientName: string, bookingId: number) {
    const message = `
🎉 *Booking Confirmed!*

Dear ${clientName},

Your ad booking request has been submitted successfully.

📋 *Booking ID:* #${bookingId}
⏳ *Status:* Under Review

Our team will review your request shortly. You'll receive updates at each stage.

Thank you for choosing TIME!
    `.trim();

    return this.sendMessage({ to: phone, message });
  }

  // Approval notification
  async sendApprovalUpdate(
    phone: string,
    clientName: string,
    bookingId: number,
    status: "approved" | "rejected",
    approverRole: string
  ) {
    const emoji = status === "approved" ? "✅" : "❌";
    const message = `
${emoji} *Booking ${status === "approved" ? "Approved" : "Rejected"}*

Dear ${clientName},

Your booking #${bookingId} has been *${status}* by ${approverRole}.

${status === "approved" ? "Your booking is moving to the next approval stage." : "Please contact us for more details."}

View details: ${process.env.APP_URL || 'http://localhost:5000'}
    `.trim();

    return this.sendMessage({ to: phone, message });
  }

  // Expiry reminder
  async sendExpiryReminder(phone: string, clientName: string, bookingId: number, daysLeft: number) {
    const message = `
⏰ *Campaign Expiring Soon!*

Dear ${clientName},

Your ad campaign is expiring in *${daysLeft} day${daysLeft > 1 ? 's' : ''}*!

📋 *Booking ID:* #${bookingId}

Would you like to renew? Contact us to extend your campaign.

Renew now: ${process.env.APP_URL || 'http://localhost:5000'}
    `.trim();

    return this.sendMessage({ to: phone, message });
  }

  // Payment reminder
  async sendPaymentReminder(phone: string, clientName: string, bookingId: number, amount: string) {
    const message = `
💳 *Payment Reminder*

Dear ${clientName},

Payment pending for booking #${bookingId}

💰 *Amount:* ₹${amount}

Please complete the payment to activate your campaign.

Pay now: ${process.env.APP_URL || 'http://localhost:5000'}
    `.trim();

    return this.sendMessage({ to: phone, message });
  }

  // Campaign live notification
  async sendCampaignLive(phone: string, clientName: string, bookingId: number) {
    const message = `
🚀 *Campaign is Live!*

Dear ${clientName},

Great news! Your ad campaign is now live.

📋 *Booking ID:* #${bookingId}

Track your campaign performance in the dashboard.

View analytics: ${process.env.APP_URL || 'http://localhost:5000'}
    `.trim();

    return this.sendMessage({ to: phone, message });
  }

  // IT deployment notification
  async sendDeploymentNotification(phone: string, bookingId: number) {
    const message = `
🚀 *Deployment Required*

New banner ready for deployment.

📋 *Booking ID:* #${bookingId}

Please deploy the banner to the designated slot.

View details: ${process.env.APP_URL || 'http://localhost:5000'}
    `.trim();

    return this.sendMessage({ to: phone, message });
  }
}

export const whatsappService = new WhatsAppService();
