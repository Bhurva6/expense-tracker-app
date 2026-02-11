'use client';
import React, { useEffect, useState, useCallback, memo } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, deleteDoc, addDoc } from 'firebase/firestore';
import { Card, Input, Button } from "./ui/shadcn";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Dialog } from '@headlessui/react';
import { useAuth } from '../context/AuthContext';
import { sendStatusChangeNotification, sendExpenseClosedNotification } from '../lib/emailService';
import EmailTestComponent from './EmailTestComponent';
import { useRouter } from 'next/navigation';
import ProjectManagement from './ProjectManagement';

// Memoized Remarks Input Component to prevent re-renders while typing
const RemarksInput = memo(function RemarksInput({ 
  expenseId, 
  initialValue = '', 
  placeholder = 'Add your comments...',
  onSave,
  rows = 3,
  minHeight = '80px',
  clearAfterSave = true
}: { 
  expenseId: string; 
  initialValue?: string; 
  placeholder?: string;
  onSave: (id: string, value: string) => void;
  rows?: number;
  minHeight?: string;
  clearAfterSave?: boolean;
}) {
  const [localValue, setLocalValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!localValue.trim()) return; // Don't save empty remarks
    setIsSaving(true);
    try {
      await onSave(expenseId, localValue);
      // Clear the input after saving if clearAfterSave is true
      if (clearAfterSave) {
        setLocalValue('');
      }
    } finally {
      setIsSaving(false);
    }
  }, [expenseId, localValue, onSave, clearAfterSave]);

  return (
    <div className="flex gap-2">
      <textarea
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 p-3 border rounded resize-none"
        style={{ 
          background: 'var(--surface)', 
          color: 'var(--foreground)', 
          borderColor: 'var(--muted)',
          minHeight
        }}
        rows={rows}
      />
      <Button
        onClick={handleSave}
        className="px-3 py-2 self-start"
        style={{ background: 'var(--primary)', color: 'var(--surface)' }}
        title="Save Comment"
      >
        ✓
      </Button>
    </div>
  );
});

