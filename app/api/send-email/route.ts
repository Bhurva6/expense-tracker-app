import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Gmail configuration for Nodemailer
const EMAIL_USER = process.env.GMAIL_USER || 'your-email@gmail.com';
const EMAIL_PASS = process.env.GMAIL_APP_PASSWORD || 'your-app-password';

// Helper function to format date/time in IST (Indian Standard Time)
const formatDateIST = (date: Date = new Date()): string => {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' IST';
};

// Admin email list
const ADMIN_EMAILS = [
  'bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com',
  'hrd@panachegreen.com',
  'brijesh@panachegreen.com',
  'accounts@panachegreen.com',
];

// Create transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  // Add timeout and connection settings
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
});

interface ExpenseData {
  id: string;
  user: {
    name: string;
    email: string;
    department?: string;
  };
  date: string;
  purpose: string;
  hotel: number;
  transport: number;
  fuel: number;
  meals: number;
  entertainment: number;
  total: number;
  status?: string;
  createdAt: any;
  notes?: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    timestamp?: string;
  };
}

// Email templates
const getNewExpenseEmailTemplate = (expense: ExpenseData, isForAdmin: boolean = false) => {
  const locationInfo = expense.location && expense.location.address ? 
    `<tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Location:</td><td style="padding: 10px; border: 1px solid #ddd;">📍 ${expense.location.address}</td></tr>` : '';

  const subject = isForAdmin 
    ? `🚨 New Expense Submitted - ${expense.user.name} (₹${expense.total.toLocaleString()})`
    : `✅ Expense Submission Confirmed - ₹${expense.total.toLocaleString()}`;

  const greeting = isForAdmin 
    ? `<h2 style="color: #e74c3c;">New Expense Alert</h2><p>A new expense has been submitted and requires your review:</p>`
    : `<h2 style="color: #27ae60;">Expense Submitted Successfully</h2><p>Dear ${expense.user.name}, your expense has been successfully submitted and is now under review.</p>`;

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          ${greeting}
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <h3 style="color: #495057; margin-top: 0;">Expense Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Employee:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.user.name}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Email:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.user.email}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Department:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.user.department || 'Not specified'}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Date:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.date}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Purpose:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.purpose}</td></tr>
            ${locationInfo}
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Total Amount:</td><td style="padding: 10px; border: 1px solid #ddd; font-size: 18px; font-weight: bold; color: #e74c3c;">₹${expense.total.toLocaleString()}</td></tr>
          </table>

          <h4 style="color: #495057;">Expense Breakdown:</h4>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            ${expense.hotel ? `<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;">Hotel:</td><td style="padding: 8px; border: 1px solid #ddd;">₹${expense.hotel.toLocaleString()}</td></tr>` : ''}
            ${expense.transport ? `<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;">Transport:</td><td style="padding: 8px; border: 1px solid #ddd;">₹${expense.transport.toLocaleString()}</td></tr>` : ''}
            ${expense.fuel ? `<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;">Fuel:</td><td style="padding: 8px; border: 1px solid #ddd;">₹${expense.fuel.toLocaleString()}</td></tr>` : ''}
            ${expense.meals ? `<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;">Meals:</td><td style="padding: 8px; border: 1px solid #ddd;">₹${expense.meals.toLocaleString()}</td></tr>` : ''}
            ${expense.entertainment ? `<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;">Entertainment:</td><td style="padding: 8px; border: 1px solid #ddd;">₹${expense.entertainment.toLocaleString()}</td></tr>` : ''}
          </table>

          ${expense.notes ? `<div style="margin: 15px 0;"><strong>Notes:</strong><div style="background: #e9ecef; padding: 10px; border-radius: 5px; margin-top: 5px;">${expense.notes}</div></div>` : ''}
          
          <div style="margin: 20px 0; padding: 10px; background: #d1ecf1; border-radius: 5px; border-left: 4px solid #bee5eb;">
            <strong>Submitted:</strong> ${formatDateIST()}
          </div>
        </div>

        <div style="background: #343a40; color: white; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
          ${isForAdmin 
            ? '<p style="margin: 0;">Please review and approve/reject this expense in the admin dashboard.</p>' 
            : '<p style="margin: 0;">You will receive email notifications when the status of your expense changes.</p>'
          }
          <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">Panache Green Expense Management System</p>
        </div>
      </body>
      </html>
    `,
  };
};

const getStatusChangeEmailTemplate = (
  expense: ExpenseData,
  oldStatus: string,
  newStatus: string,
  actionBy: string,
  isForAdmin: boolean = false
) => {
  const statusColor = newStatus === 'Approve' ? '#27ae60' : newStatus === 'Reject' ? '#e74c3c' : '#f39c12';
  const statusIcon = newStatus === 'Approve' ? '✅' : newStatus === 'Reject' ? '❌' : '⏳';
  
  const subject = isForAdmin 
    ? `📋 Expense Status Updated - ${expense.user.name} (${oldStatus} → ${newStatus})`
    : `${statusIcon} Expense Status Update - ${newStatus}`;

  const greeting = isForAdmin 
    ? `<h2 style="color: ${statusColor};">Expense Status Update</h2><p>An expense status has been changed by ${actionBy}:</p>`
    : `<h2 style="color: ${statusColor};">Your Expense Status Has Been Updated</h2><p>Dear ${expense.user.name}, your expense status has been changed.</p>`;

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          ${greeting}
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <div style="text-align: center; margin: 20px 0; padding: 15px; background: ${statusColor}; color: white; border-radius: 10px;">
            <h3 style="margin: 0; font-size: 24px;">${statusIcon} Status: ${newStatus}</h3>
            <p style="margin: 5px 0 0 0;">Changed from "${oldStatus}" by ${actionBy}</p>
          </div>

          <h3 style="color: #495057; margin-top: 0;">Expense Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Employee:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.user.name}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Date:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.date}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Purpose:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.purpose}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Total Amount:</td><td style="padding: 10px; border: 1px solid #ddd; font-size: 18px; font-weight: bold; color: #e74c3c;">₹${expense.total.toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Expense ID:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.id}</td></tr>
          </table>
          
          <div style="margin: 20px 0; padding: 10px; background: #d1ecf1; border-radius: 5px; border-left: 4px solid #bee5eb;">
            <strong>Status Changed:</strong> ${formatDateIST()}
          </div>

          ${newStatus === 'Approve' ? 
            '<div style="margin: 15px 0; padding: 15px; background: #d4edda; border-radius: 5px; border-left: 4px solid #c3e6cb;"><strong>✅ Next Steps:</strong> Your expense has been approved and will be processed for payment.</div>' : 
            newStatus === 'Reject' ? 
            '<div style="margin: 15px 0; padding: 15px; background: #f8d7da; border-radius: 5px; border-left: 4px solid #f5c6cb;"><strong>❌ Action Required:</strong> Your expense has been rejected. Please contact the admin team for more details or resubmit with corrections.</div>' :
            '<div style="margin: 15px 0; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffeaa7;"><strong>⏳ Status:</strong> Your expense is currently under review.</div>'
          }
        </div>

        <div style="background: #343a40; color: white; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
          <p style="margin: 0;">For any questions, please contact the admin team.</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">Panache Green Expense Management System</p>
        </div>
      </body>
      </html>
    `,
  };
};

