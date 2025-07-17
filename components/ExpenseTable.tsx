'use client';
import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Card } from "./ui/shadcn";

export default function ExpenseTable() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchExpenses = async () => {
      try {
        const q = query(
          collection(db, 'expenses'),
          where('user.uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
  if (!expenses.length) return <div>No expenses found.</div>;

  return (
    <Card className="mt-6">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th>Date</th>
            <th>Purpose</th>
            <th>Total</th>
            <th>Status</th>
            <th>Document</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(exp => (
            <tr key={exp.id}>
              <td>{exp.date}</td>
              <td>{exp.purpose || exp.category}</td>
              <td>₹{exp.total}</td>
              <td>{exp.status || 'Submitted'}</td>
              <td>
                {exp.file ? (
                  <a href={exp.file} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
} 