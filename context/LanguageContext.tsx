'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'mr' | 'gu';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  // Auth Page
  'welcome_title': {
    en: 'Welcome to Panache Greens Employee Expense Tracker',
    hi: 'पनाचे ग्रीन्स कर्मचारी व्यय ट्रैकर में आपका स्वागत है',
    mr: 'पनाचे ग्रीन्स कर्मचारी व्यय ट्रैकर मध्ये आपले स्वागत आहे',
    gu: 'પનાચે ગ્રીન્સ કર્મચારી ખર્ચ ટ્રેકરમાં આપનું સ્વાગત છે'
  },
  'google_signin': {
    en: 'Google Sign In',
    hi: 'गूगल से साइन इन करें',
    mr: 'गूगल वरून साइन इन करा',
    gu: 'ગૂગલ વરથી સાઇન ઇન કરો'
  },
  'phone_signin': {
    en: 'Phone Sign In',
    hi: 'फोन से साइन इन करें',
    mr: 'फोन वरून साइन इन करा',
    gu: 'ફોન વરથી સાઇન ઇન કરો'
  },
  'sign_in_google': {
    en: 'Sign in with Google',
    hi: 'गूगल के साथ साइन इन करें',
    mr: 'गूगलसह साइन इन करा',
    gu: 'ગૂગલ સાથે સાઇન ઇન કરો'
  },
  'enter_phone': {
    en: 'Enter 10-digit number',
    hi: '10 अंकों की संख्या दर्ज करें',
    mr: '10-अंकीय संख्या प्रविष्ट करा',
    gu: '10-અંકીય નંબર દાખલ કરો'
  },
  'enter_name': {
    en: 'Enter your name',
    hi: 'अपना नाम दर्ज करें',
    mr: 'आपले नाव प्रविष्ट करा',
    gu: 'તમારું નું દાખલ કરો'
  },
  'send_otp': {
    en: 'Send OTP',
    hi: 'OTP भेजें',
    mr: 'OTP पाठवा',
    gu: 'OTP મોકલો'
  },
  'sending_otp': {
    en: 'Sending OTP...',
    hi: 'OTP भेज रहे हैं...',
    mr: 'OTP पाठवत आहे...',
    gu: 'OTP મોકલી રહ્યા છીએ...'
  },
  'verify_otp': {
    en: 'Verify OTP',
    hi: 'OTP सत्यापित करें',
    mr: 'OTP सत्यापित करा',
    gu: 'OTP ચકાસો'
  },
  'verifying': {
    en: 'Verifying...',
    hi: 'सत्यापन जारी है...',
    mr: 'सत्यापन सुरु आहे...',
    gu: 'ચકાસણી ચાલી રહી છે...'
  },
  'error_sending_otp': {
    en: 'Error sending OTP. Please try again.',
    hi: 'OTP भेजने में त्रुटि। कृपया पुनः प्रयास करें।',
    mr: 'OTP पाठवण्यात त्रुटी. कृपया पुन्हा प्रयत्न करा.',
    gu: 'OTP મોકલવામાં ભૂલ. કૃપયા ફરી પ્રયાસ કરો.'
  },
  'invalid_otp': {
    en: 'Invalid OTP. Please try again.',
    hi: 'अमान्य OTP। कृपया पुनः प्रयास करें।',
    mr: 'अवैध OTP. कृपया पुन्हा प्रयत्न करा.',
    gu: 'અમાન્ય OTP. કૃપયા ફરી પ્રયાસ કરો.'
  },
  'select_language': {
    en: 'Select Language',
    hi: 'भाषा चुनें',
    mr: 'भाषा निवडा',
    gu: 'ભાષા પસંદ કરો'
  },
  'language_en': {
    en: 'English',
    hi: 'अंग्रेजी',
    mr: 'इंग्लिश',
    gu: 'અંગ્રેજી'
  },
  'language_hi': {
    en: 'हिंदी (Hindi)',
    hi: 'हिंदी',
    mr: 'हिंदी',
    gu: 'હિંદી'
  },
  'language_mr': {
    en: 'मराठी (Marathi)',
    hi: 'मराठी',
    mr: 'मराठी',
    gu: 'મરાठી'
  },
  'language_gu': {
    en: 'ગુજરાતી (Gujarati)',
    hi: 'गुजराती',
    mr: 'गुजराती',
    gu: 'ગુજરાતી'
  },
  // Dashboard Tabs
  'add_new_expense': {
    en: 'Add New Expense',
    hi: 'नया व्यय जोड़ें',
    mr: 'नवीन खर्च जोडा',
    gu: 'નવો ખર્ચ ઉમેરો'
  },
  'track_expenses': {
    en: 'Track My Expenses',
    hi: 'मेरे व्यय ट्रैक करें',
    mr: 'माझे खर्च ट्रॅक करा',
    gu: 'મારા ખર્ચ ટ્રૅક કરો'
  },
  'admin_dashboard': {
    en: 'Admin Dashboard',
    hi: 'एडमिन डैशबोर्ड',
    mr: 'प्रशासक डैशबोर्ड',
    gu: 'એડમિન ડેશબોર્ડ'
  },
  'projects': {
    en: 'Projects',
    hi: 'परियोजनाएं',
    mr: 'प्रकल्प',
    gu: 'પ્રોજેક્ટ્સ'
  },
  'my_projects': {
    en: 'My Projects',
    hi: 'मेरी परियोजनाएं',
    mr: 'माझे प्रकल्प',
    gu: 'મારા પ્રોજેક્ટ્સ'
  },
  'project_notifications': {
    en: 'Project Notifications',
    hi: 'परियोजना सूचनाएं',
    mr: 'प्रकल्प सूचना',
    gu: 'પ્રોજેક્ટ સૂચનાઓ'
  },
  'dismiss': {
    en: 'Dismiss',
    hi: 'खारिज करें',
    mr: 'नाकारा',
    gu: 'ગણતરી કરો'
  },
  'total_spend': {
    en: 'Total Spend',
    hi: 'कुल खर्च',
    mr: 'एकूण खर्च',
    gu: 'કુલ ખર્ચ'
  },
  'this_month': {
    en: 'This Month',
    hi: 'इस महीने',
    mr: 'या महिन्यात',
    gu: 'આ મહિનો'
  },
  'this_week': {
    en: 'This Week',
    hi: 'इस सप्ताह',
    mr: 'या आठवड्यात',
    gu: 'આ સપ્તાહ'
  },
  'top_category': {
    en: 'Top Category',
    hi: 'शीर्ष श्रेणी',
    mr: 'शीर्ष वर्ग',
    gu: 'ટોપ કેટેગરી'
  },
  'category_breakdown': {
    en: 'Category Breakdown',
    hi: 'श्रेणी विभाजन',
    mr: 'वर्ग ब्रेकडाउन',
    gu: 'કેટેગરી બ્રેકડાউન'
  },
  'loading': {
    en: 'Loading...',
    hi: 'लोड हो रहा है...',
    mr: 'लोड होत आहे...',
    gu: 'લોડ થઈ રહ્યું છે...'
  },
  'no_expenses': {
    en: 'No expenses found.',
    hi: 'कोई व्यय नहीं मिला।',
    mr: 'कोणताही खर्च सापडला नाही.',
    gu: 'કોઈ ખર્ચ મળ્યો નથી.'
  },
  // Additional common terms
  'draft': {
    en: 'Draft',
    hi: 'ड्राफ्ट',
    mr: 'मसुदा',
    gu: 'ડ્રાફ્ટ'
  },
  'edit': {
    en: 'Edit',
    hi: 'संपादित करें',
    mr: 'संपादित करा',
    gu: 'ફેરફાર કરો'
  },
  'delete': {
    en: 'Delete',
    hi: 'हटाएं',
    mr: 'हटवा',
    gu: 'કાઢી નાખો'
  },
  'submit': {
    en: 'Submit',
    hi: 'जमा करें',
    mr: 'सादर करा',
    gu: 'સમર્પણ કરો'
  },
  'save': {
    en: 'Save',
    hi: 'सेव करें',
    mr: 'संरक्षित करा',
    gu: 'સાચવો'
  },
  'cancel': {
    en: 'Cancel',
    hi: 'रद्द करें',
    mr: 'रद्द करा',
    gu: 'રદ કરો'
  },
  'back': {
    en: 'Back',
    hi: 'वापस',
    mr: 'मागे',
    gu: 'પાછા'
  },
  'search': {
    en: 'Search',
    hi: 'खोज',
    mr: 'शोध',
    gu: 'શોધ'
  },
  'filter': {
    en: 'Filter',
    hi: 'फिल्टर',
    mr: 'गाळणी',
    gu: 'ફિલ્ટર'
  },
  'date': {
    en: 'Date',
    hi: 'तारीख',
    mr: 'दिनांक',
    gu: 'તારીખ'
  },
  'category': {
    en: 'Category',
    hi: 'श्रेणी',
    mr: 'वर्ग',
    gu: 'શ્રેણી'
  },
  'amount': {
    en: 'Amount',
    hi: 'राशि',
    mr: 'रक्कम',
    gu: 'રકમ'
  },
  'status': {
    en: 'Status',
    hi: 'स्थिति',
    mr: 'स्थिती',
    gu: 'સ્થિતિ'
  },
  'approved': {
    en: 'Approved',
    hi: 'मंजूर',
    mr: 'मंजूर',
    gu: 'મંજૂર'
  },
  'rejected': {
    en: 'Rejected',
    hi: 'अस्वीकृत',
    mr: 'नाकारलेला',
    gu: 'નકારી દેવામાં આવ્યું'
  },
  'under_review': {
    en: 'Under Review',
    hi: 'समीक्षा में',
    mr: 'पुनरावलोकन अंतर्गत',
    gu: 'સમીક્ષા હેઠળ'
  },
  'of_total': {
    en: 'of total',
    hi: 'कुल का',
    mr: 'एकूण',
    gu: 'કુલનો'
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Get saved language from localStorage
    const saved = localStorage.getItem('language') as Language | null;
    if (saved && ['en', 'hi', 'mr', 'gu'].includes(saved)) {
      setLanguageState(saved);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  if (!mounted) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
