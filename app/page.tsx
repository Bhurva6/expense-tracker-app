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
  'hrd@panachegreen.com',
  'brijesh@panachegreen.com',
  'accounts@panachegreen.com',
];

function MainPage() {
  const { user, loading, signIn, signInWithPhone, verifyOTP, signOutUser, confirmationResult, phoneSignInLoading, clearRecaptcha } = useAuth();
  const [activeTab, setActiveTab] = useState<'add' | 'track' | 'admin'>('add');
  const [loginMethod, setLoginMethod] = useState<'google' | 'phone'>('google');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

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
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => {
              setLoginMethod('google');
              clearRecaptcha();
              setShowOtpInput(false);
              setPhoneNumber('');
              setOtp('');
            }}
            className={`px-4 py-2 rounded ${loginMethod === 'google' ? 'text-white' : ''}`}
            style={{ background: loginMethod === 'google' ? 'var(--primary)' : 'var(--surface)', color: loginMethod === 'google' ? 'var(--surface)' : 'var(--foreground)' }}
          >
            Google Sign In
          </button>
          <button
            onClick={() => {
              setLoginMethod('phone');
              clearRecaptcha();
            }}
            className={`px-4 py-2 rounded ${loginMethod === 'phone' ? 'text-white' : ''}`}
            style={{ background: loginMethod === 'phone' ? 'var(--primary)' : 'var(--surface)', color: loginMethod === 'phone' ? 'var(--surface)' : 'var(--foreground)' }}
          >
            Phone Sign In
          </button>
        </div>
        {loginMethod === 'google' && (
          <button onClick={signIn} className="text-white px-4 py-2 rounded" style={{ background: 'var(--primary)' }}>
            Sign in with Google
          </button>
        )}
        {loginMethod === 'phone' && !showOtpInput && (
          <div className="flex flex-col items-center gap-4">
            <input
              type="tel"
              placeholder="Enter phone number (+1234567890)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="px-4 py-2 border rounded"
              style={{ borderColor: 'var(--primary)' }}
            />
            <button
              onClick={async () => {
                try {
                  await signInWithPhone(phoneNumber);
                  setShowOtpInput(true);
                } catch (error) {
                  alert('Error sending OTP. Please try again.');
                }
              }}
              disabled={phoneSignInLoading || !phoneNumber}
              className="text-white px-4 py-2 rounded disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {phoneSignInLoading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </div>
        )}
        {loginMethod === 'phone' && showOtpInput && (
          <div className="flex flex-col items-center gap-4">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="px-4 py-2 border rounded"
              style={{ borderColor: 'var(--primary)' }}
            />
            <button
              onClick={async () => {
                try {
                  await verifyOTP(otp);
                  setShowOtpInput(false);
                  setPhoneNumber('');
                  setOtp('');
                } catch (error) {
                  alert('Invalid OTP. Please try again.');
                }
              }}
              disabled={phoneSignInLoading || !otp}
              className="text-white px-4 py-2 rounded disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {phoneSignInLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        )}
        <div id="recaptcha-container"></div>
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
