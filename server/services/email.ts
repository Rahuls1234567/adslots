import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"TIME Ad Management" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }

  // Booking created notification
  async sendBookingCreatedEmail(clientEmail: string, clientName: string, bookingId: number) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7334AE 0%, #5B2A8F 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; }
            .button { display: inline-block; background: #7334AE; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Request Submitted</h1>
            </div>
            <div class="content">
              <p>Dear ${clientName},</p>
              <p>Your ad booking request has been successfully submitted and is now under review.</p>
              <p><strong>Booking ID:</strong> #${bookingId}</p>
              <p>Our team will review your request and get back to you shortly. You'll receive notifications at each stage of the approval process.</p>
              <a href="${process.env.APP_URL || 'http://localhost:5000'}" class="button">View Booking Status</a>
              <p>Thank you for choosing TIME!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TIME. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: `Booking Request #${bookingId} Submitted Successfully`,
      html,
      text: `Your booking request #${bookingId} has been submitted and is under review.`,
    });
  }

  // Manager approval notification
  async sendManagerApprovalEmail(managerEmail: string, managerName: string, bookingId: number, clientName: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; }
            .button { display: inline-block; background: #FF9500; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Approval Required</h1>
            </div>
            <div class="content">
              <p>Dear ${managerName},</p>
              <p>A new booking request requires your approval.</p>
              <p><strong>Booking ID:</strong> #${bookingId}</p>
              <p><strong>Client:</strong> ${clientName}</p>
              <p>Please review the booking details and take appropriate action.</p>
              <a href="${process.env.APP_URL || 'http://localhost:5000'}" class="button">Review Booking</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TIME. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: managerEmail,
      subject: `Action Required: Booking #${bookingId} Awaiting Approval`,
      html,
      text: `Booking #${bookingId} from ${clientName} requires your approval.`,
    });
  }

  // Approval status update
  async sendApprovalStatusEmail(
    clientEmail: string,
    clientName: string,
    bookingId: number,
    status: "approved" | "rejected",
    approverRole: string,
    comments?: string
  ) {
    const isApproved = status === "approved";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${isApproved ? 'linear-gradient(135deg, #34C759 0%, #2DA84A 100%)' : 'linear-gradient(135deg, #FF3B30 0%, #D32F2F 100%)'}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; }
            .button { display: inline-block; background: ${isApproved ? '#34C759' : '#FF3B30'}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .comments { background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isApproved ? '✅ Booking Approved' : '❌ Booking Rejected'}</h1>
            </div>
            <div class="content">
              <p>Dear ${clientName},</p>
              <p>Your booking request #${bookingId} has been <strong>${status}</strong> by ${approverRole}.</p>
              ${comments ? `<div class="comments"><strong>Comments:</strong><br>${comments}</div>` : ''}
              ${isApproved ? '<p>Your booking is now moving to the next stage of approval.</p>' : '<p>Please contact us if you have any questions.</p>'}
              <a href="${process.env.APP_URL || 'http://localhost:5000'}" class="button">View Details</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TIME. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: `Booking #${bookingId} ${isApproved ? 'Approved' : 'Rejected'} by ${approverRole}`,
      html,
      text: `Your booking #${bookingId} has been ${status}.`,
    });
  }

  // Banner expiry reminder
  async sendExpiryReminderEmail(clientEmail: string, clientName: string, bookingId: number, daysLeft: number) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF9500 0%, #FF6B00 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; }
            .button { display: inline-block; background: #7334AE; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { background: #FFF3CD; border-left: 4px solid #FF9500; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Campaign Expiring Soon</h1>
            </div>
            <div class="content">
              <p>Dear ${clientName},</p>
              <div class="warning">
                <strong>Your ad campaign is expiring in ${daysLeft} day${daysLeft > 1 ? 's' : ''}!</strong>
              </div>
              <p><strong>Booking ID:</strong> #${bookingId}</p>
              <p>Would you like to renew your campaign? Contact us to extend your advertising period.</p>
              <a href="${process.env.APP_URL || 'http://localhost:5000'}" class="button">Renew Campaign</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TIME. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject: `⏰ Campaign #${bookingId} Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`,
      html,
      text: `Your campaign #${bookingId} is expiring in ${daysLeft} days.`,
    });
  }

  // IT deployment notification
  async sendDeploymentNotificationEmail(itEmail: string, bookingId: number, bannerUrl: string) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; }
            .button { display: inline-block; background: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Banner Ready for Deployment</h1>
            </div>
            <div class="content">
              <p>Dear IT Team,</p>
              <p>A new banner is ready for deployment.</p>
              <p><strong>Booking ID:</strong> #${bookingId}</p>
              <p><strong>Banner URL:</strong> ${bannerUrl}</p>
              <p>Please deploy the banner to the designated slot.</p>
              <a href="${process.env.APP_URL || 'http://localhost:5000'}" class="button">View Deployment Details</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TIME. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: itEmail,
      subject: `🚀 Banner Deployment Required - Booking #${bookingId}`,
      html,
      text: `Banner for booking #${bookingId} is ready for deployment.`,
    });
  }

  async sendReleaseOrderApprovalEmail(
    approverEmail: string,
    approverName: string,
    releaseOrderId: number,
    workOrderId: number,
    approvalUrl: string
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; }
            .button { display: inline-block; background: #0EA5E9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Release Order Pending Final Approval</h1>
            </div>
            <div class="content">
              <p>Dear ${approverName},</p>
              <p>Release Order <strong>#${releaseOrderId}</strong> (Work Order #${workOrderId}) has been approved by VP Sir and is awaiting your final approval.</p>
              <p>Please review the details and complete the approval process.</p>
              <a href="${approvalUrl}" class="button">Review & Approve</a>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TIME. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: approverEmail,
      subject: `Release Order #${releaseOrderId} awaiting your approval`,
      html,
      text: `Release Order #${releaseOrderId} for Work Order #${workOrderId} awaits your approval. Review here: ${approvalUrl}`,
    });
  }
}

export const emailService = new EmailService();
