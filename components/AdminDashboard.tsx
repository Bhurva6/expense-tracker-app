'use client';
import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { Card, Input, Button } from "./ui/shadcn";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Dialog } from '@headlessui/react';
import { useAuth } from '../context/AuthContext';
import { sendStatusChangeNotification, sendExpenseClosedNotification } from '../lib/emailService';
import EmailTestComponent from './EmailTestComponent';

const ADMIN_EMAILS = ['bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com',
  'hrd@panachegreen.com',
  'brijesh@panachegreen.com',
  'accounts@panachegreen.com',];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]); // Store all expenses for dropdown options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [previewExpense, setPreviewExpense] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState<Record<string, string>>({});
  const [paidDraft, setPaidDraft] = useState<Record<string, string>>({});
  const [lockedExpenses, setLockedExpenses] = useState<Record<string, boolean>>({});
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isExpandedView, setIsExpandedView] = useState(true);
  const [showEmailTest, setShowEmailTest] = useState(false);

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
      
      setExpenses(filteredExpenses);
    } catch (err: any) {
      setError(err.message || 'Error fetching expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line
  }, [filterMonth, filterDept, filterEmployee]);

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
    fetchExpenses();
  };

  const handleRemarksDraftChange = (id: string, value: string) => {
    setRemarksDraft((prev) => ({ ...prev, [id]: value }));
  };

  const handleRemarksBlur = (id: string) => {
    if (remarksDraft[id] !== undefined) {
      handleRemarksChange(id, remarksDraft[id]);
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
      if (status === 'Approve') totalApproved++;
      else if (status === 'Reject') totalRejected++;
      else totalUnderReview++;
      
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
      const ws = XLSX.utils.json_to_sheet(
        (userExpenses as any[]).map((exp: any) => ({
          Date: exp.date,
          Purpose: exp.purpose,
          Hotel: exp.hotel,
          Transport: exp.transport,
          Fuel: exp.fuel,
          Meals: exp.meals,
          Entertainment: exp.entertainment,
          Notes: exp.notes,
          Total: exp.total,
          Status: exp.status || 'Submitted',
          'Action By': exp.actionBy ? `${exp.actionBy.name} (${exp.actionBy.timestamp})` : 
                      exp.closedBy ? `${exp.closedBy.name} - Closed (${exp.closedBy.timestamp})` : '-',
          'Document Link': exp.file || '',
          'Bill Image Links': exp.billImages ? exp.billImages.join(', ') : '',
          Name: exp.user?.name,
          Email: exp.user?.email,
          SubmittedAt: exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleString() : '',
          'Location Address': exp.location?.address || 'Not available',
          'Location Coordinates': exp.location?.latitude && exp.location?.longitude ? 
            `${exp.location.latitude.toFixed(6)}, ${exp.location.longitude.toFixed(6)}` : 'Not available',
          'Location Timestamp': exp.location?.timestamp || 'Not available',
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, email.replace(/[@.]/g, '_'));
    });
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `master_expenses.xlsx`);
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

  return (
    <div className="max-w-full mx-auto p-6 space-y-8">
      <Card className="p-8">
      {/* Admin Summary Statistics */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--primary)' }}>Admin Dashboard Overview</h2>
        
        {/* Primary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Month Spend */}
          <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', borderLeft: '6px solid #3b82f6' }}>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Spend This Month</h3>
            <p className="text-3xl font-bold mb-1" style={{ color: '#3b82f6' }}>₹{totalMonthSpend.toLocaleString()}</p>
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
            <p className="text-sm text-gray-500">₹{maxCategory[1].toLocaleString()}</p>
          </div>
          
          {/* Min Spending Category */}
          <div className="p-6 rounded-lg shadow-lg" style={{ background: 'var(--surface)', borderLeft: '6px solid #8b5cf6' }}>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Lowest Spending</h3>
            <p className="text-lg font-semibold mb-1" style={{ color: '#8b5cf6' }}>{minCategory[0]}</p>
            <p className="text-sm text-gray-500">₹{minCategory[1].toLocaleString()}</p>
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
      </div>

      {/* Filters Section */}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
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
            <label className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Export</label>
            <Button onClick={handleDownloadMasterExcel} style={{ background: 'var(--accent)', color: 'var(--surface)' }} className="min-h-[42px]">Download Excel</Button>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
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
                            <div className="font-bold text-lg" style={{ color: 'var(--primary)' }}>₹{exp.total?.toLocaleString()}</div>
                            <div className="text-xs space-y-1">
                              <div>Paid: ₹{(Number(exp.paid) || 0).toLocaleString()}</div>
                              <div className="font-medium" style={{ color: (exp.total || 0) - (Number(exp.paid) || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                                Balance: ₹{((exp.total || 0) - (Number(exp.paid) || 0)).toLocaleString()}
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
                            <div className="font-bold" style={{ color: 'var(--primary)' }}>₹{exp.total?.toLocaleString()}</div>
                            <div className="text-xs" style={{ color: (exp.total || 0) - (Number(exp.paid) || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                              Bal: ₹{((exp.total || 0) - (Number(exp.paid) || 0)).toLocaleString()}
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
                  <div><b style={{ color: 'var(--primary)' }}>Total Amount:</b> <span className="text-lg font-bold" style={{ color: 'var(--primary)' }}>₹{previewExpense.total?.toLocaleString()}</span></div>
                  <div><b style={{ color: 'var(--primary)' }}>Amount Paid:</b> <span style={{ color: '#22c55e' }}>₹{(Number(previewExpense.paid) || 0).toLocaleString()}</span></div>
                  <div><b style={{ color: 'var(--primary)' }}>Balance:</b> 
                    <span style={{ color: (previewExpense.total || 0) - (Number(previewExpense.paid) || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                      ₹{((previewExpense.total || 0) - (Number(previewExpense.paid) || 0)).toLocaleString()}
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
                      {previewExpense.food && <div><b style={{ color: 'var(--primary)' }}>Food:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.food).toLocaleString()}</span></div>}
                      {previewExpense.fuel && <div><b style={{ color: 'var(--primary)' }}>Fuel:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.fuel).toLocaleString()}</span></div>}
                      {previewExpense.entertainment && <div><b style={{ color: 'var(--primary)' }}>Entertainment:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.entertainment).toLocaleString()}</span></div>}
                      {previewExpense.utility && <div><b style={{ color: 'var(--primary)' }}>Utility:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.utility).toLocaleString()}</span></div>}
                      {previewExpense.home && <div><b style={{ color: 'var(--primary)' }}>Home:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.home).toLocaleString()}</span></div>}
                      {previewExpense.travel && <div><b style={{ color: 'var(--primary)' }}>Travel:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.travel).toLocaleString()}</span></div>}
                      {previewExpense.grocery && <div><b style={{ color: 'var(--primary)' }}>Grocery:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.grocery).toLocaleString()}</span></div>}
                    </>
                  )}
                  {previewExpense.category === 'official' && (
                    <>
                      {previewExpense.food && <div><b style={{ color: 'var(--primary)' }}>Food:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.food).toLocaleString()}</span></div>}
                      {previewExpense.fuel && <div><b style={{ color: 'var(--primary)' }}>Fuel:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.fuel).toLocaleString()}</span></div>}
                      {previewExpense.transport && <div><b style={{ color: 'var(--primary)' }}>Transport:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.transport).toLocaleString()}</span></div>}
                      {previewExpense.hotel && <div><b style={{ color: 'var(--primary)' }}>Hotel:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.hotel).toLocaleString()}</span></div>}
                    </>
                  )}
                  {previewExpense.category === 'site' && (
                    <>
                      {previewExpense.siteName && <div><b style={{ color: 'var(--primary)' }}>Site Name:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.siteName}</span></div>}
                      {previewExpense.labour && <div><b style={{ color: 'var(--primary)' }}>Labour:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.labour).toLocaleString()}</span></div>}
                      {previewExpense.travel && <div><b style={{ color: 'var(--primary)' }}>Travel:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.travel).toLocaleString()}</span></div>}
                      {previewExpense.tools && <div><b style={{ color: 'var(--primary)' }}>Tools:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.tools).toLocaleString()}</span></div>}
                      {previewExpense.consumables && <div><b style={{ color: 'var(--primary)' }}>Consumables:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.consumables).toLocaleString()}</span></div>}
                      {previewExpense.stay && <div><b style={{ color: 'var(--primary)' }}>Stay:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.stay).toLocaleString()}</span></div>}
                      {previewExpense.transportOfMaterial && <div><b style={{ color: 'var(--primary)' }}>Transport of Material:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.transportOfMaterial).toLocaleString()}</span></div>}
                      {previewExpense.localCommute && <div><b style={{ color: 'var(--primary)' }}>Local Commute:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(previewExpense.localCommute).toLocaleString()}</span></div>}
                    </>
                  )}
                  {(!previewExpense.category || previewExpense.category === '') && previewExpense.others && previewExpense.others.length > 0 && (
                    <>
                      {previewExpense.others.map((other: any, idx: number) => (
                        <div key={idx}>
                          <b style={{ color: 'var(--primary)' }}>{other.label || `Other ${idx + 1}`}:</b> <span style={{ color: 'var(--foreground)' }}>₹{Number(other.amount).toLocaleString()}</span>
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
      {/* {showClearConfirm && (
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
      )} */}
      </Card>
    </div>
  );
}