const getExpenseClosedEmailTemplate = (
  expense: ExpenseData,
  closedBy: string,
  paidAmount: number,
  isForAdmin: boolean = false
) => {
  const subject = isForAdmin 
    ? `💰 Expense Closed - ${expense.user.name} (₹${expense.total.toLocaleString()})`
    : `💰 Your Expense Has Been Closed - Payment Processed`;

  const greeting = isForAdmin 
    ? `<h2 style="color: #27ae60;">Expense Closed</h2><p>An expense has been marked as closed and paid by ${closedBy}:</p>`
    : `<h2 style="color: #27ae60;">Payment Processed</h2><p>Dear ${expense.user.name}, your expense has been processed and marked as closed.</p>`;

  return {
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          ${greeting}
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6;">
          <div style="text-align: center; margin: 20px 0; padding: 15px; background: #27ae60; color: white; border-radius: 10px;">
            <h3 style="margin: 0; font-size: 24px;">💰 Expense Closed</h3>
            <p style="margin: 5px 0 0 0;">Payment processed by ${closedBy}</p>
          </div>

          <h3 style="color: #495057; margin-top: 0;">Payment Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Employee:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.user.name}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Expense Date:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.date}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Purpose:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.purpose}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Total Amount:</td><td style="padding: 10px; border: 1px solid #ddd; font-size: 18px; font-weight: bold; color: #e74c3c;">₹${expense.total.toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Amount Paid:</td><td style="padding: 10px; border: 1px solid #ddd; font-size: 18px; font-weight: bold; color: #27ae60;">₹${paidAmount.toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Balance:</td><td style="padding: 10px; border: 1px solid #ddd; font-size: 16px; font-weight: bold; color: ${(expense.total - paidAmount) > 0 ? '#e74c3c' : '#27ae60'};">₹${(expense.total - paidAmount).toLocaleString()}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Expense ID:</td><td style="padding: 10px; border: 1px solid #ddd;">${expense.id}</td></tr>
          </table>
          
          <div style="margin: 20px 0; padding: 10px; background: #d1ecf1; border-radius: 5px; border-left: 4px solid #bee5eb;">
            <strong>Closed Date:</strong> ${formatDateIST()}
          </div>

          <div style="margin: 15px 0; padding: 15px; background: #d4edda; border-radius: 5px; border-left: 4px solid #c3e6cb;">
            <strong>✅ Transaction Complete:</strong> This expense has been processed and marked as closed. No further action is required.
          </div>
        </div>

        <div style="background: #343a40; color: white; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
          <p style="margin: 0;">Thank you for using our expense management system.</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">Panache Green Expense Management System</p>
        </div>
      </body>
      </html>
    `,
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, expense, oldStatus, newStatus, actionBy, closedBy, paidAmount } = body;

    // Validate required fields
    if (!type || !expense) {
      return NextResponse.json(
        { error: 'Missing required fields: type and expense' },
        { status: 400 }
      );
    }

    // Validate email configuration
    if (!EMAIL_USER || EMAIL_USER === 'your-email@gmail.com') {
      return NextResponse.json(
        { error: 'Email configuration incomplete: GMAIL_USER not set or using default value' },
        { status: 500 }
      );
    }

    if (!EMAIL_PASS || EMAIL_PASS === 'your-app-password') {
      return NextResponse.json(
        { error: 'Email configuration incomplete: GMAIL_APP_PASSWORD not set or using default value' },
        { status: 500 }
      );
    }

    console.log(`Processing email notification: ${type}`);

    switch (type) {
      case 'new-expense':
        // Send email to employee (confirmation)
        const employeeTemplate = getNewExpenseEmailTemplate(expense, false);
        await transporter.sendMail({
          from: `"Panache Green Expense System" <${EMAIL_USER}>`,
          to: expense.user.email,
          subject: employeeTemplate.subject,
          html: employeeTemplate.html,
        });
        console.log(`Confirmation email sent to employee: ${expense.user.email}`);

        // Send email to all admins
        const adminTemplate = getNewExpenseEmailTemplate(expense, true);
        for (const adminEmail of ADMIN_EMAILS) {
          try {
            await transporter.sendMail({
              from: `"Panache Green Expense System" <${EMAIL_USER}>`,
              to: adminEmail,
              subject: adminTemplate.subject,
              html: adminTemplate.html,
            });
            console.log(`New expense notification sent to admin: ${adminEmail}`);
          } catch (error) {
            console.error(`Failed to send email to admin ${adminEmail}:`, error);
          }
        }
        break;

      case 'status-change':
        if (!oldStatus || !newStatus || !actionBy) {
          return NextResponse.json(
            { error: 'Missing required fields for status change: oldStatus, newStatus, actionBy' },
            { status: 400 }
          );
        }

        // Send email to employee
        const empStatusTemplate = getStatusChangeEmailTemplate(expense, oldStatus, newStatus, actionBy, false);
        await transporter.sendMail({
          from: `"Panache Green Expense System" <${EMAIL_USER}>`,
          to: expense.user.email,
          subject: empStatusTemplate.subject,
          html: empStatusTemplate.html,
        });
        console.log(`Status change notification sent to employee: ${expense.user.email}`);

        // Send email to all admins
        const adminStatusTemplate = getStatusChangeEmailTemplate(expense, oldStatus, newStatus, actionBy, true);
        for (const adminEmail of ADMIN_EMAILS) {
          try {
            await transporter.sendMail({
              from: `"Panache Green Expense System" <${EMAIL_USER}>`,
              to: adminEmail,
              subject: adminStatusTemplate.subject,
              html: adminStatusTemplate.html,
            });
            console.log(`Status change notification sent to admin: ${adminEmail}`);
          } catch (error) {
            console.error(`Failed to send status change email to admin ${adminEmail}:`, error);
          }
        }
        break;

      case 'expense-closed':
        if (!closedBy || paidAmount === undefined) {
          return NextResponse.json(
            { error: 'Missing required fields for expense closure: closedBy, paidAmount' },
            { status: 400 }
          );
        }

        // Send email to employee
        const empClosedTemplate = getExpenseClosedEmailTemplate(expense, closedBy, paidAmount, false);
        await transporter.sendMail({
          from: `"Panache Green Expense System" <${EMAIL_USER}>`,
          to: expense.user.email,
          subject: empClosedTemplate.subject,
          html: empClosedTemplate.html,
        });
        console.log(`Expense closed notification sent to employee: ${expense.user.email}`);

        // Send email to all admins
        const adminClosedTemplate = getExpenseClosedEmailTemplate(expense, closedBy, paidAmount, true);
        for (const adminEmail of ADMIN_EMAILS) {
          try {
            await transporter.sendMail({
              from: `"Panache Green Expense System" <${EMAIL_USER}>`,
              to: adminEmail,
              subject: adminClosedTemplate.subject,
              html: adminClosedTemplate.html,
            });
            console.log(`Expense closed notification sent to admin: ${adminEmail}`);
          } catch (error) {
            console.error(`Failed to send closed expense email to admin ${adminEmail}:`, error);
          }
        }
        break;

      case 'test-config':
        // Test email configuration
        await transporter.verify();
        return NextResponse.json({ success: true, message: 'Email configuration is valid' });

      case 'test-email':
        if (!expense.user.email) {
          return NextResponse.json(
            { error: 'Missing test email address' },
            { status: 400 }
          );
        }

        const testTemplate = getNewExpenseEmailTemplate(expense, false);
        await transporter.sendMail({
          from: `"Panache Green Expense System" <${EMAIL_USER}>`,
          to: expense.user.email,
          subject: `TEST EMAIL - ${testTemplate.subject}`,
          html: testTemplate.html,
        });
        console.log(`Test email sent to: ${expense.user.email}`);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Email notification sent successfully: ${type}` 
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send email notification', 
        details: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
