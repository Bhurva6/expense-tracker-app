'use client';
import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { Card, Input, Button } from "./ui/shadcn";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Dialog } from '@headlessui/react';
import { useAuth } from '../context/AuthContext';
import { sendStatusChangeNotification } from '../lib/emailService';

const ADMIN_EMAILS = ['bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com',
  'kunal.nihalani@icloud.com',
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
    
    await updateDoc(doc(db, 'expenses', id), { 
      paidDate: now, 
      locked: true,
      closedBy,
      closeTimestamp: now
    });
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
    <Card className="mt-6">
      {/* Admin Summary Statistics */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--primary)' }}>Admin Dashboard Overview</h2>
        
        {/* Primary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Total Month Spend */}
          <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #3b82f6' }}>
            <h3 className="text-sm font-medium text-gray-500">Total Spend This Month</h3>
            <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>₹{totalMonthSpend.toLocaleString()}</p>
          </div>
          
          {/* Total Employees */}
          <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #10b981' }}>
            <h3 className="text-sm font-medium text-gray-500">Total Employees</h3>
            <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{totalEmployees}</p>
          </div>
          
          {/* Max Spending Category */}
          <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #f59e0b' }}>
            <h3 className="text-sm font-medium text-gray-500">Highest Spending</h3>
            <p className="text-lg font-semibold" style={{ color: '#f59e0b' }}>{maxCategory[0]}</p>
            <p className="text-sm text-gray-500">₹{maxCategory[1].toLocaleString()}</p>
          </div>
          
          {/* Min Spending Category */}
          <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #8b5cf6' }}>
            <h3 className="text-sm font-medium text-gray-500">Lowest Spending</h3>
            <p className="text-lg font-semibold" style={{ color: '#8b5cf6' }}>{minCategory[0]}</p>
            <p className="text-sm text-gray-500">₹{minCategory[1].toLocaleString()}</p>
          </div>
        </div>

        {/* Status Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Approved Expenses */}
          <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #22c55e' }}>
            <h3 className="text-sm font-medium text-gray-500">Approved Expenses</h3>
            <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{totalApproved}</p>
          </div>
          
          {/* Under Review */}
          <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #eab308' }}>
            <h3 className="text-sm font-medium text-gray-500">Under Review</h3>
            <p className="text-2xl font-bold" style={{ color: '#eab308' }}>{totalUnderReview}</p>
          </div>
          
          {/* Rejected Expenses */}
          <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #ef4444' }}>
            <h3 className="text-sm font-medium text-gray-500">Rejected Expenses</h3>
            <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{totalRejected}</p>
          </div>
          
          {/* Closed Expenses */}
          <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #6b7280' }}>
            <h3 className="text-sm font-medium text-gray-500">Closed Expenses</h3>
            <p className="text-2xl font-bold" style={{ color: '#6b7280' }}>{totalClosed}</p>
          </div>
        </div>

       
      </div>

      <div className="flex gap-4 mb-4">
        <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} label="Filter by Month" />
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 border rounded"
          style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
        >
          <option value="">Filter by Department</option>
          <option value="sales">Sales</option>
          <option value="hr">HR</option>
          <option value="marketing">Marketing</option>
          <option value="admin">Admin</option>
          <option value="site execution">Site Execution</option>
          <option value="IT">IT</option>
          <option value="accounts">Accounts</option>
          <option value="production">Production</option>
        </select>
        <select
          value={filterEmployee}
          onChange={e => setFilterEmployee(e.target.value)}
          className="px-3 py-2 border rounded"
          style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--muted)' }}
        >
          <option value="">Filter by Employee</option>
          {uniqueEmployees.map(employeeName => (
            <option key={employeeName} value={employeeName}>{employeeName}</option>
          ))}
        </select>
        <Button onClick={fetchExpenses}>Refresh</Button>
        <Button onClick={handleDownloadMasterExcel} style={{ background: 'var(--accent)', color: 'var(--surface)' }}>Open in Excel</Button>
        {/* <Button onClick={() => setShowClearConfirm(true)} style={{ background: '#ef4444', color: '#ffffff' }}>Clear All Expenses</Button> */}
      </div>
      <table className="min-w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr style={{ background: 'var(--accent-light)', color: 'var(--foreground)' }}>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Department</th>
            <th className="px-4 py-2 text-left">Date Added</th>
            <th className="px-4 py-2 text-right">Total</th>
            <th className="px-4 py-2 text-right">Paid</th>
            <th className="px-4 py-2 text-right">Balance</th>
            <th className="px-4 py-2 text-center">Status</th>
            <th className="px-4 py-2 text-center">Action By</th>
            <th className="px-4 py-2 text-center">Paid Date</th>
            <th className="px-4 py-2 text-center">Remarks</th>
            <th className="px-4 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedExpenses.map((exp, idx) => {
            const isLocked = exp.locked || lockedExpenses[exp.id];
            return (
              <tr
                key={exp.id}
                style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--accent-light)', color: 'var(--foreground)', opacity: isLocked ? 0.5 : 1 }}
              >
                <td className="px-4 py-2 align-top">{exp.user?.name}</td>
                <td className="px-4 py-2 align-top">{exp.user?.department || '-'}</td>
                <td className="px-4 py-2 align-top">{exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleString() : '-'}</td>
                <td className="px-4 py-2 align-top text-right">₹{exp.total}</td>
                <td className="px-4 py-2 align-top text-right">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={paidDraft[exp.id] !== undefined ? paidDraft[exp.id] : (exp.paid || '')}
                      onChange={e => handlePaidDraftChange(exp.id, e.target.value)}
                      label=""
                      min="0"
                      disabled={isLocked}
                    />
                    <Button type="button" className="px-2 py-1" style={{ background: 'var(--primary)', color: 'var(--surface)' }} onClick={() => handlePaidSave(exp.id, exp.total)} disabled={isLocked}>Save</Button>
                  </div>
                </td>
                <td className="px-4 py-2 align-top text-right">{(exp.total || 0) - (Number(exp.paid) || 0)}</td>
                <td className="px-4 py-2 align-top text-center">
                  <select
                    value={exp.status || 'Under Review'}
                    onChange={e => handleStatusChange(exp.id, e.target.value)}
                    disabled={isLocked}
                    className="px-2 py-1 rounded border transition-colors"
                    style={{
                      background:
                        exp.status === 'Reject'
                          ? '#ef4444'
                          : exp.status === 'Approve'
                          ? '#22c55e'
                          : 'var(--surface)',
                      color:
                        exp.status === 'Reject' || exp.status === 'Approve'
                          ? '#ffffff'
                          : 'var(--foreground)',
                      borderColor:
                        exp.status === 'Reject'
                          ? '#ef4444'
                          : exp.status === 'Approve'
                          ? '#22c55e'
                          : 'var(--muted)',
                    }}
                  >
                    <option value="Approve">Approve</option>
                    <option value="Reject">Reject</option>
                    <option value="Under Review">Under Review</option>
                  </select>
                </td>
                <td className="px-4 py-2 align-top text-center">
                  {exp.actionBy ? (
                    <div className="text-xs">
                      <div className="font-medium">{exp.actionBy.name}</div>
                      <div className="text-gray-500">{exp.actionBy.timestamp}</div>
                    </div>
                  ) : exp.closedBy ? (
                    <div className="text-xs">
                      <div className="font-medium">{exp.closedBy.name}</div>
                      <div className="text-gray-500">Closed: {exp.closedBy.timestamp}</div>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-2 align-top text-center">{exp.paidDate || '-'}</td>
                <td className="px-4 py-2 align-top text-center">
                  <Input
                    value={remarksDraft[exp.id] !== undefined ? remarksDraft[exp.id] : (exp.remarks || '')}
                    onChange={e => handleRemarksDraftChange(exp.id, e.target.value)}
                    onBlur={() => handleRemarksBlur(exp.id)}
                    label="Remarks"
                    disabled={isLocked}
                  />
                </td>
                <td className="px-4 py-2 align-top text-center">
                  <button onClick={() => handlePreview(exp)} className="underline mr-2" style={{ color: 'var(--primary)', background: 'none', border: 'none' }} disabled={isLocked}>Preview</button>
                  <Button type="button" className="px-2 py-1" style={{ background: 'var(--muted)', color: 'var(--surface)' }} onClick={() => handleCloseExpense(exp.id)} disabled={isLocked}>
                    {isLocked ? 'Expense Closed' : 'Close Expense'}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Preview Modal */}
      {isPreviewOpen && previewExpense && (
        <Dialog open={isPreviewOpen} onClose={closePreview} className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
          <div className="relative rounded-lg shadow-lg p-8 max-w-lg w-full z-10" style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--muted)' }}>
            <Dialog.Title className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>Expense Preview</Dialog.Title>
            <div className="space-y-2">
              <div><b style={{ color: 'var(--primary)' }}>Name:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.user?.name}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Email:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.user?.email}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Date:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.date}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Purpose:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.purpose}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Hotel:</b> <span style={{ color: 'var(--foreground)' }}>₹{previewExpense.hotel}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Transport:</b> <span style={{ color: 'var(--foreground)' }}>₹{previewExpense.transport}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Fuel:</b> <span style={{ color: 'var(--foreground)' }}>₹{previewExpense.fuel}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Meals:</b> <span style={{ color: 'var(--foreground)' }}>₹{previewExpense.meals}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Entertainment:</b> <span style={{ color: 'var(--foreground)' }}>₹{previewExpense.entertainment}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Notes:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.notes}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Total:</b> <span style={{ color: 'var(--foreground)' }}>₹{previewExpense.total}</span></div>
              <div><b style={{ color: 'var(--primary)' }}>Status:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.status || 'Under Review'}</span></div>
              {previewExpense.actionBy && (
                <div><b style={{ color: 'var(--primary)' }}>Action By:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.actionBy.name} on {previewExpense.actionBy.timestamp}</span></div>
              )}
              {previewExpense.closedBy && (
                <div><b style={{ color: 'var(--primary)' }}>Closed By:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.closedBy.name} on {previewExpense.closedBy.timestamp}</span></div>
              )}
              <div><b style={{ color: 'var(--primary)' }}>Remarks:</b> <span style={{ color: 'var(--foreground)' }}>{previewExpense.remarks || '-'}</span></div>
              {previewExpense.file && (
                <div>
                  <b style={{ color: 'var(--primary)' }}>Document:</b>{' '}
                  {isImageUrl(previewExpense.file) ? (
                    <a href={previewExpense.file} target="_blank" rel="noopener noreferrer">
                      <img src={previewExpense.file} alt="Expense proof" className="max-w-full h-auto mt-2 rounded" style={{ border: '1px solid var(--muted)' }} />
                    </a>
                  ) : (
                    <a href={previewExpense.file} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--primary)' }}>View Document</a>
                  )}
                </div>
              )}
              {previewExpense.billImages && previewExpense.billImages.length > 0 && (
                <div className="mt-2">
                  <b style={{ color: 'var(--primary)' }}>Bills:</b>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewExpense.billImages.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Bill proof ${idx + 1}`} className="w-24 h-24 object-cover rounded" style={{ border: '1px solid var(--muted)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={closePreview} style={{ background: 'var(--primary)', color: 'var(--surface)' }}>Close</Button>
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
  );
} 