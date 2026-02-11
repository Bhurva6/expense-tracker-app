'use client';
import React, { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider, useLanguage, Language } from '../context/LanguageContext';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseTable from '../components/ExpenseTable';
import AdminDashboard from '../components/AdminDashboard';
import Navbar from '../components/Navbar';
import EmployeeProjects from '../components/EmployeeProjects';
import ProjectExpenseForm from '../components/ProjectExpenseForm';

const ADMIN_EMAILS = [
  'bhurvaxsharma.india@gmail.com',
  'nitishjain0109@gmail.com',
  'neetu@panachegreen.com',
  'hrd@panachegreen.com',
  'brijesh@panachegreen.com',
  'accounts@panachegreen.com',
];

const MOTIVATIONAL_QUOTES = [
  "Success is not the key to happiness. Happiness is the key to success.",
  "The only way to do great work is to love what you do.",
  "Don’t watch the clock; do what it does. Keep going.",
  "Opportunities don't happen, you create them.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Dream bigger. Do bigger.",
  "Don’t stop when you’re tired. Stop when you’re done.",
  "Great things never come from comfort zones.",
  "Push yourself, because no one else is going to do it for you.",
  "Success doesn’t just find you. You have to go out and get it."
];

function MainPageContent() {
  const { user, loading, signIn, signInWithPhone, verifyOTP, signOutUser, confirmationResult, phoneSignInLoading, clearRecaptcha, updateDisplayName } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'add' | 'track' | 'admin' | 'project'>('add');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<'google' | 'phone'>('google');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [phoneName, setPhoneName] = useState('');
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const randomQuote = useMemo(() => {
    return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  }, []);

  // Check for project tab in URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    const projectId = searchParams.get('projectId');
    if (tab === 'project' && projectId) {
      setActiveTab('project');
      setSelectedProjectId(projectId);
    }
  }, [searchParams]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, ''); // Only digits
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  if (loading) return <div>{t('loading')}</div>;
  if (!user)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {/* Language Selector */}
        <div className="absolute top-6 right-6">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="px-4 py-2 rounded border"
            style={{ 
              borderColor: 'var(--primary)',
              background: 'var(--surface)',
              color: 'var(--foreground)'
            }}
          >
            <option value="en">{t('language_en')}</option>
            <option value="hi">{t('language_hi')}</option>
            <option value="mr">{t('language_mr')}</option>
            <option value="gu">{t('language_gu')}</option>
          </select>
        </div>

        <Image
          src="/panache_green_logo.jpeg"
          alt="Panache Green Logo"
          width={150}
          height={150}
        />
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center" style={{ color: 'var(--primary)' }}>
          {t('welcome_title')}
        </h1>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => {
              setLoginMethod('google');
              clearRecaptcha();
              setShowOtpInput(false);
              setPhoneNumber('');
              setOtp(['', '', '', '', '', '']);
              setPhoneName('');
            }}
            className={`px-4 py-2 rounded ${loginMethod === 'google' ? 'text-white' : ''}`}
            style={{ background: loginMethod === 'google' ? 'var(--primary)' : 'var(--surface)', color: loginMethod === 'google' ? 'var(--surface)' : 'var(--foreground)' }}
          >
            {t('google_signin')}
          </button>
          <button
            onClick={() => {
              setLoginMethod('phone');
              clearRecaptcha();
              setShowOtpInput(false);
              setPhoneNumber('');
              setOtp(['', '', '', '', '', '']);
              setPhoneName('');
            }}
            className={`px-4 py-2 rounded ${loginMethod === 'phone' ? 'text-white' : ''}`}
            style={{ background: loginMethod === 'phone' ? 'var(--primary)' : 'var(--surface)', color: loginMethod === 'phone' ? 'var(--surface)' : 'var(--foreground)' }}
          >
            {t('phone_signin')}
          </button>
        </div>
        {loginMethod === 'google' && (
          <button onClick={signIn} className="text-white px-4 py-2 rounded" style={{ background: 'var(--primary)' }}>
            {t('sign_in_google')}
          </button>
        )}
        {loginMethod === 'phone' && !showOtpInput && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center border rounded" style={{ borderColor: 'var(--primary)' }}>
              <span className="px-2 py-2" style={{ background: 'var(--accent-light)' }}>+91</span>
              <input
                type="tel"
                placeholder={t('enter_phone')}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="px-4 py-2 flex-1"
                style={{ border: 'none', outline: 'none' }}
              />
            </div>
            <input
              type="text"
              placeholder={t('enter_name')}
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
                  alert(t('error_sending_otp'));
                }
              }}
              disabled={phoneSignInLoading || phoneNumber.length !== 10 || !phoneName.trim()}
              className="text-white px-4 py-2 rounded disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {phoneSignInLoading ? t('sending_otp') : t('send_otp')}
            </button>
          </div>
        )}
        {loginMethod === 'phone' && showOtpInput && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="number"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-12 text-center border rounded"
                  style={{ borderColor: 'var(--primary)' }}
                  inputMode="numeric"
                  maxLength={1}
                  ref={(el) => { otpInputsRef.current[index] = el; }}
                />
              ))}
            </div>
            <button
              onClick={async () => {
                try {
                  await verifyOTP(otp.join(''));
                  await updateDisplayName(phoneName.trim());
                  setShowOtpInput(false);
                  setPhoneNumber('');
                  setOtp(['', '', '', '', '', '']);
                  setPhoneName('');
                } catch (error) {
                  alert('Invalid OTP. Please try again.');
                }
              }}
              disabled={phoneSignInLoading || otp.some(d => d === '')}
              className="text-white px-4 py-2 rounded disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {phoneSignInLoading ? t('verifying') : t('verify_otp')}
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
      
      {/* Employee Projects Section - Always visible for non-admins, above tabs */}
      {!isAdmin && <EmployeeProjects onProjectClick={(projectId) => setSelectedProjectId(projectId)} />}
      
      <div className="flex gap-4 mb-6 border-b pb-2">
        <button
          className={`px-4 py-2 rounded-t ${activeTab === 'add' ? 'text-white' : ''}`}
          style={{ background: activeTab === 'add' ? 'var(--primary)' : 'var(--surface)', color: activeTab === 'add' ? 'var(--surface)' : 'var(--foreground)' }}
          onClick={() => {
            setActiveTab('add');
            setSelectedProjectId(null);
          }}
        >
          {t('add_new_expense')}
        </button>
        <button
          className={`px-4 py-2 rounded-t ${activeTab === 'track' ? 'text-white' : ''}`}
          style={{ background: activeTab === 'track' ? 'var(--primary)' : 'var(--surface)', color: activeTab === 'track' ? 'var(--surface)' : 'var(--foreground)' }}
          onClick={() => {
            setActiveTab('track');
            setSelectedProjectId(null);
          }}
        >
          {t('track_expenses')}
        </button>
        {isAdmin && (
          <button
            className={`px-4 py-2 rounded-t ${activeTab === 'admin' ? 'text-white' : ''}`}
            style={{ background: activeTab === 'admin' ? 'var(--accent)' : 'var(--surface)', color: activeTab === 'admin' ? 'var(--surface)' : 'var(--foreground)' }}
            onClick={() => {
              setActiveTab('admin');
              setSelectedProjectId(null);
            }}
          >
            {t('admin_dashboard')}
          </button>
        )}
      </div>
      
      {/* Project Expense Form - Shows when project is selected */}
      {activeTab === 'project' && selectedProjectId && (
        <div className="mb-6">
          <button
            onClick={() => {
              setActiveTab('add');
              setSelectedProjectId(null);
            }}
            className="mb-4 px-4 py-2 rounded text-white"
            style={{ background: 'var(--primary)' }}
          >
            ← Back to Expenses
          </button>
          <ProjectExpenseForm 
            projectId={selectedProjectId} 
            onBack={() => {
              setActiveTab('track');
              setSelectedProjectId(null);
            }} 
          />
        </div>
      )}
      
      {activeTab === 'add' && (
        <>
          <div className="mb-6 text-center text-lg italic text-gray-700" style={{ color: 'var(--primary)' }}>
            "{randomQuote}"
          </div>
          <ExpenseForm onExpenseAdded={() => setActiveTab('track')} />
        </>
      )}
      {activeTab === 'track' && <ExpenseTable />}
      {isAdmin && activeTab === 'admin' && <AdminDashboard />}
    </div>
  );
}

export default function Page() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <MainPageContent />
        </Suspense>
      </AuthProvider>
    </LanguageProvider>
  );
}
