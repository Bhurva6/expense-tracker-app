import emailjs from '@emailjs/browser';
import * as XLSX from 'xlsx';

// EmailJS configuration - You'll need to replace these with your actual values
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'your_service_id';
const EMAILJS_TEMPLATE_ID_NEW_EXPENSE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_NEW_EXPENSE || 'template_new_expense';
const EMAILJS_TEMPLATE_ID_STATUS_CHANGE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_STATUS_CHANGE || 'template_status_change';
const EMAILJS_USER_ID = process.env.NEXT_PUBLIC_EMAILJS_USER_ID || 'your_user_id';

// Admin email list
const ADMIN_EMAILS = [
  'bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com',
  'kunal.nihalani@icloud.com',
  'hrd@panachegreen.com',
  'brijesh@panachegreen.com',
  'accounts@panachegreen.com',
];

// Initialize EmailJS
emailjs.init(EMAILJS_USER_ID);

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
}

interface AdminStats {
  totalMonthSpend: number;
  totalEmployees: number;
  maxCategory: [string, number];
  minCategory: [string, number];
  totalApproved: number;
  totalUnderReview: number;
  totalRejected: number;
  totalClosed: number;
  categorySpend: Record<string, number>;
}

// Send notification for new expense
export const sendNewExpenseNotification = async (expense: ExpenseData) => {
  try {
    const templateParams = {
      employee_name: expense.user.name,
      employee_email: expense.user.email,
      employee_department: expense.user.department || 'Not specified',
      expense_date: expense.date,
      expense_purpose: expense.purpose,
      expense_total: expense.total.toLocaleString(),
      expense_details: `Hotel: ₹${expense.hotel}, Transport: ₹${expense.transport}, Fuel: ₹${expense.fuel}, Meals: ₹${expense.meals}, Entertainment: ₹${expense.entertainment}`,
      expense_notes: expense.notes || 'No additional notes',
      submission_date: new Date().toLocaleString(),
      admin_emails: ADMIN_EMAILS.join(', '),
    };

    // Send email to admins
    for (const adminEmail of ADMIN_EMAILS) {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID_NEW_EXPENSE,
        {
          ...templateParams,
          to_email: adminEmail,
          to_name: 'Admin',
        }
      );
    }

    // Send confirmation email to employee
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_NEW_EXPENSE,
      {
        ...templateParams,
        to_email: expense.user.email,
        to_name: expense.user.name,
        email_type: 'confirmation',
      }
    );

    console.log('New expense notifications sent successfully');
  } catch (error) {
    console.error('Error sending new expense notification:', error);
    throw error;
  }
};

// Send notification for status change
export const sendStatusChangeNotification = async (
  expense: ExpenseData,
  oldStatus: string,
  newStatus: string,
  actionBy: string
) => {
  try {
    const templateParams = {
      employee_name: expense.user.name,
      employee_email: expense.user.email,
      expense_date: expense.date,
      expense_purpose: expense.purpose,
      expense_total: expense.total.toLocaleString(),
      old_status: oldStatus,
      new_status: newStatus,
      action_by: actionBy,
      action_date: new Date().toLocaleString(),
      expense_id: expense.id,
    };

    // Send notification to employee
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_STATUS_CHANGE,
      {
        ...templateParams,
        to_email: expense.user.email,
        to_name: expense.user.name,
      }
    );

    // Send notification to admins
    for (const adminEmail of ADMIN_EMAILS) {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID_STATUS_CHANGE,
        {
          ...templateParams,
          to_email: adminEmail,
          to_name: 'Admin',
          email_type: 'admin_notification',
        }
      );
    }

    console.log('Status change notifications sent successfully');
  } catch (error) {
    console.error('Error sending status change notification:', error);
    throw error;
  }
};
