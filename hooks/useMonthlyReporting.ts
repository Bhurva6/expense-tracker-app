import { useEffect } from 'react';
import { checkAndSendMonthlyReport } from '../lib/emailService';

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

export const useMonthlyReporting = (expenses: ExpenseData[], stats: AdminStats) => {
  useEffect(() => {
    const checkMonthlyReport = async () => {
      try {
        const reportSent = await checkAndSendMonthlyReport(expenses, stats);
        if (reportSent) {
          console.log('Monthly report has been sent automatically');
        }
      } catch (error) {
        console.error('Error in automatic monthly report:', error);
      }
    };

    // Check once when component mounts
    checkMonthlyReport();

    // Set up daily check at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeoutId = setTimeout(() => {
      checkMonthlyReport();
      
      // Set up daily interval after first midnight check
      const intervalId = setInterval(checkMonthlyReport, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(intervalId);
    }, msUntilMidnight);

    return () => clearTimeout(timeoutId);
  }, [expenses, stats]);
};
