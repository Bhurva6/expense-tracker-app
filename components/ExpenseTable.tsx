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

    expenses.forEach((exp: any) => {
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

      <div className="shadow-lg rounded-lg p-6" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--primary)' }}>My Expenses</h2>
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
    </div>
  );
} 