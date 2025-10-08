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
  const { user, loading, signIn, signInWithPhone, verifyOTP, signOutUser, confirmationResult, phoneSignInLoading, clearRecaptcha, updateDisplayName } = useAuth();
  const [activeTab, setActiveTab] = useState<'add' | 'track' | 'admin'>('add');
  const [loginMethod, setLoginMethod] = useState<'google' | 'phone'>('google');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [phoneName, setPhoneName] = useState('');

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
              setPhoneName('');
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
              setShowOtpInput(false);
              setPhoneNumber('');
              setOtp('');
              setPhoneName('');
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
            <div className="flex items-center border rounded" style={{ borderColor: 'var(--primary)' }}>
              <span className="px-2 py-2" style={{ background: 'var(--accent-light)' }}>+91</span>
              <input
                type="tel"
                placeholder="Enter 10-digit number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="px-4 py-2 flex-1"
                style={{ border: 'none', outline: 'none' }}
              />
            </div>
            <input
              type="text"
              placeholder="Enter your name"
              value={phoneName}
              onChange={(e) => setPhoneName(e.target.value)}
              className="px-4 py-2 border rounded"
              style={{ borderColor: 'var(--primary)' }}
            />
            <button
              onClick={async () => {
                try {
                  await signInWithPhone('+91' + phoneNumber);
                  setShowOtpInput(true);
                } catch (error) {
                  alert('Error sending OTP. Please try again.');
                }
              }}
              disabled={phoneSignInLoading || phoneNumber.length !== 10 || !phoneName.trim()}
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
              type="number"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="px-4 py-2 border rounded"
              style={{ borderColor: 'var(--primary)' }}
              inputMode="numeric"
            />
            <button
              onClick={async () => {
                try {
                  await verifyOTP(otp);
                  await updateDisplayName(phoneName.trim());
                  setShowOtpInput(false);
                  setPhoneNumber('');
                  setOtp('');
                  setPhoneName('');
                } catch (error) {
                  alert('Invalid OTP. Please try again.');
                }
              }}
              disabled={phoneSignInLoading || otp.length !== 6}
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
