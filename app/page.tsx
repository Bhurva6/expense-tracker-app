'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseTable from '../components/ExpenseTable';
import AdminDashboard from '../components/AdminDashboard';
import Navbar from '../components/Navbar';

const ADMIN_EMAILS = [
  'bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com',
  'kunal.nihalani@icloud.com',
  'hrd@panachegreen.com',
  'brijesh@panachegreen.com',
  'accounts@panachegreen.com',
];

function MainPage() {
  const { user, loading, signIn, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'add' | 'track' | 'admin'>('add');

  if (loading) return <div>Loading...</div>;
  if (!user)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Image
          src="/panache_green_logo.jpeg"
          alt="Panache Green Logo"
          width={150}
          height={150}
        />
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center" style={{ color: 'var(--primary)' }}>
          Welcome to Panache Greens Employee Expense Tracker
        </h1>
        <button onClick={signIn} className="text-white px-4 py-2 rounded" style={{ background: 'var(--primary)' }}>Sign in with Google</button>
      </div>
    );

  const isAdmin = ADMIN_EMAILS.includes(user.email || '');

  return (
    <div className="container mx-auto p-4">
      <Navbar user={user} isAdmin={isAdmin} signOutUser={signOutUser} showAdminButton={true} />
      <div className="flex gap-4 mb-6 border-b pb-2">
        <button
          className={`px-4 py-2 rounded-t ${activeTab === 'add' ? 'text-white' : ''}`}
          style={{ background: activeTab === 'add' ? 'var(--primary)' : 'var(--surface)', color: activeTab === 'add' ? 'var(--surface)' : 'var(--foreground)' }}
          onClick={() => setActiveTab('add')}
        >
          Add New Expense
        </button>
        <button
          className={`px-4 py-2 rounded-t ${activeTab === 'track' ? 'text-white' : ''}`}
          style={{ background: activeTab === 'track' ? 'var(--primary)' : 'var(--surface)', color: activeTab === 'track' ? 'var(--surface)' : 'var(--foreground)' }}
          onClick={() => setActiveTab('track')}
        >
          Track My Expenses
        </button>
        {isAdmin && (
          <button
            className={`px-4 py-2 rounded-t ${activeTab === 'admin' ? 'text-white' : ''}`}
            style={{ background: activeTab === 'admin' ? 'var(--accent)' : 'var(--surface)', color: activeTab === 'admin' ? 'var(--surface)' : 'var(--foreground)' }}
            onClick={() => setActiveTab('admin')}
          >
            Admin Dashboard
          </button>
        )}
      </div>
      {activeTab === 'add' && <ExpenseForm onExpenseAdded={() => setActiveTab('track')} />}
      {activeTab === 'track' && <ExpenseTable />}
      {isAdmin && activeTab === 'admin' && <AdminDashboard />}
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <MainPage />
    </AuthProvider>
  );
}
