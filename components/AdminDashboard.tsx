'use client';
import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { Card, Input, Button } from "./ui/shadcn";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Dialog } from '@headlessui/react';

const ADMIN_EMAILS = ['bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com','kunal.nihalani@icloud.com'];

export default function AdminDashboard() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [previewExpense, setPreviewExpense] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState<Record<string, string>>({});
  const [paidDraft, setPaidDraft] = useState<Record<string, string>>({});
  const [lockedExpenses, setLockedExpenses] = useState<Record<string, boolean>>({});

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
      // Filtering by month and department if provided
      if (filterMonth) {
        q = query(q, where('date', '>=', `${filterMonth}-01`), where('date', '<=', `${filterMonth}-31`));
      }
      if (filterDept) {
        q = query(q, where('user.department', '==', filterDept));
      }
      const snapshot = await getDocs(q);
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err: any) {
      setError(err.message || 'Error fetching expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line
  }, [filterMonth, filterDept]);

  const handleStatusChange = async (id: string, status: string) => {
    await updateDoc(doc(db, 'expenses', id), { status });
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
    await updateDoc(doc(db, 'expenses', id), { paidDate: now, locked: true });
    setLockedExpenses((prev) => ({ ...prev, [id]: true }));
    fetchExpenses();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

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

  return (
    <Card className="mt-6">
      <div className="flex gap-4 mb-4">
        <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} label="Filter by Month" />
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 border rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
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
        <Button onClick={fetchExpenses}>Refresh</Button>
        <Button onClick={handleDownloadMasterExcel} className="bg-green-600 hover:bg-green-700">Open in Excel</Button>
      </div>
      <table className="min-w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Department</th>
            <th className="px-4 py-2 text-left">Date Added</th>
            <th className="px-4 py-2 text-right">Total</th>
            <th className="px-4 py-2 text-right">Paid</th>
            <th className="px-4 py-2 text-right">Balance</th>
            <th className="px-4 py-2 text-center">Status</th>
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
                className={
                  `${isLocked ? 'opacity-50 pointer-events-none' : ''} ` +
                  (idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800')
                }
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
                    <Button type="button" className="bg-blue-600 px-2 py-1" onClick={() => handlePaidSave(exp.id, exp.total)} disabled={isLocked}>Save</Button>
                  </div>
                </td>
                <td className="px-4 py-2 align-top text-right">{(exp.total || 0) - (Number(exp.paid) || 0)}</td>
                <td className="px-4 py-2 align-top text-center">
                  <select
                    value={exp.status || 'Under Review'}
                    onChange={e => handleStatusChange(exp.id, e.target.value)}
                    disabled={isLocked}
                    className={
                      `px-2 py-1 rounded border transition-colors ` +
                      (exp.status === 'Reject'
                        ? 'bg-red-600 text-white border-red-700'
                        : exp.status === 'Approve'
                        ? 'bg-green-400 text-black border-green-600'
                        : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300')
                    }
                  >
                    <option value="Approve" className="bg-green-400 text-black">Approve</option>
                    <option value="Reject" className="bg-red-600 text-white">Reject</option>
                    <option value="Under Review">Under Review</option>
                  </select>
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
                  <button onClick={() => handlePreview(exp)} className="text-blue-600 underline mr-2" disabled={isLocked}>Preview</button>
                  <Button type="button" className="bg-gray-600 px-2 py-1" onClick={() => handleCloseExpense(exp.id)} disabled={isLocked}>
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
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-lg w-full z-10">
            <Dialog.Title className="text-xl font-bold mb-4">Expense Preview</Dialog.Title>
            <div className="space-y-2">
              <div><b>Name:</b> {previewExpense.user?.name}</div>
              <div><b>Email:</b> {previewExpense.user?.email}</div>
              <div><b>Date:</b> {previewExpense.date}</div>
              <div><b>Purpose:</b> {previewExpense.purpose}</div>
              <div><b>Hotel:</b> ₹{previewExpense.hotel}</div>
              <div><b>Transport:</b> ₹{previewExpense.transport}</div>
              <div><b>Fuel:</b> ₹{previewExpense.fuel}</div>
              <div><b>Meals:</b> ₹{previewExpense.meals}</div>
              <div><b>Entertainment:</b> ₹{previewExpense.entertainment}</div>
              <div><b>Notes:</b> {previewExpense.notes}</div>
              <div><b>Total:</b> ₹{previewExpense.total}</div>
              <div><b>Status:</b> {previewExpense.status || 'Under Review'}</div>
              <div><b>Remarks:</b> {previewExpense.remarks || '-'}</div>
              {previewExpense.file && (
                <div><b>Document:</b> <a href={previewExpense.file} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a></div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={closePreview}>Close</Button>
            </div>
          </div>
        </Dialog>
      )}
    </Card>
  );
} 