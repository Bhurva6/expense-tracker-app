import React from 'react';
import { useTheme } from '../context/AuthContext';

interface NavbarProps {
  user: { displayName?: string | null; email?: string | null };
  isAdmin: boolean;
  signOutUser: () => void;
  showAdminButton?: boolean;
}

export default function Navbar({ user, isAdmin, signOutUser, showAdminButton }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="flex justify-between items-center mb-6" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
      <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>Panache Employee Expense Tracker</h1>
      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold mr-4" style={{ color: 'var(--secondary)' }}>
          Welcome, {user.displayName || user.email}!
        </div>
        <button
          onClick={toggleTheme}
          className="px-3 py-1 rounded transition-colors mr-2"
          style={{ background: 'var(--accent-light)', color: 'var(--secondary)', border: '1px solid var(--muted)' }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>
        {isAdmin && showAdminButton && (
          <a
            href="/admin"
            className="px-4 py-2 rounded"
            style={{ background: 'var(--accent)', color: 'var(--surface)' }}
          >
            Admin Dashboard
          </a>
        )}
        {isAdmin && !showAdminButton && (
          <a
            href="/"
            className="px-4 py-2 rounded"
            style={{ background: 'var(--primary)', color: 'var(--surface)' }}
          >
            Back to App
          </a>
        )}
        <button onClick={signOutUser} className="px-3 py-1 rounded transition-colors" style={{ background: 'var(--muted)', color: 'var(--surface)' }}>Sign Out</button>
      </div>
    </div>
  );
} 