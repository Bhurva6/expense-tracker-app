import React from 'react';

interface NavbarProps {
  user: { displayName?: string | null; email?: string | null };
  isAdmin: boolean;
  signOutUser: () => void;
  showAdminButton?: boolean;
}

export default function Navbar({ user, isAdmin, signOutUser, showAdminButton }: NavbarProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Employee Expense Tracker</h1>
      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold text-blue-700 dark:text-blue-300 mr-4">
          Welcome, {user.displayName || user.email}!
        </div>
        {isAdmin && showAdminButton && (
          <a
            href="/admin"
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Admin Dashboard
          </a>
        )}
        {isAdmin && !showAdminButton && (
          <a
            href="/"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Back to App
          </a>
        )}
        <button onClick={signOutUser} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors">Sign Out</button>
      </div>
    </div>
  );
} 