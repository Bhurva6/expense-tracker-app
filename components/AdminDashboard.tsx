'use client';
import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { Card, Input, Button } from "./ui/shadcn";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Dialog } from '@headlessui/react';

const ADMIN_EMAILS = ['admin@your-company.com'];

export default function AdminDashboard() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [previewExpense, setPreviewExpense] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const handlePreview = (exp: any) => {
    setPreviewExpense(exp);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewExpense(null);
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
          Miscellaneous: exp.miscellaneous,
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

  return (
    <Card className="mt-6">
      <div className="flex gap-4 mb-4">
        <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} label="Filter by Month" />
        <Input value={filterDept} onChange={e => setFilterDept(e.target.value)} label="Filter by Department" />
        <Button onClick={fetchExpenses}>Refresh</Button>
        <Button onClick={handleDownloadMasterExcel} className="bg-green-600 hover:bg-green-700">Open in Excel</Button>
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th>Name</th>
            <th>Department</th>
            <th>Month</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Paid Date</th>
            <th>Remarks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(exp => (
            <tr key={exp.id}>
              <td>{exp.user?.name}</td>
              <td>{exp.user?.department || '-'}</td>
              <td>{exp.date?.slice(0, 7)}</td>
              <td>₹{exp.total}</td>
              <td>{exp.paid || '-'}</td>
              <td>{exp.balance || '-'}</td>
              <td>
                <select value={exp.status || 'Under Review'} onChange={e => handleStatusChange(exp.id, e.target.value)}>
                  <option value="Approve">Approve</option>
                  <option value="Reject">Reject</option>
                  <option value="Under Review">Under Review</option>
                </select>
              </td>
              <td>{exp.paidDate || '-'}</td>
              <td>
                <Input
                  value={exp.remarks || ''}
                  onChange={e => handleRemarksChange(exp.id, e.target.value)}
                  label="Remarks"
                />
              </td>
              <td>
                <button onClick={() => handlePreview(exp)} className="text-blue-600 underline mr-2">Preview</button>
                <a href={exp.file} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Doc</a>
              </td>
            </tr>
          ))}
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
              <div><b>Miscellaneous:</b> ₹{previewExpense.miscellaneous}</div>
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