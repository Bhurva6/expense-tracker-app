'use client';
import React from 'react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import AdminDashboard from '../../components/AdminDashboard';
import Navbar from '../../components/Navbar';

const ADMIN_EMAILS = [
  'bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com',
  'kunal.nihalani@icloud.com',
  'hrd@panachegreen.com',
  'brijesh@panachegreen.com',
  'accounts@panachegreen.com',
];

function AdminPageContent() {
  const { user, loading, signOutUser } = useAuth();
  const isAdmin = ADMIN_EMAILS.includes(user?.email || '');

  if (loading) return <div>Loading...</div>;
  if (!user || !isAdmin) {
    return <div className="text-red-600 text-lg font-semibold">Access denied. You are not an admin.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Navbar user={user} isAdmin={isAdmin} signOutUser={signOutUser} showAdminButton={false} />
      <AdminDashboard />
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminPageContent />
    </AuthProvider>
  );
} 