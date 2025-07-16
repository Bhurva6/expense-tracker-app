'use client';
import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseTable from '../components/ExpenseTable';
import AdminDashboard from '../components/AdminDashboard';
import Navbar from '../components/Navbar';

const ADMIN_EMAILS = [
  'bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com'
];

function MainPage() {
  const { user, loading, signIn, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'add' | 'track' | 'admin'>('add');

  if (loading) return <div>Loading...</div>;
  if (!user)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <button onClick={signIn} className="bg-blue-600 text-white px-4 py-2 rounded">Sign in with Google</button>
      </div>
    );

  const isAdmin = ADMIN_EMAILS.includes(user.email || '');

  return (
    <div className="container mx-auto p-4">
      <Navbar user={user} isAdmin={isAdmin} signOutUser={signOutUser} showAdminButton={true} />
      <div className="mb-4 text-lg font-semibold text-blue-700 dark:text-blue-300">Welcome, {user.displayName || user.email}!</div>
      <div className="flex gap-4 mb-6 border-b pb-2">
        <button
          className={`px-4 py-2 rounded-t ${activeTab === 'add' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}
          onClick={() => setActiveTab('add')}
        >
          Add New Expense
        </button>
        <button
          className={`px-4 py-2 rounded-t ${activeTab === 'track' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}
          onClick={() => setActiveTab('track')}
        >
          Track My Expenses
        </button>
        {isAdmin && (
          <button
            className={`px-4 py-2 rounded-t ${activeTab === 'admin' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}
            onClick={() => setActiveTab('admin')}
          >
            Admin Dashboard
          </button>
        )}
      </div>
      {activeTab === 'add' && <ExpenseForm />}
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
