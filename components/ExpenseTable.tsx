'use client';
import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { Card } from "./ui/shadcn";
import { useRouter } from 'next/navigation';
import { Dialog } from '@headlessui/react';

export default function ExpenseTable() {
  const { user } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<any[]>([]);
  const [draftExpenses, setDraftExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [draftToSubmit, setDraftToSubmit] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete draft expense
  const handleDeleteDraft = async () => {
    if (!draftToDelete) return;
    
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'draftExpenses', draftToDelete));
      setDraftExpenses(draftExpenses.filter(exp => exp.id !== draftToDelete));
      setDeleteConfirmOpen(false);
      setDraftToDelete(null);
    } catch (err: any) {
      console.error('Error deleting draft:', err);
      alert('Failed to delete draft: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Submit draft as full expense
  const handleSubmitDraft = async () => {
    if (!draftToSubmit || !user?.uid) return;

    try {
      setSubmitting(true);
      
      const draftData = draftToSubmit;
      
      // Create expense data for submission
      const expenseData = {
        date: draftData.date,
        category: draftData.category,
        notes: draftData.notes,
        siteName: draftData.siteName,
        food: draftData.food || [],
        fuel: draftData.fuel || [],
        entertainment: draftData.entertainment || [],
        utility: draftData.utility || [],
        home: draftData.home || [],
        travel: draftData.travel || [],
        grocery: draftData.grocery || [],
        transport: draftData.transport || [],
        hotel: draftData.hotel || [],
        labour: draftData.labour || [],
        tools: draftData.tools || [],
        consumables: draftData.consumables || [],
        stay: draftData.stay || [],
        transportOfMaterial: draftData.transportOfMaterial || [],
        localCommute: draftData.localCommute || [],
        miscellaneous: draftData.miscellaneous || [],
        others: draftData.others || [],
        billImages: draftData.billImages || [], // Preserve uploaded attachments from draft
        total: draftData.total,
        status: "Under Review",
        isPersonal: false,
        user: {
          uid: user?.uid,
          name: user?.displayName,
          email: user?.email,
        },
        location: draftData.location || {
          latitude: 0,
          longitude: 0,
          address: "Location not available",
          timestamp: new Date().toLocaleString(),
        },
        createdAt: Timestamp.now(),
      };

      // Add to expenses collection
      await addDoc(collection(db, 'expenses'), expenseData);

      // Delete from drafts
      await deleteDoc(doc(db, 'draftExpenses', draftToSubmit.id));

      // Update state
      setDraftExpenses(draftExpenses.filter(exp => exp.id !== draftToSubmit.id));
      setSubmitConfirmOpen(false);
      setDraftToSubmit(null);

      alert('Draft submitted successfully for approval!');
    } catch (err: any) {
      console.error('Error submitting draft:', err);
      alert('Failed to submit draft: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit draft - navigate to form with draft data
  const handleEditDraft = (draft: any) => {
    // Store draft data in sessionStorage to pre-populate form
    sessionStorage.setItem('draftExpenseData', JSON.stringify(draft));
    router.push('/?editDraft=' + draft.id);
  };

  // Calculate spending statistics
  // Helper function to safely format amounts
  const formatAmount = (amount: any): string => {
    const num = Number(amount) || 0;
    return isNaN(num) ? '0' : num.toLocaleString();
  };

  const calculateStats = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)

    let totalSpend = 0;
    let monthSpend = 0;
    let weekSpend = 0;
    const categorySpend: Record<string, number> = {};

    // Include regular, personal, and draft expenses in calculations
    const allExpenses = [...expenses, ...personalExpenses, ...draftExpenses];
    
    allExpenses.forEach((exp: any) => {
      const expenseDate = new Date(exp.createdAt.seconds * 1000);
      const amount = exp.total || 0;
      
      // Total spend
      totalSpend += amount;
      
      // Month spend
      if (expenseDate >= startOfMonth) {
        monthSpend += amount;
      }
      
      // Week spend
      if (expenseDate >= startOfWeek) {
        weekSpend += amount;
      }
      
      // Category spend
      const category = exp.purpose || exp.category || 'Other';
      categorySpend[category] = (categorySpend[category] || 0) + amount;
    });

    return { totalSpend, monthSpend, weekSpend, categorySpend };
  };

  const { totalSpend, monthSpend, weekSpend, categorySpend } = calculateStats();

  const isImageUrl = (url: string) => {
    if (!url) return false;
    return /\.(jpe?g|png|webp|avif|gif|svg)$/.test(url.toLowerCase());
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchExpenses = async () => {
      try {
        // Fetch regular expenses (for approval workflow)
        // Note: We filter by user.uid only and sort client-side to avoid needing a composite index
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('user.uid', '==', user.uid)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const expensesData = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by createdAt descending (newest first) client-side
        expensesData.sort((a: any, b: any) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        setExpenses(expensesData);

        // Fetch personal expenses (tracking only)
        // Note: We filter by user.uid only and sort client-side to avoid needing a composite index
        const personalQuery = query(
          collection(db, 'personalExpenses'),
          where('user.uid', '==', user.uid)
        );
        const personalSnapshot = await getDocs(personalQuery);
        const personalData = personalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by createdAt descending (newest first) client-side
        personalData.sort((a: any, b: any) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        setPersonalExpenses(personalData);

        // Fetch draft expenses
        const draftQuery = query(
          collection(db, 'draftExpenses'),
          where('user.uid', '==', user.uid)
        );
        const draftSnapshot = await getDocs(draftQuery);
        const draftData = draftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by createdAt descending (newest first) client-side
        draftData.sort((a: any, b: any) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        setDraftExpenses(draftData);
      } catch (err: any) {
        setError(err.message || 'Error fetching expenses');
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!expenses.length && !personalExpenses.length && !draftExpenses.length) return <div>No expenses found.</div>;

  return (
    <div className="max-w-6xl mx-auto mt-8">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Spend */}
        <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #3b82f6' }}>
          <h3 className="text-sm font-medium text-gray-500">Total Spend</h3>
          <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>₹{formatAmount(totalSpend)}</p>
        </div>
        
        {/* This Month */}
        <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #10b981' }}>
          <h3 className="text-sm font-medium text-gray-500">This Month</h3>
          <p className="text-2xl font-bold" style={{ color: '#10b981' }}>₹{formatAmount(monthSpend)}</p>
        </div>
        
        {/* This Week */}
        <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #f59e0b' }}>
          <h3 className="text-sm font-medium text-gray-500">This Week</h3>
          <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>₹{formatAmount(weekSpend)}</p>
        </div>
        
        {/* Top Category */}
        <div className="p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)', borderLeft: '4px solid #8b5cf6' }}>
          <h3 className="text-sm font-medium text-gray-500">Top Category</h3>
          {Object.keys(categorySpend).length > 0 ? (
            <>
              <p className="text-lg font-semibold" style={{ color: '#8b5cf6' }}>
                {Object.entries(categorySpend).sort(([,a], [,b]) => b - a)[0][0]}
              </p>
              <p className="text-sm text-gray-500">
                ₹{formatAmount(Object.entries(categorySpend).sort(([,a], [,b]) => b - a)[0][1])}
              </p>
            </>
          ) : (
            <p className="text-lg font-semibold" style={{ color: '#8b5cf6' }}>No expenses</p>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categorySpend).length > 0 && (
        <div className="mb-6 p-4 rounded-lg shadow-md" style={{ background: 'var(--surface)' }}>
          <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--primary)' }}>Category Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(categorySpend)
              .sort(([,a], [,b]) => b - a)
              .map(([category, amount]) => (
                <div key={category} className="p-3 rounded border" style={{ background: 'var(--accent-light)', borderColor: 'var(--muted)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{category}</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>₹{formatAmount(amount)}</p>
                  <p className="text-xs text-gray-500">
                    {((amount / totalSpend) * 100).toFixed(1)}% of total
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Draft Expenses Section */}
      {draftExpenses.length > 0 && (
        <div className="shadow-lg rounded-lg p-6 mb-6" style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '2px solid #8b5cf6' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: '#8b5cf6' }}>
            <span className="mr-2">📝</span>Draft Expenses
            <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Not Submitted</span>
          </h2>
          <table className="min-w-full text-sm border-separate border-spacing-y-1" style={{ background: 'var(--surface)' }}>
            <thead>
              <tr style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--foreground)' }}>
                <th className="px-4 py-2 text-left rounded-tl-lg">Date</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Proof</th>
                <th className="px-4 py-2 text-center rounded-tr-lg">Actions</th>
              </tr>
            </thead>
            <tbody>
              {draftExpenses.map((exp, idx) => (
                <tr key={exp.id} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'rgba(139,92,246,0.05)', borderRadius: 8 }}>
                  <td className="px-4 py-2 align-top rounded-l-lg">{new Date(exp.createdAt.seconds * 1000).toLocaleDateString()}</td>
                  <td className="px-4 py-2 align-top capitalize">{exp.category || 'N/A'}</td>
                  <td className="px-4 py-2 align-top text-right">₹{formatAmount(exp.total)}</td>
                  <td className="px-4 py-2 align-top text-center">
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        background: 'rgba(139,92,246,0.15)',
                        color: '#8b5cf6',
                      }}
                    >
                      Draft
                    </span>
                  </td>
                  <td className="px-4 py-2 align-top text-center">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {exp.billImages && exp.billImages.map((url: string, imgIdx: number) => (
                        isImageUrl(url) ? (
                          <a key={imgIdx} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Proof ${imgIdx + 1}`} className="w-12 h-12 object-cover rounded border hover:scale-105 transition-transform" style={{ borderColor: 'var(--muted)' }} />
                          </a>
                        ) : (
                          <a key={imgIdx} href={url} target="_blank" rel="noopener noreferrer" className="inline-block px-3 py-1 rounded shadow hover:bg-opacity-80 transition text-xs" style={{ background: '#8b5cf6', color: 'white' }}>
                            📄 View
                          </a>
                        )
                      ))}
                      {(!exp.billImages || exp.billImages.length === 0) && (
                        <span className="text-gray-400 text-xs">No attachments</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 align-top rounded-r-lg text-center">
                    <div className="flex gap-2 justify-center flex-wrap">
                      <button
                        className="px-3 py-1 rounded text-xs font-medium transition-colors duration-200 hover:opacity-80"
                        style={{ background: '#8b5cf6', color: 'white' }}
                        onClick={() => handleEditDraft(exp)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1 rounded text-xs font-medium transition-colors duration-200 hover:opacity-80"
                        style={{ background: '#06b6d4', color: 'white' }}
                        onClick={() => {
                          setDraftToSubmit(exp);
                          setSubmitConfirmOpen(true);
                        }}
                      >
                        Submit Now
                      </button>
                      <button
                        className="px-3 py-1 rounded text-xs font-medium transition-colors duration-200 hover:opacity-80"
                        style={{ background: '#ef4444', color: 'white' }}
                        onClick={() => {
                          setDraftToDelete(exp.id);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Personal Expenses Section */}
      {personalExpenses.length > 0 && (
        <div className="shadow-lg rounded-lg p-6 mb-6" style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '2px solid #10b981' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: '#10b981' }}>
            <span className="mr-2">📊</span>Personal Expense Tracking
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">No Approval Needed</span>
          </h2>
          <table className="min-w-full text-sm border-separate border-spacing-y-1" style={{ background: 'var(--surface)' }}>
            <thead>
              <tr style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--foreground)' }}>
                <th className="px-4 py-2 text-left rounded-tl-lg">Date</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center rounded-tr-lg">Proof</th>
              </tr>
            </thead>
            <tbody>
              {personalExpenses.map((exp, idx) => (
                <tr key={exp.id} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'rgba(16,185,129,0.05)', borderRadius: 8 }}>
                  <td className="px-4 py-2 align-top rounded-l-lg">{new Date(exp.createdAt.seconds * 1000).toLocaleDateString()}</td>
                  <td className="px-4 py-2 align-top">{exp.purpose || exp.category}</td>
                  <td className="px-4 py-2 align-top text-right">₹{formatAmount(exp.total)}</td>
                  <td className="px-4 py-2 align-top text-center">
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        background: 'rgba(16,185,129,0.15)',
                        color: '#10b981',
                      }}
                    >
                      Personal Tracking
                    </span>
                  </td>
                  <td className="px-4 py-2 align-top rounded-r-lg text-center">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {exp.billImages && exp.billImages.map((url: string, idx: number) => (
                        isImageUrl(url) ? (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Proof ${idx + 1}`} className="w-12 h-12 object-cover rounded border hover:scale-105 transition-transform" style={{ borderColor: 'var(--muted)' }} />
                          </a>
                        ) : (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-block px-3 py-1 rounded shadow hover:bg-opacity-80 transition text-xs" style={{ background: '#10b981', color: 'white' }}>
                            📄 View
                          </a>
                        )
                      ))}
                      {(!exp.billImages || exp.billImages.length === 0) && (
                        <span className="text-gray-400 text-xs">No attachments</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Regular Expenses Section (Approval Workflow) */}
      {expenses.length > 0 && (
        <div className="shadow-lg rounded-lg p-6" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
          <h2 className="text-xl font-bold mb-4 flex items-center" style={{ color: 'var(--primary)' }}>
            <span className="mr-2">💼</span>Official/Site Expenses
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Approval Required</span>
          </h2>
          <table className="min-w-full text-sm border-separate border-spacing-y-1" style={{ background: 'var(--surface)' }}>
            <thead>
              <tr style={{ background: 'var(--accent-light)', color: 'var(--foreground)' }}>
                <th className="px-4 py-2 text-left rounded-tl-lg">Date</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center rounded-tr-lg">Proof</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp, idx) => (
              <tr key={exp.id} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--accent-light)', borderRadius: 8 }}>
                <td className="px-4 py-2 align-top rounded-l-lg">{new Date(exp.createdAt.seconds * 1000).toLocaleDateString()}</td>
                <td className="px-4 py-2 align-top">{exp.purpose || exp.category}</td>
                <td className="px-4 py-2 align-top text-right">₹{formatAmount(exp.total)}</td>
                <td className="px-4 py-2 align-top text-center">
                  <span
                    className="inline-block px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      background:
                        exp.status === 'Approve'
                          ? 'rgba(34,197,94,0.15)'
                          : exp.status === 'Reject'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(234,179,8,0.15)',
                      color:
                        exp.status === 'Approve'
                          ? '#22c55e'
                          : exp.status === 'Reject'
                          ? '#ef4444'
                          : '#eab308',
                    }}
                  >
                    {exp.status || 'Under Review'}
                  </span>
                </td>
                <td className="px-4 py-2 align-top rounded-r-lg text-center">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {exp.billImages && exp.billImages.map((url: string, idx: number) => (
                      isImageUrl(url) ? (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Proof ${idx + 1}`} className="w-12 h-12 object-cover rounded border hover:scale-105 transition-transform" style={{ borderColor: 'var(--muted)' }} />
                        </a>
                      ) : (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-block px-3 py-1 rounded shadow hover:bg-opacity-80 transition" style={{ background: 'var(--primary)', color: 'var(--surface)' }}>
                          View Document
                        </a>
                      )
                    ))}
                  </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      )}

      {/* Message when no expenses exist */}
      {expenses.length === 0 && personalExpenses.length === 0 && draftExpenses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">No expenses found.</p>
          <p className="text-sm text-gray-400 mt-2">Start by adding your first expense!</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          className="fixed z-50 inset-0 flex items-center justify-center"
        >
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            aria-hidden="true"
          />
          <Card className="relative p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full mx-4 z-10">
            <Dialog.Title
              className="text-xl font-semibold text-center mb-4"
              style={{ color: "var(--primary)" }}
            >
              Delete Draft?
            </Dialog.Title>
            <Dialog.Description
              className="text-center text-sm mb-6"
              style={{ color: "var(--foreground)" }}
            >
              Are you sure you want to delete this draft expense? This action cannot be undone.
            </Dialog.Description>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                style={{
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  border: "2px solid var(--muted)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDraft}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                style={{
                  background: "#ef4444",
                  color: "white",
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </Card>
        </Dialog>
      )}

      {/* Submit Draft Confirmation Modal */}
      {submitConfirmOpen && (
        <Dialog
          open={submitConfirmOpen}
          onClose={() => setSubmitConfirmOpen(false)}
          className="fixed z-50 inset-0 flex items-center justify-center"
        >
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            aria-hidden="true"
          />
          <Card className="relative p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full mx-4 z-10">
            <Dialog.Title
              className="text-xl font-semibold text-center mb-4"
              style={{ color: "var(--primary)" }}
            >
              Submit Draft for Approval?
            </Dialog.Title>
            <Dialog.Description
              className="text-center text-sm mb-6"
              style={{ color: "var(--foreground)" }}
            >
              This will submit your draft expense for approval. Once submitted, you won't be able to edit it as a draft anymore.
            </Dialog.Description>
            {draftToSubmit && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="font-semibold">₹{formatAmount(draftToSubmit.total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Category:</span>
                  <span className="font-semibold capitalize">{draftToSubmit.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Date:</span>
                  <span className="font-semibold">{new Date(draftToSubmit.createdAt.seconds * 1000).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Attachments:</span>
                  <span className="font-semibold">{draftToSubmit.billImages?.length || 0} file(s)</span>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setSubmitConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                style={{
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  border: "2px solid var(--muted)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDraft}
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                style={{
                  background: "var(--primary)",
                  color: "var(--surface)",
                }}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </Card>
        </Dialog>
      )}
    </div>
  );
} 