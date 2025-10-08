'use client';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase';

const RecaptchaContainer = React.forwardRef<HTMLDivElement>((props, ref) => {
  return <div ref={ref} id="recaptcha-container" style={{ display: 'none' }} />;
});

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  confirmationResult: ConfirmationResult | null;
  phoneSignInLoading: boolean;
  clearRecaptcha: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneSignInLoading, setPhoneSignInLoading] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => {
      unsubscribe();
      // Clear reCAPTCHA on unmount
      clearRecaptcha();
    };
  }, []);

  const signIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    setLoading(false);
  };

  const signInWithPhone = async (phoneNumber: string) => {
    setPhoneSignInLoading(true);
    try {
      // Clear existing reCAPTCHA if it exists
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        setRecaptchaVerifier(null);
      }
      
      // Wait for the container to be available
      if (!recaptchaContainerRef.current) {
        throw new Error('reCAPTCHA container not found');
      }
      
      // Clear the container content
      recaptchaContainerRef.current.innerHTML = '';
      
      // Create new reCAPTCHA verifier
      const newRecaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
      });
      
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, newRecaptchaVerifier);
      setRecaptchaVerifier(newRecaptchaVerifier);
      setConfirmationResult(confirmation);
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    } finally {
      setPhoneSignInLoading(false);
    }
  };

  const verifyOTP = async (otp: string) => {
    if (!confirmationResult) throw new Error('No confirmation result');
    setPhoneSignInLoading(true);
    try {
      await confirmationResult.confirm(otp);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    } finally {
      setPhoneSignInLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    await signOut(auth);
    setLoading(false);
  };

  const clearRecaptcha = () => {
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      setRecaptchaVerifier(null);
    }
    
    // Clear the container content
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
    }
    
    setConfirmationResult(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithPhone, verifyOTP, signOutUser, confirmationResult, phoneSignInLoading, clearRecaptcha }}>
      {children}
      <RecaptchaContainer ref={recaptchaContainerRef} />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 

// Theme context for light/dark mode
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};