const ADMIN_EMAILS = ['bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com',
  'hrd@panachegreen.com',
  'brijesh@panachegreen.com',
  'accounts@panachegreen.com',];

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]); // Store all expenses for dropdown options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [previewExpense, setPreviewExpense] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState<Record<string, string>>({});
  const [paidDraft, setPaidDraft] = useState<Record<string, string>>({});
  const [lockedExpenses, setLockedExpenses] = useState<Record<string, boolean>>({});
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isExpandedView, setIsExpandedView] = useState(true);
  const [showEmailTest, setShowEmailTest] = useState(false);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'review', 'approve', 'accounts', 'access-control', 'projects'
  const [accessControlUsers, setAccessControlUsers] = useState<any[]>([]);

  // Fetch access control users from Firebase
  const fetchAccessControlUsers = async () => {
    try {
      const q = query(collection(db, 'accessControl'));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setAccessControlUsers(users);
    } catch (err: any) {
      console.error('Error fetching access control users:', err);
    }
  };

  // Check if a user has admin access based on email
  const hasAdminAccess = (email: string): boolean => {
    // First check if user is in ADMIN_EMAILS
    if (ADMIN_EMAILS.includes(email)) {
      return true;
    }
    
    // Then check if user has admin access in access control
    const accessControlUser = accessControlUsers.find(u => u.email === email);
    return accessControlUser?.accessRights === 'admin';
  };

  // Check if a user has specific area access
  const hasAreaAccess = (email: string, area: 'review' | 'approve' | 'accounts'): boolean => {
    // ADMIN_EMAILS have full access
    if (ADMIN_EMAILS.includes(email)) {
      return true;
    }
    
    const accessControlUser = accessControlUsers.find(u => u.email === email);
    if (!accessControlUser) return false;
    
    // For both admin and entry users, check specific area permissions
    // Admin users will only see sections they have checkboxes selected for
    return accessControlUser.areaOfRights?.[area] === true;
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Fetch all expenses and filter client-side for better reliability
      const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Store all expenses for dropdown options
      setAllExpenses(allExpenses);
      
      // Apply filters client-side
      let filteredExpenses = allExpenses;
      
      if (filterMonth) {
        filteredExpenses = filteredExpenses.filter((exp: any) => {
          const expDate = exp.date;
          return expDate && expDate.startsWith(filterMonth);
        });
      }
      
      if (filterDept) {
        filteredExpenses = filteredExpenses.filter((exp: any) => 
          exp.user?.department === filterDept
        );
      }
      
      if (filterEmployee) {
        filteredExpenses = filteredExpenses.filter((exp: any) => 
          exp.user?.name === filterEmployee
        );
      }
      
      if (filterSite) {
        filteredExpenses = filteredExpenses.filter((exp: any) => 
          exp.siteName === filterSite
        );
      }
      
      setExpenses(filteredExpenses);
    } catch (err: any) {
      setError(err.message || 'Error fetching expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchAccessControlUsers();
    // eslint-disable-next-line
  }, [filterMonth, filterDept, filterEmployee, filterSite]);

  const handleStatusChange = async (id: string, status: string) => {
    const actionBy = {
      name: user?.displayName || user?.email || 'Unknown Admin',
      email: user?.email || 'unknown@admin.com',
      timestamp: new Date().toLocaleString()
    };
    
    // Find the expense to get old status and send notification
    const expense = expenses.find(exp => exp.id === id);
    const oldStatus = expense?.status || 'Under Review';
    
    await updateDoc(doc(db, 'expenses', id), { 
      status,
      actionBy,
      actionTimestamp: new Date().toLocaleString()
    });
    
    // Send email notification for status change
    if (expense) {
      try {
        await sendStatusChangeNotification(
          {
            id: expense.id,
            user: {
              name: expense.user?.name || 'Unknown User',
              email: expense.user?.email || '',
              department: expense.user?.department || 'Not specified',
            },
            date: expense.date,
            purpose: expense.purpose || expense.notes || 'General expense',
            hotel: Number(expense.hotel) || 0,
            transport: Number(expense.transport) || 0,
            fuel: Number(expense.fuel) || 0,
            meals: Number(expense.meals) || 0,
            entertainment: Number(expense.entertainment) || 0,
            total: expense.total,
            status: status,
            createdAt: expense.createdAt,
            notes: expense.notes,
          },
          oldStatus,
          status,
          actionBy.name
        );
        console.log('Status change notification sent successfully');
      } catch (emailError) {
        console.error('Failed to send status change notification:', emailError);
        // Don't fail the status update if email fails
      }
    }
    
    fetchExpenses();
  };

  const handleRemarksChange = async (id: string, remarks: string) => {
    await updateDoc(doc(db, 'expenses', id), { remarks });
    await fetchExpenses();
  };

  const handleRemarksDraftChange = (id: string, value: string) => {
    setRemarksDraft((prev) => ({ ...prev, [id]: value }));
  };

  const handleRemarksBlur = (id: string) => {
    if (remarksDraft[id] !== undefined) {
      handleRemarksChange(id, remarksDraft[id]);
    }
  };

  // Helper function to get remarks draft value with proper initialization
  const getRemarksDraftValue = (expenseId: string, existingRemarks: string = '') => {
    if (remarksDraft[expenseId] !== undefined) {
      return remarksDraft[expenseId];
    }
    return existingRemarks;
  };

  // Helper function to initialize draft if not exists
  const initializeRemarksDraft = (expenseId: string, existingRemarks: string = '') => {
    if (remarksDraft[expenseId] === undefined) {
      setRemarksDraft(prev => ({ ...prev, [expenseId]: existingRemarks }));
    }
  };

  // Submit remarks for an expense
  const handleSubmitRemarks = async (expenseId: string) => {
    if (remarksDraft[expenseId] !== undefined) {
      await handleRemarksChange(expenseId, remarksDraft[expenseId]);
    }
  };

  const handlePreview = (exp: any) => {
    setPreviewExpense(exp);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewExpense(null);
  };

  const handlePaidDraftChange = (id: string, value: string) => {
    setPaidDraft((prev) => ({ ...prev, [id]: value }));
  };

  const handlePaidSave = async (id: string, total: number) => {
    if (paidDraft[id] !== undefined) {
      await updateDoc(doc(db, 'expenses', id), { paid: paidDraft[id] });
      fetchExpenses();
    }
  };

  const handleCloseExpense = async (id: string) => {
    const now = new Date().toLocaleString();
    const closedBy = {
      name: user?.displayName || user?.email || 'Unknown Admin',
      email: user?.email || 'unknown@admin.com',
      timestamp: now
    };
    
    // Find the expense to get details for email notification
    const expense = expenses.find(exp => exp.id === id);
    const paidAmount = Number(expense?.paid) || 0;
    
    await updateDoc(doc(db, 'expenses', id), { 
      paidDate: now, 
      locked: true,
      closedBy,
      closeTimestamp: now
    });
    
    // Send email notification for expense closure
    if (expense) {
      try {
        await sendExpenseClosedNotification(
          {
            id: expense.id,
            user: {
              name: expense.user?.name || 'Unknown User',
              email: expense.user?.email || '',
              department: expense.user?.department || 'Not specified',
            },
            date: expense.date,
            purpose: expense.purpose || expense.notes || 'General expense',
            hotel: Number(expense.hotel) || 0,
            transport: Number(expense.transport) || 0,
            fuel: Number(expense.fuel) || 0,
            meals: Number(expense.meals) || 0,
            entertainment: Number(expense.entertainment) || 0,
            total: expense.total,
            status: expense.status,
            createdAt: expense.createdAt,
            notes: expense.notes,
            location: expense.location,
          },
          closedBy.name,
          paidAmount
        );
        console.log('Expense closed notification sent successfully');
      } catch (emailError) {
        console.error('Failed to send expense closed notification:', emailError);
        // Don't fail the closure if email fails
      }
    }
    
    setLockedExpenses((prev) => ({ ...prev, [id]: true }));
    fetchExpenses();
  };

  const handleClearAllExpenses = async () => {
    setIsClearing(true);
    try {
      // Get all expenses
      const q = query(collection(db, 'expenses'));
      const snapshot = await getDocs(q);
      
      // Delete all expenses
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Refresh the data
      await fetchExpenses();
      setShowClearConfirm(false);
      
      alert(`Successfully deleted ${snapshot.docs.length} expenses!`);
    } catch (err: any) {
      console.error('Error clearing expenses:', err);
      alert('Error clearing expenses: ' + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  // Calculate admin dashboard statistics
  const calculateAdminStats = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let totalMonthSpend = 0;
    let totalApproved = 0;
    let totalUnderReview = 0;
    let totalRejected = 0;
    let totalClosed = 0;
    const categorySpend: Record<string, number> = {};
    const uniqueEmployees = new Set<string>();

    expenses.forEach((exp: any) => {
      const expenseDate = new Date(exp.createdAt?.toDate ? exp.createdAt.toDate() : exp.createdAt);
      const amount = exp.total || 0;
      
      // Add to unique employees
      if (exp.user?.name) {
        uniqueEmployees.add(exp.user.name);
      }
      
      // Month spend
      if (expenseDate >= startOfMonth) {
        totalMonthSpend += amount;
      }
      
      // Status counts
      const status = exp.status || 'Under Review';
      if (status === 'Final Approved' || exp.finalApproval === true) {
        totalApproved++;
      } else if (status === 'Approve') {
        totalApproved++; // Initial approval counts as approved
      } else if (status === 'Reject') {
        totalRejected++;
      } else {
        totalUnderReview++;
      }
      
      // Closed expenses
      if (exp.locked || exp.paidDate) totalClosed++;
      
      // Category spend
      const category = exp.purpose || exp.category || 'Other';
      categorySpend[category] = (categorySpend[category] || 0) + amount;
    });

    // Find max and min spending categories
    const sortedCategories = Object.entries(categorySpend).sort(([,a], [,b]) => b - a);
    const maxCategory = sortedCategories[0] || ['No data', 0];
    const minCategory = sortedCategories[sortedCategories.length - 1] || ['No data', 0];

    return {
      totalMonthSpend,
      totalEmployees: uniqueEmployees.size,
      maxCategory,
      minCategory,
      totalApproved,
      totalUnderReview,
      totalRejected,
      totalClosed,
      categorySpend
    };
  };

  const {
    totalMonthSpend,
    totalEmployees,
    maxCategory,
    minCategory,
    totalApproved,
    totalUnderReview,
    totalRejected,
    totalClosed,
    categorySpend
  } = calculateAdminStats();

  // Setup monthly reporting hook
  const adminStats = {
    totalMonthSpend,
    totalEmployees,
    maxCategory,
    minCategory,
    totalApproved,
    totalUnderReview,
    totalRejected,
    totalClosed,
    categorySpend
  };

  // Group expenses by user email
  const groupedByUser = expenses.reduce((acc, exp) => {
    const email = exp.user?.email || 'unknown';
    if (!acc[email]) acc[email] = [];
    acc[email].push(exp);
    return acc;
  }, {} as Record<string, any[]>);

  const handleDownloadMasterExcel = () => {
    const wb = XLSX.utils.book_new();
    
    Object.entries(groupedByUser).forEach(([email, userExpenses]) => {
      const detailedRows: any[] = [];
      
      (userExpenses as any[]).forEach((exp: any) => {
        const baseInfo = {
          Name: exp.user?.name,
          Contact: exp.user?.number || exp.user?.phone || 'Not available',
          Date: exp.date,
          Purpose: exp.purpose,
          Notes: exp.notes,
          Status: exp.status || 'Submitted',
          'Action By': exp.actionBy ? `${exp.actionBy.name} (${exp.actionBy.timestamp})` : 
                      exp.closedBy ? `${exp.closedBy.name} - Closed (${exp.closedBy.timestamp})` : '-',
          'Document Link': exp.file || '',
          'Bill Image Links': exp.billImages ? exp.billImages.join(', ') : '',
          Email: exp.user?.email,
          SubmittedAt: exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleString() : '',
          'Location Address': exp.location?.address || 'Not available',
          'Location Coordinates': exp.location?.latitude && exp.location?.longitude ? 
            `${exp.location.latitude.toFixed(6)}, ${exp.location.longitude.toFixed(6)}` : 'Not available',
          'Location Timestamp': exp.location?.timestamp || 'Not available',
          'Total Expense': exp.total
        };

        // Helper function to add expense breakdown rows
        const addExpenseItems = (items: any[], categoryName: string, subcategoryName: string) => {
          if (items && items.length > 0) {
            items.forEach((item: any, index: number) => {
              detailedRows.push({
                ...baseInfo,
                Category: categoryName,
                'Sub-Category': `${subcategoryName}${index + 1}`,
                'Item Description': item.description || item.label || `${subcategoryName} ${index + 1}`,
                'Item Amount': Number(item.amount) || 0
              });
            });
          }
        };

        // Process different expense categories
        if (exp.category === 'personal') {
          // Personal category breakdown
          addExpenseItems(exp.food, 'Personal', 'Food');
          addExpenseItems(exp.fuel, 'Personal', 'Fuel');
          addExpenseItems(exp.entertainment, 'Personal', 'Entertainment');
          addExpenseItems(exp.utility, 'Personal', 'Utility');
          addExpenseItems(exp.home, 'Personal', 'Home');
          addExpenseItems(exp.travel, 'Personal', 'Travel');
          addExpenseItems(exp.grocery, 'Personal', 'Grocery');
          addExpenseItems(exp.miscellaneous, 'Personal', 'Miscellaneous');
        } else if (exp.category === 'official') {
          // Official category breakdown
          addExpenseItems(exp.food, 'Official', 'Food');
          addExpenseItems(exp.fuel, 'Official', 'Fuel');
          addExpenseItems(exp.transport, 'Official', 'Transport');
          addExpenseItems(exp.hotel, 'Official', 'Hotel');
          addExpenseItems(exp.miscellaneous, 'Official', 'Miscellaneous');
        } else if (exp.category === 'site') {
          // Site category breakdown
          if (exp.siteName) {
            detailedRows.push({
              ...baseInfo,
              Category: 'Site',
              'Sub-Category': 'Site Info',
              'Item Description': `Site: ${exp.siteName}`,
              'Item Amount': 0
            });
          }
          addExpenseItems(exp.labour, 'Site', 'Labour');
          addExpenseItems(exp.travel, 'Site', 'Travel');
          addExpenseItems(exp.tools, 'Site', 'Tools');
          addExpenseItems(exp.consumables, 'Site', 'Consumables');
          addExpenseItems(exp.stay, 'Site', 'Stay');
          addExpenseItems(exp.transportOfMaterial, 'Site', 'Transport of Material');
          addExpenseItems(exp.localCommute, 'Site', 'Local Commute');
          addExpenseItems(exp.miscellaneous, 'Site', 'Miscellaneous');
        } else {
          // Legacy format or others
          const legacyItems = [
            { name: 'Hotel', value: exp.hotel },
            { name: 'Transport', value: exp.transport },
            { name: 'Fuel', value: exp.fuel },
            { name: 'Meals', value: exp.meals },
            { name: 'Entertainment', value: exp.entertainment }
          ];

          legacyItems.forEach((item) => {
            if (item.value && Number(item.value) > 0) {
              detailedRows.push({
                ...baseInfo,
                Category: exp.category || 'Other',
                'Sub-Category': item.name,
                'Item Description': `${item.name} expense`,
                'Item Amount': Number(item.value) || 0
              });
            }
          });

          // Handle others array for legacy format
          if (exp.others && exp.others.length > 0) {
            addExpenseItems(exp.others, exp.category || 'Other', 'Other');
          }
        }

        // If no detailed items were added, add a summary row
        if (detailedRows.filter(row => row.Date === exp.date && row.Name === exp.user?.name).length === 0) {
          detailedRows.push({
            ...baseInfo,
            Category: exp.category || 'Other',
            'Sub-Category': 'Total',
            'Item Description': 'Total expense amount',
            'Item Amount': exp.total || 0
          });
        }
      });

      const ws = XLSX.utils.json_to_sheet(detailedRows);
      XLSX.utils.book_append_sheet(wb, ws, email.replace(/[@.]/g, '_'));
    });
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `master_expenses_detailed.xlsx`);
  };

  // Sort expenses: open first, closed (locked) at the bottom
  const sortedExpenses = [...expenses].sort((a, b) => {
    const aLocked = a.locked || lockedExpenses[a.id];
    const bLocked = b.locked || lockedExpenses[b.id];
    if (aLocked === bLocked) return 0;
    return aLocked ? 1 : -1;
  });

  // Get unique employee names for the filter dropdown
  const uniqueEmployees = [...new Set(allExpenses.map((exp: any) => exp.user?.name).filter((name: string) => name))].sort();

  const isImageUrl = (url: string) => {
    if (!url) return false;
    // Handle both jpeg and jpg extensions
    return /\.(jpe?g|png|webp|avif|gif|svg)$/.test(url.toLowerCase());
  };

  // Helper function to safely format amounts
  const formatAmount = (amount: any): string => {
    const num = Number(amount);
    return isNaN(num) ? '0' : num.toLocaleString();
  };

  // Component for Review View
  const ReviewComponent = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>Review Expenses</h3>
      <div className="p-6 rounded-lg" style={{ background: 'var(--accent-light)' }}>
        <p className="text-center text-lg mb-6" style={{ color: 'var(--foreground)' }}>
          📋 Review expenses that need attention - View details, approve or reject
        </p>
        <div className="grid gap-6">
          {expenses.filter(exp => exp.status === 'Under Review' || !exp.status).map(exp => (
            <div key={exp.id} className="p-6 rounded-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--muted)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Details */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-lg" style={{ color: 'var(--primary)' }}>{exp.user?.name || 'Unknown'}</h4>
                      <p className="text-sm text-gray-500">{exp.user?.department || 'No Department'} • {exp.user?.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl" style={{ color: 'var(--primary)' }}>₹{formatAmount(exp.total)}</div>
                      <div className="text-sm text-gray-500">{exp.date}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div><strong>Purpose:</strong> {exp.purpose || 'Not specified'}</div>
                    <div><strong>Category:</strong> {exp.category || 'Not specified'}</div>
                    {exp.notes && <div><strong>Notes:</strong> {exp.notes}</div>}
                    <div><strong>Submitted:</strong> {exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleString() : 'Unknown'}</div>
                    {exp.location && exp.location.address && (
                      <div><strong>Location:</strong> 📍 {exp.location.address}</div>
                    )}
                  </div>

                  {/* Expense Breakdown */}
                  <div className="space-y-2 p-3 rounded" style={{ background: 'var(--accent-light)' }}>
                    <h5 className="font-semibold">Expense Breakdown:</h5>
                    {exp.category === 'personal' && (
                      <>
                        {exp.food && exp.food.length > 0 && <div>Food: ₹{formatAmount(exp.food.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.fuel && exp.fuel.length > 0 && <div>Fuel: ₹{formatAmount(exp.fuel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.entertainment && exp.entertainment.length > 0 && <div>Entertainment: ₹{formatAmount(exp.entertainment.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.utility && exp.utility.length > 0 && <div>Utility: ₹{formatAmount(exp.utility.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.home && exp.home.length > 0 && <div>Home: ₹{formatAmount(exp.home.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.travel && exp.travel.length > 0 && <div>Travel: ₹{formatAmount(exp.travel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.grocery && exp.grocery.length > 0 && <div>Grocery: ₹{formatAmount(exp.grocery.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.miscellaneous && exp.miscellaneous.length > 0 && <div>Miscellaneous: ₹{formatAmount(exp.miscellaneous.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                      </>
                    )}
                    {exp.category === 'official' && (
                      <>
                        {exp.food && exp.food.length > 0 && <div>Food: ₹{formatAmount(exp.food.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.fuel && exp.fuel.length > 0 && <div>Fuel: ₹{formatAmount(exp.fuel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.transport && exp.transport.length > 0 && <div>Transport: ₹{formatAmount(exp.transport.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.hotel && exp.hotel.length > 0 && <div>Hotel: ₹{formatAmount(exp.hotel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.miscellaneous && exp.miscellaneous.length > 0 && <div>Miscellaneous: ₹{formatAmount(exp.miscellaneous.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                      </>
                    )}
                    {exp.category === 'site' && (
                      <>
                        {exp.siteName && <div>Site: {exp.siteName}</div>}
                        {exp.labour && exp.labour.length > 0 && <div>Labour: ₹{formatAmount(exp.labour.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.travel && exp.travel.length > 0 && <div>Travel: ₹{formatAmount(exp.travel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.tools && exp.tools.length > 0 && <div>Tools: ₹{formatAmount(exp.tools.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.consumables && exp.consumables.length > 0 && <div>Consumables: ₹{formatAmount(exp.consumables.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.stay && exp.stay.length > 0 && <div>Stay: ₹{formatAmount(exp.stay.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.transportOfMaterial && exp.transportOfMaterial.length > 0 && <div>Transport of Material: ₹{formatAmount(exp.transportOfMaterial.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.localCommute && exp.localCommute.length > 0 && <div>Local Commute: ₹{formatAmount(exp.localCommute.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                        {exp.miscellaneous && exp.miscellaneous.length > 0 && <div>Miscellaneous: ₹{formatAmount(exp.miscellaneous.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                      </>
                    )}
                    {(!exp.category || exp.category === '') && exp.others && exp.others.length > 0 && (
                      <>
                        {exp.others.map((other: any, idx: number) => (
                          <div key={idx}>{other.label || `Other ${idx + 1}`}: ₹{formatAmount(other.amount)}</div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Documents and Actions */}
                <div className="space-y-4">
                  {/* Documents */}
                  {(exp.file || (exp.billImages && exp.billImages.length > 0)) && (
                    <div>
                      <h5 className="font-semibold mb-3" style={{ color: 'var(--primary)' }}>Uploaded Documents</h5>
                      <div className="space-y-3">
                        {exp.file && (
                          <div>
                            <strong>Main Document:</strong>
                            {isImageUrl(exp.file) ? (
                              <div className="mt-2">
                                <a href={exp.file} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={exp.file} 
                                    alt="Expense proof" 
                                    className="max-w-full h-auto rounded max-h-40 object-contain border cursor-pointer hover:shadow-lg transition-shadow" 
                                    style={{ border: '1px solid var(--muted)' }} 
                                  />
                                </a>
                              </div>
                            ) : (
                              <div className="mt-2">
                                <a 
                                  href={exp.file} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-block px-3 py-2 rounded border hover:shadow-lg transition-shadow"
                                  style={{ background: 'var(--accent)', color: 'var(--surface)' }}
                                >
                                  📄 View Document
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                        {exp.billImages && exp.billImages.length > 0 && (
                          <div>
                            <strong>Bill Images:</strong>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {exp.billImages.map((url: string, idx: number) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={url} 
                                    alt={`Bill proof ${idx + 1}`} 
                                    className="w-20 h-20 object-cover rounded border cursor-pointer hover:w-24 hover:h-24 transition-all duration-200" 
                                    style={{ border: '1px solid var(--muted)' }} 
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Review Actions */}
                  <div className="space-y-4 p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                    <h5 className="font-semibold" style={{ color: 'var(--primary)' }}>Review Actions</h5>
                    
                    {/* Comment Input */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Comment</label>
                      <RemarksInput
                        expenseId={exp.id}
                        initialValue={exp.remarks || ''}
                        placeholder="Add your comments about this expense..."
                        onSave={handleRemarksChange}
                        rows={3}
                        minHeight="80px"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        💡 Click the ✓ button to save your comment
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => {
                          handleStatusChange(exp.id, 'Approve');
                        }}
                        className="flex-1 py-3 font-semibold"
                        style={{ background: '#22c55e', color: '#ffffff' }}
                      >
                        ✅ Approve
                      </Button>
                      <Button 
                        onClick={() => {
                          handleStatusChange(exp.id, 'Reject');
                        }}
                        className="flex-1 py-3 font-semibold"
                        style={{ background: '#ef4444', color: '#ffffff' }}
                      >
                        ❌ Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {expenses.filter(exp => exp.status === 'Under Review' || !exp.status).length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">🎉 No expenses pending review!</p>
              <p className="text-sm text-gray-400 mt-2">All submitted expenses have been reviewed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Component for Approve View - Shows approved expenses awaiting final confirmation
  const ApproveComponent = () => {
    const approvedExpenses = expenses.filter(exp => exp.status === 'Approve' && !exp.finalApproval);
    
    const handleFinalApprove = async (expenseId: string) => {
      try {
        const now = new Date().toLocaleString();
        const finalApprovedBy = {
          name: user?.displayName || user?.email || 'Unknown Admin',
          email: user?.email || 'unknown@admin.com',
          timestamp: now
        };
        
        await updateDoc(doc(db, 'expenses', expenseId), { 
          finalApproval: true,
          finalApprovedBy,
          finalApprovalTimestamp: now,
          status: 'Final Approved' // This will move it to accounts
        });
        
        fetchExpenses();
      } catch (error) {
        console.error('Error in final approval:', error);
      }
    };
    
    const handleRejectFromApprove = async (expenseId: string) => {
      try {
        const now = new Date().toLocaleString();
        const rejectedBy = {
          name: user?.displayName || user?.email || 'Unknown Admin',
          email: user?.email || 'unknown@admin.com',
          timestamp: now
        };
        
        await updateDoc(doc(db, 'expenses', expenseId), { 
          status: 'Under Review', // Move back to review
          finalApproval: false,
          rejectedBy,
          rejectionTimestamp: now
        });
        
        fetchExpenses();
      } catch (error) {
        console.error('Error rejecting expense:', error);
      }
    };
    
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>Approval Confirmation</h3>
        <div className="p-6 rounded-lg" style={{ background: 'var(--accent-light)' }}>
          <p className="text-center text-lg mb-6" style={{ color: 'var(--foreground)' }}>
            ✅ Review approved expenses and provide final confirmation before sending to accounts
          </p>
          
          {approvedExpenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">📋 No expenses awaiting final approval!</p>
              <p className="text-sm text-gray-400 mt-2">Expenses will appear here after initial approval in the Review section.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {approvedExpenses.map(exp => (
                <div key={exp.id} className="p-6 rounded-lg shadow-md" style={{ background: 'var(--surface)', border: '1px solid var(--muted)' }}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Employee & Basic Info */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-lg" style={{ color: 'var(--primary)' }}>{exp.user?.name || 'Unknown'}</h4>
                        <p className="text-sm text-gray-500">{exp.user?.department || 'No Department'}</p>
                        <p className="text-xs text-gray-400">{exp.user?.email}</p>
                      </div>
                      
                      <div className="p-3 rounded" style={{ background: '#22c55e', color: '#ffffff' }}>
                        <div className="font-semibold text-center text-sm">✅ INITIALLY APPROVED</div>
                        {exp.actionBy && (
                          <div className="text-xs text-center mt-1 opacity-90">
                            by {exp.actionBy.name}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div><strong>Date:</strong> {exp.date}</div>
                        <div><strong>Category:</strong> {exp.category || 'Not specified'}</div>
                        <div><strong>Purpose:</strong> {exp.purpose || 'Not specified'}</div>
                        <div><strong>Submitted:</strong> {exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleDateString() : 'Unknown'}</div>
                        {exp.location && exp.location.address && (
                          <div><strong>Location:</strong> 📍 {exp.location.address}</div>
                        )}
                      </div>
                    </div>

                    {/* Expense Details & Amount */}
                    <div className="space-y-3">
                      <div className="text-center p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                        <div className="font-bold text-2xl" style={{ color: 'var(--primary)' }}>₹{formatAmount(exp.total)}</div>
                        <div className="text-sm text-gray-500 mt-1">Total Amount</div>
                      </div>
                      
                      {/* Expense Breakdown */}
                      <div className="space-y-2 p-3 rounded text-sm" style={{ background: 'var(--accent-light)' }}>
                        <h5 className="font-semibold">Expense Breakdown:</h5>
                        {exp.category === 'personal' && (
                          <>
                            {exp.food && exp.food.length > 0 && <div>• Food: ₹{formatAmount(exp.food.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.fuel && exp.fuel.length > 0 && <div>• Fuel: ₹{formatAmount(exp.fuel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.travel && exp.travel.length > 0 && <div>• Travel: ₹{formatAmount(exp.travel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.entertainment && exp.entertainment.length > 0 && <div>• Entertainment: ₹{formatAmount(exp.entertainment.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.utility && exp.utility.length > 0 && <div>• Utility: ₹{formatAmount(exp.utility.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.home && exp.home.length > 0 && <div>• Home: ₹{formatAmount(exp.home.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.grocery && exp.grocery.length > 0 && <div>• Grocery: ₹{formatAmount(exp.grocery.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.miscellaneous && exp.miscellaneous.length > 0 && <div>• Miscellaneous: ₹{formatAmount(exp.miscellaneous.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                          </>
                        )}
                        {exp.category === 'official' && (
                          <>
                            {exp.food && exp.food.length > 0 && <div>• Food: ₹{formatAmount(exp.food.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.fuel && exp.fuel.length > 0 && <div>• Fuel: ₹{formatAmount(exp.fuel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.transport && exp.transport.length > 0 && <div>• Transport: ₹{formatAmount(exp.transport.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.hotel && exp.hotel.length > 0 && <div>• Hotel: ₹{formatAmount(exp.hotel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.miscellaneous && exp.miscellaneous.length > 0 && <div>• Miscellaneous: ₹{formatAmount(exp.miscellaneous.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                          </>
                        )}
                        {exp.category === 'site' && (
                          <>
                            {exp.siteName && <div>• Site: {exp.siteName}</div>}
                            {exp.labour && exp.labour.length > 0 && <div>• Labour: ₹{formatAmount(exp.labour.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.travel && exp.travel.length > 0 && <div>• Travel: ₹{formatAmount(exp.travel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.tools && exp.tools.length > 0 && <div>• Tools: ₹{formatAmount(exp.tools.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.consumables && exp.consumables.length > 0 && <div>• Consumables: ₹{formatAmount(exp.consumables.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.stay && exp.stay.length > 0 && <div>• Stay: ₹{formatAmount(exp.stay.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.transportOfMaterial && exp.transportOfMaterial.length > 0 && <div>• Transport of Material: ₹{formatAmount(exp.transportOfMaterial.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.localCommute && exp.localCommute.length > 0 && <div>• Local Commute: ₹{formatAmount(exp.localCommute.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                            {exp.miscellaneous && exp.miscellaneous.length > 0 && <div>• Miscellaneous: ₹{formatAmount(exp.miscellaneous.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</div>}
                          </>
                        )}
                      </div>

                      {/* Previous Comments */}
                      {exp.remarks && (
                        <div>
                          <h6 className="font-semibold text-sm mb-2">Previous Comments:</h6>
                          <div className="p-3 rounded text-sm" style={{ background: 'var(--accent-light)' }}>
                            {exp.remarks}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Documents & Final Actions */}
                    <div className="space-y-4">
                      {/* Documents */}
                      {(exp.file || (exp.billImages && exp.billImages.length > 0)) && (
                        <div>
                          <h5 className="font-semibold mb-3" style={{ color: 'var(--primary)' }}>Uploaded Documents</h5>
                          <div className="space-y-3">
                            {exp.file && (
                              <div>
                                <strong>Main Document:</strong>
                                {isImageUrl(exp.file) ? (
                                  <div className="mt-2">
                                    <a href={exp.file} target="_blank" rel="noopener noreferrer">
                                      <img 
                                        src={exp.file} 
                                        alt="Expense proof" 
                                        className="max-w-full h-auto rounded max-h-32 object-contain border cursor-pointer hover:shadow-lg transition-shadow" 
                                        style={{ border: '1px solid var(--muted)' }} 
                                      />
                                    </a>
                                  </div>
                                ) : (
                                  <div className="mt-2">
                                    <a 
                                      href={exp.file} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-block px-3 py-2 rounded border hover:shadow-lg transition-shadow text-sm"
                                      style={{ background: 'var(--accent)', color: 'var(--surface)' }}
                                    >
                                      � View Document
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                            {exp.billImages && exp.billImages.length > 0 && (
                              <div>
                                <strong>Bill Images:</strong>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {exp.billImages.map((url: string, idx: number) => (
                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                      <img 
                                        src={url} 
                                        alt={`Bill ${idx + 1}`} 
                                        className="w-16 h-16 object-cover rounded border cursor-pointer hover:w-20 hover:h-20 transition-all duration-200" 
                                        style={{ border: '1px solid var(--muted)' }} 
                                      />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Final Approval Actions */}
                      <div className="space-y-4 p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                        <h5 className="font-semibold" style={{ color: 'var(--primary)' }}>Final Approval Decision</h5>
                        
                        {/* Additional Comment */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Final Comment (Optional)</label>
                          <RemarksInput
                            expenseId={exp.id}
                            initialValue={exp.remarks || ''}
                            placeholder="Add final approval comments..."
                            onSave={handleRemarksChange}
                            rows={2}
                            minHeight="60px"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            💡 Click the ✓ button to save your comment
                          </div>
                        </div>

                        {/* Final Action Buttons */}
                        <div className="flex gap-3">
                          <Button 
                            onClick={() => {
                              handleFinalApprove(exp.id);
                            }}
                            className="flex-1 py-3 font-semibold"
                            style={{ background: '#22c55e', color: '#ffffff' }}
                          >
                            ✅ Send to Accounts
                          </Button>
                          <Button 
                            onClick={() => {
                              handleRejectFromApprove(exp.id);
                            }}
                            className="flex-1 py-3 font-semibold"
                            style={{ background: '#ef4444', color: '#ffffff' }}
                          >
                            ❌ Send Back to Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Component for Accounts View - Shows expenses that have been finally approved
  const AccountsComponent = () => {
    const finalApprovedExpenses = expenses.filter(exp => exp.status === 'Final Approved' || exp.finalApproval === true);
    const pendingPaymentExpenses = finalApprovedExpenses.filter(exp => (Number(exp.paid) || 0) < (exp.total || 0));
    const fullyPaidExpenses = finalApprovedExpenses.filter(exp => (Number(exp.paid) || 0) >= (exp.total || 0));
    
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>Accounts & Payments</h3>
        
        {/* Pending Payments Section */}
        <div className="p-6 rounded-lg" style={{ background: 'var(--accent-light)' }}>
          <p className="text-center text-lg mb-6" style={{ color: 'var(--foreground)' }}>
            💰 Final approved expenses ready for payment processing
          </p>
          
          {finalApprovedExpenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">💰 No expenses in accounts yet!</p>
              <p className="text-sm text-gray-400 mt-2">Expenses will appear here after final approval confirmation.</p>
            </div>
          ) : pendingPaymentExpenses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">✅ All approved expenses have been paid!</p>
              <p className="text-sm text-gray-400 mt-2">Check the completed payments table below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Payment Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg" style={{ color: 'var(--primary)' }}>
                  🔄 Pending Payment ({pendingPaymentExpenses.length})
                </h4>
                
                {pendingPaymentExpenses.length === 0 ? (
                  <div className="text-center py-8 rounded" style={{ background: 'var(--surface)' }}>
                    <p className="text-gray-500">✅ All approved expenses have been paid!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingPaymentExpenses.map(exp => (
                      <div key={exp.id} className="p-4 rounded-lg shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--muted)' }}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-semibold" style={{ color: 'var(--primary)' }}>{exp.user?.name || 'Unknown'}</h5>
                              <p className="text-sm text-gray-500">{exp.user?.department || 'No Department'}</p>
                              <p className="text-xs text-gray-400">{exp.user?.email}</p>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg" style={{ color: 'var(--primary)' }}>₹{formatAmount(exp.total)}</div>
                              <div className="text-xs text-gray-500">{exp.date}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><strong>Purpose:</strong> {exp.purpose || 'Not specified'}</div>
                            <div><strong>Category:</strong> {exp.category || 'Not specified'}</div>
                          </div>
                          
                          {/* Payment Status */}
                          <div className="p-3 rounded" style={{ background: 'var(--accent-light)' }}>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <div className="text-xs text-gray-500">Total</div>
                                <div className="font-semibold">₹{formatAmount(exp.total)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Paid</div>
                                <div className="font-semibold" style={{ color: '#22c55e' }}>₹{formatAmount(exp.paid)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500">Balance</div>
                                <div className="font-semibold" style={{ color: '#ef4444' }}>
                                  ₹{formatAmount((exp.total || 0) - (Number(exp.paid) || 0))}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Final Approval Info */}
                          {exp.finalApprovedBy && (
                            <div className="text-xs p-2 rounded" style={{ background: '#22c55e', color: '#ffffff' }}>
                              <div className="font-semibold">✅ ACCOUNTS APPROVED</div>
                              <div className="opacity-90">by {exp.finalApprovedBy.name} on {exp.finalApprovedBy.timestamp}</div>
                            </div>
                          )}
                          
                          {/* Previous Comments Display */}
                          {exp.remarks && (
                            <div className="p-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--muted)' }}>
                              <h6 className="font-semibold text-sm mb-2" style={{ color: 'var(--primary)' }}>📝 Previous Comments</h6>
                              <div className="text-sm" style={{ color: 'var(--foreground)' }}>
                                {exp.remarks}
                              </div>
                            </div>
                          )}
                          
                          {/* Comments Section */}
                          <div className="space-y-3 p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                            <h6 className="font-semibold text-sm" style={{ color: 'var(--primary)' }}>💬 Add Payment Comments</h6>
                            <RemarksInput
                              expenseId={exp.id}
                              initialValue={exp.remarks || ''}
                              placeholder="Add payment comments, processing notes, or payment method details..."
                              onSave={handleRemarksChange}
                              rows={3}
                              minHeight="80px"
                            />
                            <div className="text-xs text-gray-500">
                              💡 Click the ✓ button to save your payment comments
                            </div>
                          </div>
                          
                          {/* Payment Actions */}
                          {!exp.locked && (
                            <div className="flex gap-2 w-full">
                              <Input
                              type="number"
                              value={paidDraft[exp.id] !== undefined ? paidDraft[exp.id] : (exp.paid || '')}
                              onChange={e => handlePaidDraftChange(exp.id, e.target.value)}
                              placeholder="Payment amount"
                              className="flex-1 min-w-[120px] px-4 py-2"
                              min="0"
                              max={exp.total}
                              style={{ width: '100%' }}
                              />
                              <Button 
                              onClick={() => handlePaidSave(exp.id, exp.total)} 
                              className="px-6"
                              style={{ background: 'var(--primary)', color: 'var(--surface)' }}
                              >
                              💳 Pay
                              </Button>
                            </div>
                          )}
                          
                          {/* Quick Actions */}
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handlePreview(exp)} 
                              className="flex-1 text-sm"
                              style={{ background: 'var(--accent)', color: 'var(--surface)' }}
                            >
                              👁️ View Details
                            </Button>
                            {!exp.locked && (
                              <Button 
                                onClick={() => handleCloseExpense(exp.id)} 
                                className="px-4 text-sm"
                                style={{ background: '#6b7280', color: 'var(--surface)' }}
                              >
                                🔐 Close
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Payments & Summary Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg" style={{ color: 'var(--primary)' }}>
                  📊 Payment Summary & Completed
                </h4>
                
                {/* Summary Statistics */}
                <div className="p-4 rounded-lg shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--muted)' }}>
                  <h5 className="font-semibold mb-3" style={{ color: 'var(--primary)' }}>Financial Overview</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total in Accounts:</span>
                      <span className="font-bold">₹{formatAmount(finalApprovedExpenses.reduce((sum, e) => sum + (e.total || 0), 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Paid:</span>
                      <span className="font-bold" style={{ color: '#22c55e' }}>₹{formatAmount(finalApprovedExpenses.reduce((sum, e) => sum + (Number(e.paid) || 0), 0))}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2" style={{ borderColor: 'var(--muted)' }}>
                      <span>Outstanding Balance:</span>
                      <span className="font-bold" style={{ color: '#ef4444' }}>
                        ₹{formatAmount(finalApprovedExpenses.reduce((sum, e) => sum + (e.total || 0), 0) - finalApprovedExpenses.reduce((sum, e) => sum + (Number(e.paid) || 0), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Items:</span>
                      <span className="font-bold">{pendingPaymentExpenses.length} expenses</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Items:</span>
                      <span className="font-bold" style={{ color: '#22c55e' }}>{fullyPaidExpenses.length} expenses</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
        
        {/* Completed Payments Table - Outside the main payment processing box */}
        {fullyPaidExpenses.length > 0 && (
          <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', border: '1px solid var(--muted)' }}>
            <h4 className="font-semibold text-xl mb-4" style={{ color: '#22c55e' }}>
              ✅ Completed Payments ({fullyPaidExpenses.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--muted)' }}>
                    <th className="text-left p-3 font-semibold" style={{ color: 'var(--primary)' }}>Employee</th>
                    <th className="text-left p-3 font-semibold" style={{ color: 'var(--primary)' }}>Date</th>
                    <th className="text-left p-3 font-semibold" style={{ color: 'var(--primary)' }}>Purpose</th>
                    <th className="text-right p-3 font-semibold" style={{ color: 'var(--primary)' }}>Total</th>
                    <th className="text-right p-3 font-semibold" style={{ color: 'var(--primary)' }}>Paid</th>
                    <th className="text-center p-3 font-semibold" style={{ color: 'var(--primary)' }}>Payment Date</th>
                    <th className="text-center p-3 font-semibold" style={{ color: 'var(--primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fullyPaidExpenses.map((exp, idx) => (
                    <tr key={exp.id} style={{ 
                      borderBottom: '1px solid var(--muted)',
                      background: idx % 2 === 0 ? 'var(--surface)' : 'var(--accent-light)'
                    }}>
                      <td className="p-3">
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--primary)' }}>{exp.user?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-500">{exp.user?.department}</div>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{exp.date}</td>
                      <td className="p-3 text-sm">{exp.purpose || 'Not specified'}</td>
                      <td className="p-3 text-right font-semibold">₹{formatAmount(exp.total)}</td>
                      <td className="p-3 text-right font-semibold" style={{ color: '#22c55e' }}>₹{formatAmount(exp.paid)}</td>
                      <td className="p-3 text-center text-sm">
                        {exp.paidDate ? (
                          <span className="text-sm">{exp.paidDate}</span>
                        ) : (
                          <span className="text-xs text-gray-500">Not recorded</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button 
                          onClick={() => handlePreview(exp)} 
                          className="text-xs px-3 py-1"
                          style={{ background: 'var(--accent)', color: 'var(--surface)' }}
                        >
                          👁️ View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Component for Access Control
  const AccessControlComponent = () => {
    const [showAddForm, setShowAddForm] = React.useState(false);
    const [newUser, setNewUser] = React.useState({
      name: '',
      email: '',
      number: '',
      designation: '',
      department: '',
      employeeManager: '',
      accessRights: 'entry',
      areaOfRights: {
        review: false,
        approve: false,
        accounts: false
      }
    });

    const handleAccessRightsChange = (userId: string, accessRight: string) => {
      setAccessControlUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, accessRights: accessRight } : user
        )
      );
    };

    const handleAreaRightsChange = (userId: string, area: string, checked: boolean) => {
      setAccessControlUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, areaOfRights: { ...user.areaOfRights, [area]: checked } } 
            : user
        )
      );
    };

    const handleAddUser = async () => {
      if (!newUser.name || !newUser.email) {
        alert('Please fill in at least Name and Email fields');
        return;
      }

      try {
        // Check if user email already exists
        const existingUser = accessControlUsers.find(u => u.email === newUser.email);
        if (existingUser) {
          alert('A user with this email already exists in access control!');
          return;
        }

        // Add to Firebase
        const docRef = await addDoc(collection(db, 'accessControl'), {
          ...newUser,
          createdAt: new Date().toISOString(),
          createdBy: user?.email || 'Unknown'
        });

        const userToAdd = {
          ...newUser,
          id: docRef.id
        };

        setAccessControlUsers(prev => [...prev, userToAdd]);
        
        // Reset form
        setNewUser({
          name: '',
          email: '',
          number: '',
          designation: '',
          department: '',
          employeeManager: '',
          accessRights: 'entry',
          areaOfRights: {
            review: false,
            approve: false,
            accounts: false
          }
        });
        setShowAddForm(false);
        
        alert('User added successfully!');
      } catch (error) {
        console.error('Error adding user:', error);
        alert('Failed to add user. Please try again.');
      }
    };

    const handleDeleteUser = async (userId: string) => {
      if (confirm('Are you sure you want to remove this user from access control?')) {
        try {
          await deleteDoc(doc(db, 'accessControl', userId));
          setAccessControlUsers(prev => prev.filter(user => user.id !== userId));
          alert('User removed successfully!');
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('Failed to remove user. Please try again.');
        }
      }
    };

    const handleUpdateAccessRights = async (userId: string, accessRight: string) => {
      try {
        await updateDoc(doc(db, 'accessControl', userId), { accessRights: accessRight });
        handleAccessRightsChange(userId, accessRight);
      } catch (error) {
        console.error('Error updating access rights:', error);
        alert('Failed to update access rights.');
      }
    };

    const handleUpdateAreaRights = async (userId: string, area: string, checked: boolean) => {
      try {
        const user = accessControlUsers.find(u => u.id === userId);
        if (user) {
          const updatedAreaRights = { ...user.areaOfRights, [area]: checked };
          await updateDoc(doc(db, 'accessControl', userId), { areaOfRights: updatedAreaRights });
          handleAreaRightsChange(userId, area, checked);
        }
      } catch (error) {
        console.error('Error updating area rights:', error);
        alert('Failed to update area rights.');
      }
    };

    // Initialize with some sample data if empty
    React.useEffect(() => {
      if (accessControlUsers.length === 0) {
        setAccessControlUsers([
          {
            id: '1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            number: '+91 9876543210',
            designation: 'Manager',
            department: 'Sales',
            employeeManager: 'Jane Smith',
            accessRights: 'admin',
            areaOfRights: {
              review: true,
              approve: true,
              accounts: true
            }
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@example.com',
            number: '+91 9876543211',
            designation: 'Accountant',
            department: 'Accounts',
            employeeManager: 'John Doe',
            accessRights: 'entry',
            areaOfRights: {
              review: false,
              approve: false,
              accounts: true
            }
          }
        ]);
      }
    }, []);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>Access Control Management</h3>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-2 font-semibold"
            style={{ background: 'var(--primary)', color: 'var(--surface)' }}
          >
            {showAddForm ? '✕ Cancel' : '➕ Add New User'}
          </Button>
        </div>

        {/* Add New User Form */}
        {showAddForm && (
          <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', border: '2px solid var(--primary)' }}>
            <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary)' }}>Add New User</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter full name"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Email ID <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@example.com"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                />
              </div>

              {/* Number */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Phone Number
                </label>
                <Input
                  type="text"
                  value={newUser.number}
                  onChange={(e) => setNewUser({ ...newUser, number: e.target.value })}
                  placeholder="+91 9876543210"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                />
              </div>

              {/* Designation */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Designation
                </label>
                <Input
                  type="text"
                  value={newUser.designation}
                  onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
                  placeholder="e.g., Manager, Accountant"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Department
                </label>
                <select
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                >
                  <option value="">Select Department</option>
                  <option value="sales">Sales</option>
                  <option value="hr">HR</option>
                  <option value="marketing">Marketing</option>
                  <option value="admin">Admin</option>
                  <option value="site execution">Site Execution</option>
                  <option value="IT">IT</option>
                  <option value="accounts">Accounts</option>
                  <option value="production">Production</option>
                </select>
              </div>

              {/* Employee Manager */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Employee Manager
                </label>
                <Input
                  type="text"
                  value={newUser.employeeManager}
                  onChange={(e) => setNewUser({ ...newUser, employeeManager: e.target.value })}
                  placeholder="Manager's name"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                />
              </div>

              {/* Access Rights */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Access Rights
                </label>
                <select
                  value={newUser.accessRights}
                  onChange={(e) => setNewUser({ ...newUser, accessRights: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
                >
                  <option value="admin">Admin</option>
                  <option value="entry">Entry</option>
                </select>
              </div>

              {/* Area of Rights - Only shown when access is admin */}
              {newUser.accessRights === 'admin' && (
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                    Area of Rights
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUser.areaOfRights.review}
                        onChange={(e) => setNewUser({
                          ...newUser,
                          areaOfRights: { ...newUser.areaOfRights, review: e.target.checked }
                        })}
                        className="w-4 h-4"
                      />
                      <span>Review</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUser.areaOfRights.approve}
                        onChange={(e) => setNewUser({
                          ...newUser,
                          areaOfRights: { ...newUser.areaOfRights, approve: e.target.checked }
                        })}
                        className="w-4 h-4"
                      />
                      <span>Approve</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUser.areaOfRights.accounts}
                        onChange={(e) => setNewUser({
                          ...newUser,
                          areaOfRights: { ...newUser.areaOfRights, accounts: e.target.checked }
                        })}
                        className="w-4 h-4"
                      />
                      <span>Accounts</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => setShowAddForm(false)}
                style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                style={{ background: 'var(--primary)', color: 'var(--surface)' }}
              >
                ➕ Add User
              </Button>
            </div>
          </div>
        )}

        <div className="p-6 rounded-lg" style={{ background: 'var(--accent-light)' }}>
          <div className="mb-6">
            <p className="text-center text-lg mb-4" style={{ color: 'var(--foreground)' }}>
              🔐 Manage user access rights and permissions for different areas of the application
            </p>
            
            {/* Access Level Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-lg" style={{ background: 'var(--surface)', border: '2px solid #22c55e' }}>
                <h5 className="font-semibold mb-2" style={{ color: '#22c55e' }}>👑 Admin Access</h5>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  Full access to the Admin Dashboard including all sections (Dashboard, Review, Approve, Accounts, and Access Control). 
                  Can manage expenses, approve/reject submissions, process payments, and configure user permissions.
                </p>
                <p className="text-xs mt-2 italic" style={{ color: 'var(--muted-foreground)' }}>
                  Same permissions as ADMIN_EMAILS list
                </p>
              </div>
              
              <div className="p-4 rounded-lg" style={{ background: 'var(--surface)', border: '2px solid #3b82f6' }}>
                <h5 className="font-semibold mb-2" style={{ color: '#3b82f6' }}>👤 Entry Access</h5>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  Limited to employee functions only. Can submit expenses, view their own submissions, and track expense status. 
                  Cannot access admin dashboard or approve/review other users' expenses.
                </p>
                <p className="text-xs mt-2 italic" style={{ color: 'var(--muted-foreground)' }}>
                  Standard employee access (unless specific area rights are granted)
                </p>
              </div>
            </div>
            
            {/* Important Note */}
            <div className="mt-4 p-4 rounded-lg" style={{ background: '#fef3c7', border: '2px solid #f59e0b' }}>
              <div className="flex gap-3">
                <span style={{ fontSize: '24px' }}>💡</span>
                <div>
                  <h6 className="font-semibold mb-2" style={{ color: '#92400e' }}>Important Notes:</h6>
                  <ul className="text-sm space-y-1" style={{ color: '#92400e' }}>
                    <li>• <strong>Default Admins</strong> (marked with ⭐): Users in ADMIN_EMAILS list have permanent admin access and cannot be modified.</li>
                    <li>• <strong>Custom Admin Users</strong>: Users added here with "Admin" access get the same permissions as default admins.</li>
                    <li>• <strong>Area Rights</strong>: For "Entry" users, you can grant specific permissions to Review, Approve, or Accounts sections.</li>
                    <li>• <strong>Security</strong>: Only add trusted users to the Access Control system. Admin users have full control over the application.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--muted)' }}>
                  <th className="p-3 text-left font-semibold" style={{ color: 'var(--primary)' }}>Name</th>
                  <th className="p-3 text-left font-semibold" style={{ color: 'var(--primary)' }}>Email ID</th>
                  <th className="p-3 text-left font-semibold" style={{ color: 'var(--primary)' }}>Number</th>
                  <th className="p-3 text-left font-semibold" style={{ color: 'var(--primary)' }}>Designation</th>
                  <th className="p-3 text-left font-semibold" style={{ color: 'var(--primary)' }}>Department</th>
                  <th className="p-3 text-left font-semibold" style={{ color: 'var(--primary)' }}>Employee Manager</th>
                  <th className="p-3 text-center font-semibold" style={{ color: 'var(--primary)' }}>Access Rights</th>
                  <th className="p-3 text-center font-semibold" style={{ color: 'var(--primary)' }} colSpan={3}>Area of Rights</th>
                  <th className="p-3 text-center font-semibold" style={{ color: 'var(--primary)' }}>Actions</th>
                </tr>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--muted)' }}>
                  <th colSpan={7}></th>
                  <th className="p-2 text-center text-xs font-medium" style={{ color: 'var(--primary)' }}>Review</th>
                  <th className="p-2 text-center text-xs font-medium" style={{ color: 'var(--primary)' }}>Approve</th>
                  <th className="p-2 text-center text-xs font-medium" style={{ color: 'var(--primary)' }}>Accounts</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {accessControlUsers.map((user, idx) => (
                  <tr 
                    key={user.id}
                    style={{ 
                      background: idx % 2 === 0 ? 'var(--surface)' : 'var(--accent-light)',
                      borderBottom: '1px solid var(--muted)'
                    }}
                  >
                    <td className="p-3" style={{ color: 'var(--foreground)' }}>
                      <div className="flex items-center gap-2">
                        {user.name}
                        {ADMIN_EMAILS.includes(user.email) && (
                          <span className="text-xs px-2 py-1 rounded" style={{ background: '#f59e0b', color: '#ffffff' }} title="Default Admin User">
                            ⭐
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3" style={{ color: 'var(--foreground)' }}>{user.email}</td>
                    <td className="p-3" style={{ color: 'var(--foreground)' }}>{user.number}</td>
                    <td className="p-3" style={{ color: 'var(--foreground)' }}>{user.designation}</td>
                    <td className="p-3" style={{ color: 'var(--foreground)' }}>{user.department}</td>
                    <td className="p-3" style={{ color: 'var(--foreground)' }}>{user.employeeManager}</td>
                    <td className="p-3 text-center">
                      <select
                        value={user.accessRights}
                        onChange={(e) => handleUpdateAccessRights(user.id, e.target.value)}
                        className="px-3 py-1 border rounded text-sm font-semibold"
                        style={{ 
                          background: user.accessRights === 'admin' ? '#22c55e' : '#3b82f6', 
                          color: '#ffffff', 
                          borderColor: 'var(--muted)' 
                        }}
                      >
                        <option value="admin">👑 Admin</option>
                        <option value="entry">👤 Entry</option>
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={user.areaOfRights.review}
                        onChange={(e) => handleUpdateAreaRights(user.id, 'review', e.target.checked)}
                        disabled={user.accessRights === 'admin'}
                        className="w-4 h-4 cursor-pointer disabled:opacity-50"
                        title={user.accessRights === 'admin' ? 'Admin has access to all areas' : ''}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={user.areaOfRights.approve}
                        onChange={(e) => handleUpdateAreaRights(user.id, 'approve', e.target.checked)}
                        disabled={user.accessRights === 'admin'}
                        className="w-4 h-4 cursor-pointer disabled:opacity-50"
                        title={user.accessRights === 'admin' ? 'Admin has access to all areas' : ''}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={user.areaOfRights.accounts}
                        onChange={(e) => handleUpdateAreaRights(user.id, 'accounts', e.target.checked)}
                        disabled={user.accessRights === 'admin'}
                        className="w-4 h-4 cursor-pointer disabled:opacity-50"
                        title={user.accessRights === 'admin' ? 'Admin has access to all areas' : ''}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-3 py-1 text-xs"
                        style={{ background: '#ef4444', color: '#ffffff' }}
                      >
                        🗑️ Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {accessControlUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg text-gray-500">👥 No users configured yet!</p>
              <p className="text-sm text-gray-400 mt-2">Add users to manage their access rights.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main Dashboard Component (existing content)
  const DashboardComponent = () => (
    <>
      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Month Spend */}
        <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', borderLeft: '6px solid #3b82f6' }}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Spend This Month</h3>
          <p className="text-3xl font-bold mb-1" style={{ color: '#3b82f6' }}>₹{formatAmount(totalMonthSpend)}</p>
          <p className="text-xs text-gray-400">Monthly expenditure</p>
        </div>
        
        {/* Total Employees */}
        <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', borderLeft: '6px solid #10b981' }}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Employees</h3>
          <p className="text-3xl font-bold mb-1" style={{ color: '#10b981' }}>{totalEmployees}</p>
          <p className="text-xs text-gray-400">Submitted expenses</p>
        </div>
        
        {/* Max Spending Category */}
        <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', borderLeft: '6px solid #f59e0b' }}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Highest Spending</h3>
          <p className="text-lg font-semibold mb-1" style={{ color: '#f59e0b' }}>{maxCategory[0]}</p>
          <p className="text-sm text-gray-500">₹{formatAmount(maxCategory[1])}</p>
        </div>
        
        {/* Min Spending Category */}
        <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', borderLeft: '6px solid #8b5cf6' }}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Lowest Spending</h3>
          <p className="text-lg font-semibold mb-1" style={{ color: '#8b5cf6' }}>{minCategory[0]}</p>
          <p className="text-sm text-gray-500">₹{formatAmount(minCategory[1])}</p>
        </div>
      </div>

      {/* Status Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Approved Expenses */}
        <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', borderLeft: '6px solid #22c55e' }}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Approved Expenses</h3>
          <p className="text-3xl font-bold mb-1" style={{ color: '#22c55e' }}>{totalApproved}</p>
          <p className="text-xs text-gray-400">Ready for payment</p>
        </div>
        
        {/* Under Review */}
        <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', borderLeft: '6px solid #eab308' }}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Under Review</h3>
          <p className="text-3xl font-bold mb-1" style={{ color: '#eab308' }}>{totalUnderReview}</p>
          <p className="text-xs text-gray-400">Pending approval</p>
        </div>
        
        {/* Rejected Expenses */}
        <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', borderLeft: '6px solid #ef4444' }}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Rejected Expenses</h3>
          <p className="text-3xl font-bold mb-1" style={{ color: '#ef4444' }}>{totalRejected}</p>
          <p className="text-xs text-gray-400">Need revision</p>
        </div>
        
        {/* Closed Expenses */}
        <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', borderLeft: '6px solid #6b7280' }}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Closed Expenses</h3>
          <p className="text-3xl font-bold mb-1" style={{ color: '#6b7280' }}>{totalClosed}</p>
          <p className="text-xs text-gray-400">Completed transactions</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="max-w-full mx-auto p-6 space-y-8">
      <Card className="p-8">
      {/* Admin Summary Statistics */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--primary)' }}>Admin Dashboard Overview</h2>
        
        {/* Navigation Buttons */}
        <div className="flex gap-4 mb-6">
          <Button 
            onClick={() => setActiveView('dashboard')} 
            className="px-6 py-3 font-semibold text-sm rounded-lg transition-all duration-200 hover:shadow-lg"
            style={{ 
              background: activeView === 'dashboard' ? 'var(--primary)' : 'var(--surface)', 
              color: activeView === 'dashboard' ? 'var(--surface)' : 'var(--foreground)',
              border: activeView === 'dashboard' ? 'none' : '2px solid var(--primary)'
            }}
          >
            🏠 Dashboard
          </Button>
          
          {/* Show Review button only if user has review access */}
          {hasAreaAccess(user?.email || '', 'review') && (
            <Button 
              onClick={() => setActiveView('review')} 
              className="px-6 py-3 font-semibold text-sm rounded-lg transition-all duration-200 hover:shadow-lg relative"
              style={{ 
                background: activeView === 'review' ? 'var(--primary)' : 'var(--surface)', 
                color: activeView === 'review' ? 'var(--surface)' : 'var(--foreground)',
                border: activeView === 'review' ? 'none' : '2px solid var(--primary)'
              }}
            >
              📋 Review
              {expenses.filter(exp => exp.status === 'Under Review' || !exp.status).length > 0 && (
                <span 
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold"
                >
                  {expenses.filter(exp => exp.status === 'Under Review' || !exp.status).length}
                </span>
              )}
            </Button>
          )}
          
          {/* Show Approve button only if user has approve access */}
          {hasAreaAccess(user?.email || '', 'approve') && (
            <Button 
              onClick={() => setActiveView('approve')} 
              className="px-6 py-3 font-semibold text-sm rounded-lg transition-all duration-200 hover:shadow-lg relative"
              style={{ 
                background: activeView === 'approve' ? 'var(--primary)' : 'var(--surface)', 
                color: activeView === 'approve' ? 'var(--surface)' : 'var(--foreground)',
                border: activeView === 'approve' ? 'none' : '2px solid var(--primary)'
              }}
            >
              ✅ Approve
              {expenses.filter(exp => exp.status === 'Approve' && !exp.finalApproval).length > 0 && (
                <span 
                  className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold"
                >
                  {expenses.filter(exp => exp.status === 'Approve' && !exp.finalApproval).length}
                </span>
              )}
            </Button>
          )}
          
          {/* Show Accounts button only if user has accounts access */}
          {hasAreaAccess(user?.email || '', 'accounts') && (
            <Button 
              onClick={() => setActiveView('accounts')} 
              className="px-6 py-3 font-semibold text-sm rounded-lg transition-all duration-200 hover:shadow-lg relative"
              style={{ 
                background: activeView === 'accounts' ? 'var(--primary)' : 'var(--surface)', 
                color: activeView === 'accounts' ? 'var(--surface)' : 'var(--foreground)',
                border: activeView === 'accounts' ? 'none' : '2px solid var(--primary)'
              }}
            >
              💰 Accounts
              {expenses.filter(exp => exp.status === 'Final Approved' || exp.finalApproval === true).length > 0 && (
                <span 
                  className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold"
                >
                  {expenses.filter(exp => exp.status === 'Final Approved' || exp.finalApproval === true).length}
                </span>
              )}
            </Button>
          )}
          
          {/* Show Projects button only if user has admin access */}
          {hasAdminAccess(user?.email || '') && (
            <Button 
              onClick={() => setActiveView('projects')} 
              className="px-6 py-3 font-semibold text-sm rounded-lg transition-all duration-200 hover:shadow-lg"
              style={{ 
                background: activeView === 'projects' ? 'var(--primary)' : 'var(--surface)', 
                color: activeView === 'projects' ? 'var(--surface)' : 'var(--foreground)',
                border: activeView === 'projects' ? 'none' : '2px solid var(--primary)'
              }}
            >
              📋 Projects
            </Button>
          )}
          
          {/* Show Access Control button only if user has admin access */}
          {hasAdminAccess(user?.email || '') && (
            <Button 
              onClick={() => setActiveView('access-control')} 
              className="px-6 py-3 font-semibold text-sm rounded-lg transition-all duration-200 hover:shadow-lg"
              style={{ 
                background: activeView === 'access-control' ? 'var(--primary)' : 'var(--surface)', 
                color: activeView === 'access-control' ? 'var(--surface)' : 'var(--foreground)',
                border: activeView === 'access-control' ? 'none' : '2px solid var(--primary)'
              }}
            >
              🔐 Access Control
            </Button>
          )}
        </div>
        
        {/* Conditional Content Based on Active View */}
        {activeView === 'dashboard' && <DashboardComponent />}
        {activeView === 'review' && hasAreaAccess(user?.email || '', 'review') && <ReviewComponent />}
        {activeView === 'approve' && hasAreaAccess(user?.email || '', 'approve') && <ApproveComponent />}
        {activeView === 'accounts' && hasAreaAccess(user?.email || '', 'accounts') && <AccountsComponent />}
        {activeView === 'projects' && hasAdminAccess(user?.email || '') && <ProjectManagement />}
        {activeView === 'access-control' && hasAdminAccess(user?.email || '') && <AccessControlComponent />}
      </div>

      {/* Filters Section - Only show on dashboard */}
      {activeView === 'dashboard' && (
      <div className="mb-8 p-6 rounded-lg shadow-md" style={{ background: 'var(--surface)', border: '1px solid var(--muted)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>Filters & Actions</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>View Mode:</span>
            <button
              onClick={() => setIsExpandedView(!isExpandedView)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200"
              style={{ 
                background: isExpandedView ? 'var(--primary)' : 'var(--surface)', 
                color: isExpandedView ? 'var(--surface)' : 'var(--foreground)',
                borderColor: 'var(--primary)'
              }}
            >
              {isExpandedView ? (
                <>
                  📊 Expanded View
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              ) : (
                <>
                  📋 Compact View
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Filter by Month</label>
            <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} label="" />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Filter by Department</label>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="px-3 py-2 border rounded min-h-[42px]"
              style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
            >
              <option value="">All Departments</option>
              <option value="sales">Sales</option>
              <option value="hr">HR</option>
              <option value="marketing">Marketing</option>
              <option value="admin">Admin</option>
              <option value="site execution">Site Execution</option>
              <option value="IT">IT</option>
              <option value="accounts">Accounts</option>
              <option value="production">Production</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Filter by Employee</label>
            <select
              value={filterEmployee}
              onChange={e => setFilterEmployee(e.target.value)}
              className="px-3 py-2 border rounded min-h-[42px]"
              style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
            >
              <option value="">All Employees</option>
              {uniqueEmployees.map(employeeName => (
                <option key={employeeName} value={employeeName}>{employeeName}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Actions</label>
            <Button onClick={fetchExpenses} className="min-h-[42px]">Refresh Data</Button>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Actions</label>
            {/* <div className="space-y-2">
              <Button onClick={fetchExpenses} className="min-h-[42px]">Refresh Data</Button>
              <Button 
                onClick={() => setShowClearConfirm(true)} 
                style={{ background: '#ef4444', color: '#ffffff' }} 
                className="min-h-[42px]"
              >
                🗑️ Clear All Expenses
              </Button>
            </div> */}
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Export</label>
            <Button onClick={handleDownloadMasterExcel} style={{ background: 'var(--accent)', color: 'var(--surface)' }} className="min-h-[42px]">Download Excel</Button>
          </div>
        </div>
      </div>

          )}{/* Expenses Table */}
      <div className="shadow-lg rounded-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--muted)' }}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--primary)' }}>Expense Management</h3>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Showing <span className="font-semibold" style={{ color: 'var(--primary)' }}>{sortedExpenses.length}</span> of <span className="font-semibold">{allExpenses.length}</span> total expenses
              </div>
              {(filterMonth || filterDept || filterEmployee) && (
                <div className="text-xs px-3 py-1 rounded" style={{ background: 'var(--accent)', color: 'var(--surface)' }}>
                  Filtered View
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            {isExpandedView ? (
              // Expanded View - Full Table
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--accent-light)', color: 'var(--foreground)' }}>
                    <th className="px-6 py-4 text-left font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Employee Details</th>
                    <th className="px-6 py-4 text-left font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Date Submitted</th>
                    <th className="px-6 py-4 text-right font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Amount</th>
                    <th className="px-6 py-4 text-center font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Payment Status</th>
                    <th className="px-6 py-4 text-center font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Approval Status</th>
                    <th className="px-6 py-4 text-center font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Admin Actions</th>
                    <th className="px-6 py-4 text-center font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Remarks</th>
                    <th className="px-6 py-4 text-center font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExpenses.map((exp, idx) => {
                    const isLocked = exp.locked || lockedExpenses[exp.id];
                    return (
                      <tr
                        key={exp.id}
                        style={{ 
                          background: idx % 2 === 0 ? 'var(--surface)' : 'var(--accent-light)', 
                          color: 'var(--foreground)', 
                          opacity: isLocked ? 0.7 : 1 
                        }}
                        className="hover:opacity-90 transition-opacity"
                      >
                        {/* Employee Details */}
                        <td className="px-6 py-4 border-b" style={{ borderColor: 'var(--muted)' }}>
                          <div className="space-y-1">
                            <div className="font-semibold" style={{ color: 'var(--primary)' }}>{exp.user?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{exp.user?.email}</div>
                            <div className="text-xs">
                              <span className="px-2 py-1 rounded text-xs" 
                                    style={{ background: 'var(--accent)', color: 'var(--surface)' }}>
                                {exp.user?.department || 'No Dept'}
                              </span>
                            </div>
                          </div>
                        </td>
                        
                        {/* Date Submitted */}
                        <td className="px-6 py-4 border-b" style={{ borderColor: 'var(--muted)' }}>
                          <div className="text-sm">
                            {exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleDateString() : '-'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleTimeString() : ''}
                          </div>
                          {exp.location && exp.location.address && (
                            <div className="text-xs text-blue-600 mt-1">
                              📍 {exp.location.address.length > 30 ? exp.location.address.substring(0, 30) + '...' : exp.location.address}
                            </div>
                          )}
                        </td>
                        
                        {/* Amount */}
                        <td className="px-6 py-4 border-b text-right" style={{ borderColor: 'var(--muted)' }}>
                          <div className="space-y-2">
                            <div className="font-bold text-lg" style={{ color: 'var(--primary)' }}>₹{formatAmount(exp.total)}</div>
                            <div className="text-xs space-y-1">
                              <div>Paid: ₹{formatAmount(exp.paid)}</div>
                              <div className="font-medium" style={{ color: (exp.total || 0) - (Number(exp.paid) || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                                Balance: ₹{formatAmount((exp.total || 0) - (Number(exp.paid) || 0))}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Payment Status */}
                        <td className="px-6 py-4 border-b text-center" style={{ borderColor: 'var(--muted)' }}>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={paidDraft[exp.id] !== undefined ? paidDraft[exp.id] : (exp.paid || '')}
                                onChange={e => handlePaidDraftChange(exp.id, e.target.value)}
                                label=""
                                min="0"
                                disabled={isLocked}
                                placeholder="Amount paid"
                                className="text-center"
                              />
                            </div>
                            <Button 
                              type="button" 
                              className="w-full" 
                              style={{ background: 'var(--primary)', color: 'var(--surface)' }} 
                              onClick={() => handlePaidSave(exp.id, exp.total)} 
                              disabled={isLocked}
                            >
                              Update Payment
                            </Button>
                            {exp.paidDate && (
                              <div className="text-xs text-gray-500">
                                Paid: {exp.paidDate}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* Approval Status */}
                        <td className="px-6 py-4 border-b text-center" style={{ borderColor: 'var(--muted)' }}>
                          <div className="space-y-3">
                            <select
                              value={exp.status || 'Under Review'}
                              onChange={e => handleStatusChange(exp.id, e.target.value)}
                              disabled={isLocked}
                              className="w-full px-3 py-2 rounded-lg border transition-all duration-200 text-center font-medium shadow-sm hover:shadow-md"
                              style={{
                                background:
                                  exp.status === 'Reject'
                                    ? '#ef4444'
                                    : exp.status === 'Approve'
                                    ? '#22c55e'
                                    : '#eab308',
                                color: '#ffffff',
                                borderColor:
                                  exp.status === 'Reject'
                                    ? '#dc2626'
                                    : exp.status === 'Approve'
                                    ? '#16a34a'
                                    : '#d97706',
                                borderWidth: '2px'
                              }}
                            >
                              <option value="Approve" style={{ background: '#ffffff', color: '#000000' }}>✓ Approve</option>
                              <option value="Reject" style={{ background: '#ffffff', color: '#000000' }}>✗ Reject</option>
                              <option value="Under Review" style={{ background: '#ffffff', color: '#000000' }}>⏳ Under Review</option>
                            </select>
                            {exp.actionBy && (
                              <div className="text-xs p-2 rounded" style={{ background: 'var(--accent-light)' }}>
                                <div className="font-medium">Actioned by:</div>
                                <div>{exp.actionBy.name}</div>
                                <div className="text-gray-500">{exp.actionBy.timestamp}</div>
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* Admin Actions */}
                        <td className="px-6 py-4 border-b text-center" style={{ borderColor: 'var(--muted)' }}>
                          <div className="space-y-2">
                            {exp.closedBy ? (
                              <div className="text-xs text-gray-500">
                                <div className="font-medium">Closed by:</div>
                                <div>{exp.closedBy.name}</div>
                                <div>{exp.closedBy.timestamp}</div>
                              </div>
                            ) : (
                              <Button 
                                type="button" 
                                className="w-full" 
                                style={{ background: isLocked ? 'var(--muted)' : '#6b7280', color: 'var(--surface)' }} 
                                onClick={() => handleCloseExpense(exp.id)} 
                                disabled={isLocked}
                              >
                                {isLocked ? '🔒 Closed' : '🔐 Close Expense'}
                              </Button>
                            )}
                          </div>
                        </td>
                        
                        {/* Remarks */}
                        <td className="px-6 py-4 border-b" style={{ borderColor: 'var(--muted)' }}>
                          <textarea
                            value={remarksDraft[exp.id] !== undefined ? remarksDraft[exp.id] : (exp.remarks || '')}
                            onChange={e => handleRemarksDraftChange(exp.id, e.target.value)}
                            onBlur={() => handleRemarksBlur(exp.id)}
                            placeholder="Add remarks..."
                            disabled={isLocked}
                            className="w-full p-2 border rounded resize-none"
                            style={{ 
                              background: 'var(--surface)', 
                              color: 'var(--foreground)', 
                              borderColor: 'var(--muted)',
                              minHeight: '60px'
                            }}
                            rows={2}
                          />
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4 border-b text-center" style={{ borderColor: 'var(--muted)' }}>
                          <Button 
                            onClick={() => handlePreview(exp)} 
                            style={{ background: 'var(--primary)', color: 'var(--surface)' }}
                            className="w-full"
                          >
                            👁️ View Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              // Compact View - Simplified Table
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--accent-light)', color: 'var(--foreground)' }}>
                    <th className="px-4 py-3 text-left font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Employee</th>
                    <th className="px-4 py-3 text-left font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Date</th>
                    <th className="px-4 py-3 text-right font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Amount</th>
                    <th className="px-4 py-3 text-center font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Status</th>
                    <th className="px-4 py-3 text-center font-semibold border-b" style={{ borderColor: 'var(--muted)' }}>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExpenses.map((exp, idx) => {
                    const isLocked = exp.locked || lockedExpenses[exp.id];
                    return (
                      <tr
                        key={exp.id}
                        style={{ 
                          background: idx % 2 === 0 ? 'var(--surface)' : 'var(--accent-light)', 
                          color: 'var(--foreground)', 
                          opacity: isLocked ? 0.7 : 1 
                        }}
                        className="hover:opacity-90 transition-opacity"
                      >
                        {/* Employee */}
                        <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--muted)' }}>
                          <div className="space-y-1">
                            <div className="font-medium" style={{ color: 'var(--primary)' }}>{exp.user?.name || 'Unknown'}</div>
                            <div className="text-xs">
                              <span className="px-1 py-0.5 rounded text-xs" 
                                    style={{ background: 'var(--accent)', color: 'var(--surface)' }}>
                                {exp.user?.department || 'No Dept'}
                              </span>
                            </div>
                          </div>
                        </td>
                        
                        {/* Date */}
                        <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--muted)' }}>
                          <div className="text-sm">
                            {exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleDateString() : '-'}
                          </div>
                          {exp.location && exp.location.address && (
                            <div className="text-xs text-blue-600 mt-1">
                              📍 {exp.location.address.length > 20 ? exp.location.address.substring(0, 20) + '...' : exp.location.address}
                            </div>
                          )}
                        </td>
                        
                        {/* Amount */}
                        <td className="px-4 py-3 border-b text-right" style={{ borderColor: 'var(--muted)' }}>
                          <div className="space-y-1">
                            <div className="font-bold" style={{ color: 'var(--primary)' }}>₹{formatAmount(exp.total)}</div>
                            <div className="text-xs" style={{ color: (exp.total || 0) - (Number(exp.paid) || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                              Bal: ₹{formatAmount((exp.total || 0) - (Number(exp.paid) || 0))}
                            </div>
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="px-4 py-3 border-b text-center" style={{ borderColor: 'var(--muted)' }}>
                          <select
                            value={exp.status || 'Under Review'}
                            onChange={e => handleStatusChange(exp.id, e.target.value)}
                            disabled={isLocked}
                            className="px-2 py-1 rounded border text-xs font-medium"
                            style={{
                              background:
                                exp.status === 'Reject'
                                  ? '#ef4444'
                                  : exp.status === 'Approve'
                                  ? '#22c55e'
                                  : '#eab308',
                              color: '#ffffff',
                              borderColor:
                                exp.status === 'Reject'
                                  ? '#dc2626'
                                  : exp.status === 'Approve'
                                  ? '#16a34a'
                                  : '#d97706',
                            }}
                          >
                            <option value="Approve" style={{ background: '#ffffff', color: '#000000' }}>✓ Approve</option>
                            <option value="Reject" style={{ background: '#ffffff', color: '#000000' }}>✗ Reject</option>
                            <option value="Under Review" style={{ background: '#ffffff', color: '#000000' }}>⏳ Review</option>
                          </select>
                        </td>
                        
                        {/* Quick Actions */}
                        <td className="px-4 py-3 border-b text-center" style={{ borderColor: 'var(--muted)' }}>
                          <div className="flex gap-1 justify-center">
                            <Button 
                              onClick={() => handlePreview(exp)} 
                              style={{ background: 'var(--primary)', color: 'var(--surface)' }}
                              className="text-xs px-2 py-1"
                            >
                              👁️
                            </Button>
                            {!isLocked && (
                              <Button 
                                type="button" 
                                className="text-xs px-2 py-1" 
                                style={{ background: '#6b7280', color: 'var(--surface)' }} 
                                onClick={() => handleCloseExpense(exp.id)}
                              >
                                🔐
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
   
      {/* Preview Modal */}
      {isPreviewOpen && previewExpense && (
        <Dialog open={isPreviewOpen} onClose={closePreview} className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
          <div className="relative rounded-lg shadow-lg p-8 max-w-4xl w-full mx-4 z-10 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--muted)' }}>
            <Dialog.Title className="text-2xl font-bold mb-6" style={{ color: 'var(--primary)' }}>Expense Details</Dialog.Title>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>Employee Information</h3>
                <div className="space-y-2 p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                  <div><b style={{ color: 'var(--primary)' }}>Name:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.user?.name}</span></div>
                  <div><b style={{ color: 'var(--primary)' }}>Email:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.user?.email}</span></div>
                  <div><b style={{ color: 'var(--primary)' }}>Department:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.user?.department || 'Not specified'}</span></div>
                </div>
                
                {/* Status Information */}
                <h3 className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>Status Information</h3>
                <div className="space-y-2 p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                  <div><b style={{ color: 'var(--primary)' }}>Current Status:</b> 
                    <span className="ml-2 px-2 py-1 rounded text-sm font-medium"
                          style={{
                            background: previewExpense.status === 'Reject' ? '#ef4444' : previewExpense.status === 'Approve' ? '#22c55e' : '#eab308',
                            color: '#ffffff'
                          }}>
                      {previewExpense.status || 'Under Review'}
                    </span>
                  </div>
                  {previewExpense.actionBy && (
                    <div><b style={{ color: 'var(--primary)' }}>Action By:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.actionBy.name} on {previewExpense.actionBy.timestamp}</span></div>
                  )}
                  {previewExpense.closedBy && (
                    <div><b style={{ color: 'var(--primary)' }}>Closed By:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.closedBy.name} on {previewExpense.closedBy.timestamp}</span></div>
                  )}
                </div>

                {/* Payment Information */}
                <h3 className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>Payment Information</h3>
                <div className="space-y-2 p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                  <div><b style={{ color: 'var(--primary)' }}>Total Amount:</b> <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>₹{formatAmount(previewExpense.total)}</span></div>
                  <div><b style={{ color: 'var(--primary)' }}>Amount Paid:</b> <span style={{ color: '#22c55e' }}>₹{formatAmount(previewExpense.paid)}</span></div>
                  <div><b style={{ color: 'var(--primary)' }}>Balance:</b> 
                    <span style={{ color: (previewExpense.total || 0) - (Number(previewExpense.paid) || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                      ₹{formatAmount((previewExpense.total || 0) - (Number(previewExpense.paid) || 0))}
                    </span>
                  </div>
                  {previewExpense.paidDate && (
                    <div><b style={{ color: 'var(--primary)' }}>Payment Date:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.paidDate}</span></div>
                  )}
                </div>
              </div>

              {/* Expense Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>Expense Details</h3>
                <div className="space-y-2 p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                  <div><b style={{ color: 'var(--primary)' }}>Date:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.date}</span></div>
                  <div><b style={{ color: 'var(--primary)' }}>Purpose:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.purpose || 'Not specified'}</span></div>
                  <div><b style={{ color: 'var(--primary)' }}>Submitted At:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.createdAt?.toDate ? previewExpense.createdAt.toDate().toLocaleString() : 'Unknown'}</span></div>
                  {previewExpense.location && (
                    <>
                      <div><b style={{ color: 'var(--primary)' }}>📍 Location:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.location.address || 'Location not available'}</span></div>
                      {previewExpense.location.latitude && previewExpense.location.longitude && (
                        <div>
                          <b style={{ color: 'var(--primary)' }}>Coordinates:</b> 
                          <span style={{ color: 'var(--foreground)' }}> {previewExpense.location.latitude.toFixed(6)}, {previewExpense.location.longitude.toFixed(6)}</span>
                          <a 
                            href={`https://www.google.com/maps?q=${previewExpense.location.latitude},${previewExpense.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-xs px-2 py-1 rounded"
                            style={{ background: 'var(--primary)', color: 'var(--surface)' }}
                          >
                            🗺️ View on Map
                          </a>
                        </div>
                      )}
                      {previewExpense.location.timestamp && (
                        <div><b style={{ color: 'var(--primary)' }}>Location Captured:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.location.timestamp}</span></div>
                      )}
                    </>
                  )}
                </div>

                {/* Expense Breakdown */}
                <h3 className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>Expense Breakdown</h3>
                <div className="space-y-2 p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                  <div><b style={{ color: 'var(--primary)' }}>Category:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.category || 'Not specified'}</span></div>
                  {previewExpense.category === 'personal' && (
                    <>
                      {previewExpense.food && previewExpense.food.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Food:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.food.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.fuel && previewExpense.fuel.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Fuel:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.fuel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.entertainment && previewExpense.entertainment.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Entertainment:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.entertainment.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.utility && previewExpense.utility.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Utility:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.utility.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.home && previewExpense.home.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Home:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.home.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.travel && previewExpense.travel.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Travel:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.travel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.grocery && previewExpense.grocery.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Grocery:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.grocery.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.miscellaneous && previewExpense.miscellaneous.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Miscellaneous:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.miscellaneous.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                    </>
                  )}
                  {previewExpense.category === 'official' && (
                    <>
                      {previewExpense.food && previewExpense.food.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Food:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.food.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.fuel && previewExpense.fuel.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Fuel:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.fuel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.transport && previewExpense.transport.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Transport:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.transport.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.hotel && previewExpense.hotel.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Hotel:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.hotel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.miscellaneous && previewExpense.miscellaneous.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Miscellaneous:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.miscellaneous.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                    </>
                  )}
                  {previewExpense.category === 'site' && (
                    <>
                      {previewExpense.siteName && <div><b style={{ color: 'var(--primary)' }}>Site Name:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.siteName}</span></div>}
                      {previewExpense.labour && previewExpense.labour.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Labour:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.labour.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.travel && previewExpense.travel.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Travel:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.travel.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.tools && previewExpense.tools.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Tools:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.tools.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.consumables && previewExpense.consumables.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Consumables:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.consumables.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.stay && previewExpense.stay.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Stay:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.stay.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.transportOfMaterial && previewExpense.transportOfMaterial.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Transport of Material:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.transportOfMaterial.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.localCommute && previewExpense.localCommute.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Local Commute:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.localCommute.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                      {previewExpense.miscellaneous && previewExpense.miscellaneous.length > 0 && <div><b style={{ color: 'var(--primary)' }}>Miscellaneous:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(previewExpense.miscellaneous.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0))}</span></div>}
                    </>
                  )}
                  {(!previewExpense.category || previewExpense.category === '') && previewExpense.others && previewExpense.others.length > 0 && (
                    <>
                      {previewExpense.others.map((other: any, idx: number) => (
                        <div key={idx}>
                          <b style={{ color: 'var(--primary)' }}>{other.label || `Other ${idx + 1}`}:</b> <span style={{ color: 'var(--foreground)' }}>₹{formatAmount(other.amount)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Admin Actions in Modal */}
                {!isExpandedView && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--primary)' }}>Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Amount</label>
                        <Input
                          type="number"
                          value={paidDraft[previewExpense.id] !== undefined ? paidDraft[previewExpense.id] : (previewExpense.paid || '')}
                          onChange={e => handlePaidDraftChange(previewExpense.id, e.target.value)}
                          min="0"
                          disabled={previewExpense.locked}
                          placeholder="Amount paid"
                        />
                        <Button 
                          type="button" 
                          className="w-full" 
                          style={{ background: 'var(--primary)', color: 'var(--surface)' }} 
                          onClick={() => handlePaidSave(previewExpense.id, previewExpense.total)} 
                          disabled={previewExpense.locked}
                        >
                          Update Payment
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Remarks</label>
                        <textarea
                          value={remarksDraft[previewExpense.id] !== undefined ? remarksDraft[previewExpense.id] : (previewExpense.remarks || '')}
                          onChange={e => handleRemarksDraftChange(previewExpense.id, e.target.value)}
                          onBlur={() => handleRemarksBlur(previewExpense.id)}
                          placeholder="Add remarks..."
                          disabled={previewExpense.locked}
                          className="w-full p-2 border rounded resize-none"
                          style={{ 
                            background: 'var(--surface)', 
                            color: 'var(--foreground)', 
                            borderColor: 'var(--muted)',
                            minHeight: '60px'
                          }}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-6 space-y-4">
              {previewExpense.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--primary)' }}>Notes</h3>
                  <div className="p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                    <span style={{ color: 'var(--foreground)' }}>{previewExpense.notes}</span>
                  </div>
                </div>
              )}

              {previewExpense.remarks && (
                <div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--primary)' }}>Admin Remarks</h3>
                  <div className="p-4 rounded" style={{ background: 'var(--accent-light)' }}>
                    <span style={{ color: 'var(--foreground)' }}>{previewExpense.remarks}</span>
                  </div>
                </div>
              )}

              {/* Documents */}
              {(previewExpense.file || (previewExpense.billImages && previewExpense.billImages.length > 0)) && (
                <div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--primary)' }}>Documents</h3>
                  <div className="space-y-4">
                    {previewExpense.file && (
                      <div>
                        <b style={{ color: 'var(--primary)' }}>Main Document:</b>{' '}
                        {isImageUrl(previewExpense.file) ? (
                          <a href={previewExpense.file} target="_blank" rel="noopener noreferrer">
                            <img src={previewExpense.file} alt="Expense proof" className="max-w-full h-auto mt-2 rounded max-h-60 object-contain" style={{ border: '1px solid var(--muted)' }} />
                          </a>
                        ) : (
                          <a href={previewExpense.file} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--primary)' }}>View Document</a>
                        )}
                      </div>
                    )}
                    {previewExpense.billImages && previewExpense.billImages.length > 0 && (
                      <div>
                        <b style={{ color: 'var(--primary)' }}>Bill Images:</b>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {previewExpense.billImages.map((url: string, idx: number) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`Bill proof ${idx + 1}`} className="w-24 h-24 object-cover rounded hover:w-32 hover:h-32 transition-all duration-200" style={{ border: '1px solid var(--muted)' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button onClick={closePreview} style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>Close</Button>
              {!previewExpense.locked && (
                <Button 
                  onClick={() => {
                    handleCloseExpense(previewExpense.id);
                    closePreview();
                  }}
                  style={{ background: '#6b7280', color: 'var(--surface)' }}
                >
                  🔐 Close Expense
                </Button>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <Dialog open={showClearConfirm} onClose={() => setShowClearConfirm(false)} className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
          <div className="relative rounded-lg shadow-lg p-8 max-w-md w-full z-10" style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--muted)' }}>
            <Dialog.Title className="text-xl font-bold mb-4 text-red-600">⚠️ Clear All Expenses</Dialog.Title>
            <div className="space-y-4">
              <p style={{ color: 'var(--foreground)' }}>
                Are you sure you want to delete <strong>ALL</strong> expenses from the database? 
              </p>
              <p className="text-red-600 font-semibold">
                This action cannot be undone!
              </p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Current total: {expenses.length} expenses will be permanently deleted.
              </p>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <Button 
                onClick={() => setShowClearConfirm(false)}
                style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleClearAllExpenses}
                disabled={isClearing}
                style={{ background: '#ef4444', color: '#ffffff' }}
              >
                {isClearing ? 'Deleting...' : 'Yes, Delete All'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      </Card>
    </div>
  );
}