// Client-side email service that calls the API routes
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

// Helper function to call the email API
const callEmailAPI = async (type: string, data: any) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, ...data }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to send email';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } else {
          // If not JSON, get text response
          const textResponse = await response.text();
          errorMessage = textResponse || `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (parseError) {
        // If parsing fails, use status text
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Email API error (${type}):`, error);
    throw error;
  }
};

// Send notification for new expense
export const sendNewExpenseNotification = async (expense: ExpenseData) => {
  try {
    console.log('Sending new expense notifications...');
    await callEmailAPI('new-expense', { expense });
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
    console.log('Sending status change notifications...');
    await callEmailAPI('status-change', { 
      expense, 
      oldStatus, 
      newStatus, 
      actionBy 
    });
    console.log('Status change notifications sent successfully');
  } catch (error) {
    console.error('Error sending status change notification:', error);
    throw error;
  }
};

// Send notification when expense is closed
export const sendExpenseClosedNotification = async (
  expense: ExpenseData,
  closedBy: string,
  paidAmount: number
) => {
  try {
    console.log('Sending expense closed notifications...');
    await callEmailAPI('expense-closed', { 
      expense, 
      closedBy, 
      paidAmount 
    });
    console.log('Expense closed notifications sent successfully');
  } catch (error) {
    console.error('Error sending expense closed notification:', error);
    throw error;
  }
};

// Send monthly admin report
export const sendMonthlyAdminReport = async (adminStats: AdminStats, expenses: any[]) => {
  try {
    console.log('Sending monthly admin report...');
    await callEmailAPI('monthly-report', { 
      adminStats, 
      expenses 
    });
    console.log('Monthly admin report sent successfully');
  } catch (error) {
    console.error('Error sending monthly admin report:', error);
    throw error;
  }
};

// Test email configuration
export const testEmailConfiguration = async () => {
  try {
    await callEmailAPI('test-config', {});
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

// Send test email
export const sendTestEmail = async (testEmail: string) => {
  try {
    const testExpense = {
      id: `test-${Date.now()}`,
      user: {
        name: 'Test User',
        email: testEmail,
        department: 'Testing Department',
      },
      date: new Date().toISOString().split('T')[0],
      purpose: 'Test expense for email notification verification',
      hotel: 1500,
      transport: 800,
      fuel: 500,
      meals: 1200,
      entertainment: 300,
      total: 4300,
      status: 'Under Review',
      createdAt: new Date(),
      notes: 'This is a test expense to verify email notifications are working correctly.',
      location: {
        address: 'Test Location, Mumbai, Maharashtra, India',
        latitude: 19.0760,
        longitude: 72.8777,
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      },
    };

    console.log(`Sending test email to ${testEmail}...`);
    await callEmailAPI('test-email', { expense: testExpense });
    console.log('Test email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
};
