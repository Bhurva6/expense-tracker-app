import React from 'react';

export function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block" style={{ color: 'var(--foreground)' }}>
      {label && <span className="block mb-1 text-sm font-semibold" style={{ color: 'var(--secondary)' }}>{label}</span>}
      <input
        className="themed-input w-full px-3 py-2 border rounded focus:outline-none focus:ring-2"
        style={{
          background: 'var(--surface)',
          color: 'var(--foreground)',
          borderColor: 'var(--muted)',
          fontFamily: 'var(--font-sans)',
          boxShadow: 'none',
        }}
        {...props}
      />
    </label>
  );
}

export function Button({ className = '', style = {}, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 rounded disabled:opacity-50 transition-colors ${className}`}
      style={{
        background: 'var(--primary)',
        color: 'var(--surface)',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      onMouseOver={e => (e.currentTarget.style.background = 'var(--secondary)')}
      onMouseOut={e => (e.currentTarget.style.background = 'var(--primary)')}
      {...props}
    />
  );
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`shadow rounded p-4 ${className}`}
      style={{
        background: 'var(--surface)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </div>
  );
} 