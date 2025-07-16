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
  food: '',
  transport: '',
  hotel: '',
  fuel: '',
  site: '',
  notes: '',
  file: null as File | null,
  others: [] as { label: string; amount: string }[],
};

export default function ExpenseForm() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const total =
    [form.food, form.transport, form.hotel, form.fuel, form.site]
      .map(Number)
      .reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)
    + form.others.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleOtherChange = (idx: number, field: 'label' | 'amount', value: string) => {
    setForm((prev) => {
      const updated = [...prev.others];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, others: updated };
    });
  };

  const addOtherField = () => {
    setForm((prev) => ({ ...prev, others: [...prev.others, { label: '', amount: '' }] }));
  };

  const removeOtherField = (idx: number) => {
    setForm((prev) => {
      const updated = [...prev.others];
      updated.splice(idx, 1);
      return { ...prev, others: updated };
    });
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
      setSuccess('Expense submitted!');
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
          <Input name="food" value={form.food} onChange={handleChange} label="Food" type="number" min="0" />
          <Input name="transport" value={form.transport} onChange={handleChange} label="Transport" type="number" min="0" />
          <Input name="hotel" value={form.hotel} onChange={handleChange} label="Hotel" type="number" min="0" />
          <Input name="fuel" value={form.fuel} onChange={handleChange} label="Fuel" type="number" min="0" />
          <Input name="site" value={form.site} onChange={handleChange} label="Site" type="number" min="0" />
        </div>
        <div className="space-y-2">
          {form.others.map((other, idx) => (
            <div key={idx} className="flex gap-2 items-end">
              <Input
                type="text"
                value={other.label}
                onChange={e => handleOtherChange(idx, 'label', e.target.value)}
                label={idx === 0 ? 'Others (label)' : ''}
                placeholder="Other expense label"
              />
              <Input
                type="number"
                value={other.amount}
                onChange={e => handleOtherChange(idx, 'amount', e.target.value)}
                label={idx === 0 ? 'Amount' : ''}
                placeholder="Amount"
                min="0"
              />
              <Button type="button" className="bg-red-500 px-2 py-1" onClick={() => removeOtherField(idx)}>-</Button>
            </div>
          ))}
          <Button type="button" className="bg-blue-500" onClick={addOtherField}>+ Add Other expense</Button>
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