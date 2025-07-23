import emailjs from '@emailjs/browser';
import * as XLSX from 'xlsx';

// EmailJS configuration - You'll need to replace these with your actual values
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'your_service_id';
const EMAILJS_TEMPLATE_ID_NEW_EXPENSE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_NEW_EXPENSE || 'template_new_expense';
const EMAILJS_TEMPLATE_ID_STATUS_CHANGE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_STATUS_CHANGE || 'template_status_change';
const EMAILJS_TEMPLATE_ID_MONTHLY_REPORT = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_MONTHLY_REPORT || 'template_monthly_report';
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

// Generate Excel data for monthly report
const generateMonthlyExcelData = (expenses: ExpenseData[]) => {
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['Monthly Expense Report Summary'],
    ['Generated on:', new Date().toLocaleString()],
    [''],
    ['Total Expenses:', expenses.length],
    ['Total Amount:', `₹${expenses.reduce((sum, exp) => sum + exp.total, 0).toLocaleString()}`],
    [''],
    ['Status Breakdown:'],
    ['Approved:', expenses.filter(exp => exp.status === 'Approve').length],
    ['Under Review:', expenses.filter(exp => exp.status === 'Under Review' || !exp.status).length],
    ['Rejected:', expenses.filter(exp => exp.status === 'Reject').length],
  ];
  
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  
  // Detailed expenses sheet
  const detailedData = expenses.map(exp => ({
    'Employee Name': exp.user.name,
    'Department': exp.user.department || 'Not specified',
    'Email': exp.user.email,
    'Date': exp.date,
    'Purpose': exp.purpose,
    'Hotel': exp.hotel,
    'Transport': exp.transport,
    'Fuel': exp.fuel,
    'Meals': exp.meals,
    'Entertainment': exp.entertainment,
    'Total': exp.total,
    'Status': exp.status || 'Under Review',
    'Submitted On': exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleString() : 'N/A',
    'Notes': exp.notes || '',
  }));
  
  const detailedWs = XLSX.utils.json_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(wb, detailedWs, 'Detailed Report');
  
  return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
};

// Send monthly report to admins
export const sendMonthlyReport = async (expenses: ExpenseData[], stats: AdminStats) => {
  try {
    const currentDate = new Date();
    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Generate Excel file
    const excelData = generateMonthlyExcelData(expenses);
    
    const templateParams = {
      month_year: monthYear,
      total_expenses: expenses.length,
      total_amount: stats.totalMonthSpend.toLocaleString(),
      total_employees: stats.totalEmployees,
      approved_count: stats.totalApproved,
      under_review_count: stats.totalUnderReview,
      rejected_count: stats.totalRejected,
      closed_count: stats.totalClosed,
      highest_category: stats.maxCategory[0],
      highest_amount: stats.maxCategory[1].toLocaleString(),
      lowest_category: stats.minCategory[0],
      lowest_amount: stats.minCategory[1].toLocaleString(),
      report_date: currentDate.toLocaleString(),
      excel_attachment: excelData,
    };

    // Send to all admins
    for (const adminEmail of ADMIN_EMAILS) {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID_MONTHLY_REPORT,
        {
          ...templateParams,
          to_email: adminEmail,
          to_name: 'Admin',
        }
      );
    }

    console.log('Monthly report sent successfully to all admins');
  } catch (error) {
    console.error('Error sending monthly report:', error);
    throw error;
  }
};

// Check if it's the last day of the month and send report
export const checkAndSendMonthlyReport = async (expenses: ExpenseData[], stats: AdminStats) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  // Check if tomorrow is the first day of the next month
  if (tomorrow.getDate() === 1) {
    await sendMonthlyReport(expenses, stats);
    return true;
  }
  
  return false;
};

// Manual trigger for monthly report (for testing or manual sending)
export const triggerMonthlyReport = async (expenses: ExpenseData[], stats: AdminStats) => {
  await sendMonthlyReport(expenses, stats);
};
