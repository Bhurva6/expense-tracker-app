'use client';
import React, { useState } from 'react';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Input, Button, Card } from "./ui/shadcn";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const initialState = {
  date: '',
  purpose: '',
  hotel: '',
  transport: '',
  fuel: '',
  meals: '',
  phone: '',
  entertainment: '',
  miscellaneous: '',
  notes: '',
  file: null as File | null,
};

export default function ExpenseForm() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const total =
    [form.hotel, form.transport, form.fuel, form.meals, form.entertainment, form.miscellaneous]
      .map(Number)
      .reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    let fileUrl = '';
    try {
      if (form.file) {
        const storageRef = ref(storage, `expense_docs/${user?.uid}/${Date.now()}_${form.file.name}`);
        await uploadBytes(storageRef, form.file);
        fileUrl = await getDownloadURL(storageRef);
      }
      const expenseData = {
        ...form,
        file: fileUrl,
        total,
        user: {
          uid: user?.uid,
          name: user?.displayName,
          email: user?.email,
        },
        createdAt: Timestamp.now(),
      };
      await addDoc(collection(db, 'expenses'), expenseData);
      // Generate Excel file
      const ws = XLSX.utils.json_to_sheet([
        {
          Date: form.date,
          Purpose: form.purpose,
          Hotel: form.hotel,
          Transport: form.transport,
          Fuel: form.fuel,
          Meals: form.meals,
          Entertainment: form.entertainment,
          Miscellaneous: form.miscellaneous,
          Notes: form.notes,
          Total: total,
          Name: user?.displayName,
          Email: user?.email,
          SubmittedAt: new Date().toLocaleString(),
        },
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Expense');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `expense_${form.date || Date.now()}.xlsx`);
      setSuccess('Expense submitted! Your entry has been downloaded as an Excel file.');
      setForm(initialState);
    } catch (err: any) {
      console.error('Expense submit error:', err);
      setError(err.message || 'Error submitting expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto p-6 mt-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input type="date" name="date" value={form.date} onChange={handleChange} required label="Date" />
          <Input name="purpose" value={form.purpose} onChange={handleChange} required label="Purpose/Description" />
          <Input name="hotel" value={form.hotel} onChange={handleChange} label="Hotel" type="number" min="0" />
          <Input name="transport" value={form.transport} onChange={handleChange} label="Transport" type="number" min="0" />
          <Input name="fuel" value={form.fuel} onChange={handleChange} label="Fuel" type="number" min="0" />
          <Input name="meals" value={form.meals} onChange={handleChange} label="Meals" type="number" min="0" />
          <Input name="phone" value={form.phone} onChange={handleChange} label="Phone" type="number" min="0" />
          <Input name="entertainment" value={form.entertainment} onChange={handleChange} label="Entertainment" type="number" min="0" />
          <Input name="miscellaneous" value={form.miscellaneous} onChange={handleChange} label="Miscellaneous" type="number" min="0" />
        </div>
        <Input name="notes" value={form.notes} onChange={handleChange} label="Notes" />
        <Input type="file" name="file" onChange={handleChange} label="Supporting Document (optional)" />
        <div className="font-bold">Total: ₹{total}</div>
        <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Expense'}</Button>
        {error && <div className="text-red-500">{error}</div>}
        {success && <div className="text-green-600 text-lg font-semibold text-center">{success}</div>}
      </form>
    </Card>
  );
} 