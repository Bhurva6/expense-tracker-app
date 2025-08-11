'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { Input, Button, Card } from "./ui/shadcn";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Tesseract from 'tesseract.js';
import { Dialog } from '@headlessui/react';
import { PaperClipIcon, DocumentTextIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { sendNewExpenseNotification } from '../lib/emailService';

const initialState = {
  date: '',
  food: '',
  transport: '',
  hotel: '',
  fuel: '',
  site: '',
  notes: '',
  file: null as File | null,
  others: [] as { label: string; amount: string }[],
};

export default function ExpenseForm(props: { onExpenseAdded?: () => void }) {
  const mounted = React.useRef(true);
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [confirmAmount, setConfirmAmount] = useState('');
  const [confirmDate, setConfirmDate] = useState('');
  const [additionalProof, setAdditionalProof] = useState<File[]>([]);
  const [billImages, setBillImages] = useState<File[]>([]);
  const [billAmounts, setBillAmounts] = useState<string[]>([]);
  const [billOcrLoading, setBillOcrLoading] = useState(false);
  const [billDates, setBillDates] = useState<string[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    timestamp: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [billOcrTexts, setBillOcrTexts] = useState<string[]>([]);
  const [currentBillIdx, setCurrentBillIdx] = useState(0);
  const [showReviewAllModal, setShowReviewAllModal] = useState(false);
  const [shouldTriggerFileInput, setShouldTriggerFileInput] = useState(false);

  // Cleanup effect
  React.useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // Safe state setter to prevent updates after unmount
  const safeSetState = (callback: () => void) => {
    if (mounted.current) {
      try {
        callback();
      } catch (error) {
        console.error('State update error:', error);
      }
    }
  };

  const total =
    [form.food, form.transport, form.hotel, form.fuel, form.site]
      .map(Number)
      .reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)
    + form.others.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as any;
    safeSetState(() => setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    })));
  };

  const handleOtherChange = (idx: number, field: 'label' | 'amount', value: string) => {
    safeSetState(() => setForm((prev) => {
      const updated = [...prev.others];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, others: updated };
    }));
  };

  const addOtherField = () => {
    safeSetState(() => setForm((prev) => ({ ...prev, others: [...prev.others, { label: '', amount: '' }] })));
  };

  const removeOtherField = (idx: number) => {
    safeSetState(() => setForm((prev) => {
      const updated = [...prev.others];
      updated.splice(idx, 1);
      return { ...prev, others: updated };
    }));
  };

  // Location tracking functions
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        }
      );
    });
  };

  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      // Use a free reverse geocoding service that doesn't require API key
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'ExpenseTracker/1.0'
          }
        }
      );
      
      if (!response.ok) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }

      const data = await response.json();
      if (data.display_name) {
        return data.display_name;
      }
      
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Error getting address:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const captureLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
    
    try {
      const coords = await getCurrentLocation();
      const address = await getAddressFromCoordinates(coords.latitude, coords.longitude);
      
      const locationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: address,
        timestamp: new Date().toLocaleString(),
      };
      
      setLocation(locationData);
      setLocationError('');
    } catch (error: any) {
      console.error('Location capture error:', error);
      setLocationError(error.message || 'Failed to capture location');
      // Set a fallback location with error message
      setLocation({
        latitude: 0,
        longitude: 0,
        address: 'Location unavailable',
        timestamp: new Date().toLocaleString(),
      });
    } finally {
      setLocationLoading(false);
    }
  };

  // Auto-capture location when component mounts
  useEffect(() => {
    captureLocation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    safeSetState(() => setLoading(true));
    safeSetState(() => setError(''));
    safeSetState(() => setSuccess(''));
    
    const proofUrls: string[] = [];

    try {
      if (additionalProof.length > 0) {
        for (const proofFile of additionalProof) {
          const filePath = `expenses/${user?.uid}/${Date.now()}_${proofFile.name}`;
          const { error: uploadError } = await supabase.storage
            .from('expenses')
            .upload(filePath, proofFile);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('expenses').getPublicUrl(filePath);
          proofUrls.push(data.publicUrl);
        }
      }

      const expenseData = {
        ...form,
        billImages: proofUrls,
        total,
        user: {
          uid: user?.uid,
          name: user?.displayName,
          email: user?.email,
        },
        location: location || {
          latitude: 0,
          longitude: 0,
          address: 'Location not available',
          timestamp: new Date().toLocaleString(),
        },
        createdAt: Timestamp.now(),
      };
      delete (expenseData as any).file; // Remove redundant `file` property from form state

      const docRef = await addDoc(collection(db, 'expenses'), expenseData);
      console.log('Expense added:', { id: docRef.id, ...expenseData });
      
      // Send email notification
      try {
        await sendNewExpenseNotification({
          id: docRef.id,
          user: {
            name: user?.displayName || user?.email || 'Unknown User',
            email: user?.email || '',
            department: 'Not specified', // You can add department to user profile later
          },
          date: expenseData.date,
          purpose: expenseData.notes || 'General expense', // Using notes as purpose for now
          hotel: Number(expenseData.hotel) || 0,
          transport: Number(expenseData.transport) || 0,
          fuel: Number(expenseData.fuel) || 0,
          meals: Number(expenseData.food) || 0,
          entertainment: Number(expenseData.site) || 0,
          total: total,
          createdAt: expenseData.createdAt,
          notes: expenseData.notes,
        });
        console.log('Email notification sent successfully');
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the expense submission if email fails
      }
      
      if (mounted.current) {
        safeSetState(() => setSuccess('Expense submitted successfully! Notifications have been sent.'));
        safeSetState(() => setForm(initialState));
        safeSetState(() => setAdditionalProof([])); // Clear proof files
        if (typeof props.onExpenseAdded === 'function') props.onExpenseAdded();
        
        // Delay navigation to prevent state updates after unmount
        setTimeout(() => {
          if (mounted.current) {
            router.push('/');
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error('Expense submit error:', err);
      safeSetState(() => setError(err.message || 'Error submitting expense'));
    } finally {
      safeSetState(() => setLoading(false));
    }
  };

  // Open category modal before file upload
  const handleFileInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!selectedCategory) {
      e.preventDefault();
      safeSetState(() => setCategoryModalOpen(true));
    }
  };

  // When a category is selected, allow file input
  const handleCategorySelect = (cat: string) => {
    safeSetState(() => setSelectedCategory(cat));
    safeSetState(() => setCategoryModalOpen(false));
    safeSetState(() => setFileInputKey(prev => prev + 1));
    safeSetState(() => setBillOcrLoading(false));
    safeSetState(() => setShouldTriggerFileInput(true));
  };

React.useEffect(() => {
  if (shouldTriggerFileInput && fileInputRef.current) {
    console.log('Triggering file input click (useEffect)');
    fileInputRef.current.click();
    safeSetState(() => setShouldTriggerFileInput(false));
  }
}, [shouldTriggerFileInput]);

  // Handle bill image(s) selection and OCR
  const handleBillImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleBillImageChange triggered');
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    
    if (!mounted.current) return;
    
    safeSetState(() => setBillImages(files));
    safeSetState(() => setBillOcrLoading(true));
    safeSetState(() => setShowBillModal(false));
    safeSetState(() => setCurrentBillIdx(0));
    safeSetState(() => setShowReviewAllModal(false));
    safeSetState(() => setBillAmounts(Array(files.length).fill('')));
    safeSetState(() => setBillDates(Array(files.length).fill('')));
    safeSetState(() => setBillOcrTexts(Array(files.length).fill('')));
    
    const amounts: string[] = [];
    const dates: string[] = [];
    const ocrs: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      if (!mounted.current) return;
      
      try {
        console.log('Starting OCR for file:', files[i]);
        const { data } = await Tesseract.recognize(files[i], 'eng', { logger: m => console.log(m) });
        console.log('OCR result:', data.text);
        ocrs[i] = data.text;
        // Extract numbers (amounts)
        const numbers = Array.from(data.text.matchAll(/\d+[.,]?\d*/g)).map(m => m[0].replace(/,/g, ''));
        const sorted = numbers.map(Number).filter(n => !isNaN(n)).sort((a, b) => b - a);
        let [first] = sorted;
        amounts[i] = first ? String(first) : '';
        // Extract date
        const dateMatch = data.text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/);
        dates[i] = dateMatch ? dateMatch[0].replace(/\//g, '-') : '';
      } catch (err) {
        console.error('OCR error:', err);
        amounts[i] = '';
        dates[i] = '';
        ocrs[i] = 'OCR failed';
        safeSetState(() => setError('Text extraction failed for one or more images.'));
      }
    }
    
    if (mounted.current) {
      safeSetState(() => setBillAmounts(amounts));
      safeSetState(() => setBillDates(dates));
      safeSetState(() => setBillOcrTexts(ocrs));
      safeSetState(() => setBillOcrLoading(false));
      safeSetState(() => setCurrentBillIdx(0));
      safeSetState(() => setShowBillModal(true));
      safeSetState(() => setFileInputKey(prev => prev + 1));
      if (e.target) e.target.value = '';
    }
  };

  // Move to next/prev image in review modal
  const handleNextBill = () => safeSetState(() => setCurrentBillIdx(idx => Math.min(idx + 1, billImages.length - 1)));
  const handlePrevBill = () => {
    if (currentBillIdx === 0) {
      if (mounted.current) {
        router.push('/');
      }
    } else {
      safeSetState(() => setCurrentBillIdx(idx => Math.max(idx - 1, 0)));
    }
  };
  const handleConfirmAllBills = () => {
    safeSetState(() => setShowBillModal(false));
    safeSetState(() => setShowReviewAllModal(true));
  };
  const handleBackToReview = () => {
    safeSetState(() => setShowReviewAllModal(false));
    safeSetState(() => setShowBillModal(true));
  };

  // Remove a bill image/amount
  const removeBillImage = (idx: number) => {
    safeSetState(() => setBillImages(billImages.filter((_, i) => i !== idx)));
    safeSetState(() => setBillAmounts(billAmounts.filter((_, i) => i !== idx)));
    safeSetState(() => setBillDates(billDates.filter((_, i) => i !== idx)));
    safeSetState(() => setBillOcrTexts(billOcrTexts.filter((_, i) => i !== idx)));
  };

  // Add expense from bill modal
  const handleAddBillExpense = async () => {
    safeSetState(() => setShowBillModal(false));
    safeSetState(() => setShowReviewAllModal(false));
    safeSetState(() => setLoading(true));
    safeSetState(() => setError(''));
    safeSetState(() => setSuccess(''));
    
    let billImageUrls: string[] = [];
    try {
      for (const file of billImages) {
        const filePath = `expense-bills/${user?.uid}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('expense-bills')
          .upload(filePath, file);
  
        if (uploadError) throw uploadError;
  
        const { data } = supabase.storage.from('expense-bills').getPublicUrl(filePath);
        billImageUrls.push(data.publicUrl);
      }
      const total = billAmounts.reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
      const expenseData = {
        date: billDates[0] || new Date().toISOString().slice(0, 10),
        category: selectedCategory,
        billImages: billImageUrls,
        billAmounts,
        total,
        user: {
          uid: user?.uid,
          name: user?.displayName,
          email: user?.email,
        },
        location: location || {
          latitude: 0,
          longitude: 0,
          address: 'Location not available',
          timestamp: new Date().toLocaleString(),
        },
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, 'expenses'), expenseData);
      console.log('Expense added:', { id: docRef.id, ...expenseData });
      
      if (mounted.current) {
        safeSetState(() => setSuccess('Expense submitted!'));
        safeSetState(() => setForm(initialState));
        safeSetState(() => setBillImages([]));
        safeSetState(() => setBillAmounts([]));
        safeSetState(() => setBillDates([]));
        safeSetState(() => setSelectedCategory(''));
        if (typeof props.onExpenseAdded === 'function') props.onExpenseAdded();
        
        // Delay navigation to prevent state updates after unmount
        setTimeout(() => {
          if (mounted.current) {
            router.push('/');
          }
        }, 1000);
      }
    } catch (err: any) {
      safeSetState(() => setError(err.message || 'Error submitting expense'));
    } finally {
      safeSetState(() => setLoading(false));
    }
  };

  const handleAdditionalProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      safeSetState(() => setAdditionalProof(Array.from(e.target.files!)));
    }
  };

  // When closing the bill modal, also reset file input key
  const closeBillModal = () => {
    safeSetState(() => setShowBillModal(false));
    safeSetState(() => setFileInputKey(prev => prev + 1));
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start">
      {/* Left: Expense Form */}
      <Card className="p-4 sm:p-6 w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Location Display */}
          <div className="mb-4 p-3 rounded-lg border" style={{ background: 'var(--accent-light)', borderColor: 'var(--muted)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>📍 Current Location</h3>
              <button
                type="button"
                onClick={captureLocation}
                disabled={locationLoading}
                className="text-xs px-2 py-1 rounded border"
                style={{ 
                  background: locationLoading ? 'var(--muted)' : 'var(--primary)', 
                  color: 'var(--surface)',
                  borderColor: 'var(--primary)'
                }}
              >
                {locationLoading ? '🔄 Getting...' : '🔄 Refresh'}
              </button>
            </div>
            {locationError ? (
              <div className="text-xs text-red-500 mb-1">⚠️ {locationError}</div>
            ) : null}
            {location ? (
              <div className="space-y-1">
                <div className="text-xs" style={{ color: 'var(--foreground)' }}>
                  <strong>Address:</strong> {location.address}
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Coordinates:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Captured:</strong> {location.timestamp}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">Location not captured yet...</div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input type="date" name="date" value={form.date} onChange={handleChange} required label="Date" />
            <Input name="food" value={form.food} onChange={handleChange} label="Food" type="number" min="0" />
            <Input name="transport" value={form.transport} onChange={handleChange} label="Transport" type="number" min="0" />
            <Input name="hotel" value={form.hotel} onChange={handleChange} label="Hotel" type="number" min="0" />
            <Input name="fuel" value={form.fuel} onChange={handleChange} label="Fuel" type="number" min="0" />
            <Input name="site" value={form.site} onChange={handleChange} label="Site" type="number" min="0" />
          </div>
          <div className="space-y-2">
            {form.others.map((other, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-2 items-end">
                <Input
                  type="text"
                  value={other.label}
                  onChange={e => handleOtherChange(idx, 'label', e.target.value)}
                  label={idx === 0 ? 'Others (label)' : ''}
                  placeholder="Other expense label"
                />
                <Input
                  type="number"
                  value={other.amount}
                  onChange={e => handleOtherChange(idx, 'amount', e.target.value)}
                  label={idx === 0 ? 'Amount' : ''}
                  placeholder="Amount"
                  min="0"
                />
                <Button type="button" className="px-2 py-1" style={{ background: 'var(--muted)', color: 'var(--surface)' }} onClick={() => removeOtherField(idx)}>-</Button>
              </div>
            ))}
            <Button type="button" className="w-full sm:w-auto" style={{ background: 'var(--primary)', color: 'var(--surface)' }} onClick={addOtherField}>+ Add Other expense</Button>
          </div>
          <Input name="notes" value={form.notes} onChange={handleChange} label="Notes" />
          <div className="mb-2">
            <label className="block mb-1 font-semibold" style={{ color: 'var(--secondary)' }}>Additional Proof (images, PDFs, Word, etc.)</label>
            <div
              className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition mb-2 min-h-[120px]"
              style={{ borderColor: 'var(--primary)', background: 'var(--accent-light)' }}
              onClick={() => document.getElementById('additional-proof-input')?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                const files = Array.from(e.dataTransfer.files);
                setAdditionalProof(files);
              }}
            >
              <PhotoIcon className="w-8 h-8 mb-2" style={{ color: 'var(--primary)' }} />
              <span className="font-medium text-center" style={{ color: 'var(--primary)' }}>Drag & drop files here, or <span className="underline">browse</span></span>
              <span className="text-xs mt-1 text-center" style={{ color: 'var(--muted)' }}>(Images, PDFs, Word, etc. | Multiple allowed)</span>
              <input
                id="additional-proof-input"
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.tar,.gz,.rtf,.odt,.ods,.odp"
                onChange={handleAdditionalProofChange}
                className="hidden"
              />
            </div>
            {additionalProof.length > 0 && (
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {additionalProof.map((file, idx) => {
                  const isImage = file.type.startsWith('image/');
                  const isPdf = file.type === 'application/pdf';
                  const isDoc = file.name.match(/\.(docx?|pdf|xls|xlsx|ppt|pptx|txt|csv|rtf|odt|ods|odp)$/i);
                  return (
                    <li key={idx} className="flex items-center gap-2 rounded p-2 border" style={{ background: 'var(--surface)', borderColor: 'var(--muted)' }}>
                      {isImage ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-10 h-10 object-cover rounded" />
                      ) : isPdf ? (
                        <DocumentTextIcon className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                      ) : isDoc ? (
                        <DocumentTextIcon className="w-8 h-8" style={{ color: 'var(--primary)' }} />
                      ) : (
                        <PaperClipIcon className="w-8 h-8" style={{ color: 'var(--muted)' }} />
                      )}
                      <span className="truncate text-xs flex-1" title={file.name}>{file.name}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setAdditionalProof(additionalProof.filter((_, i) => i !== idx)); }} className="ml-1" style={{ color: 'var(--accent)' }}>
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {ocrText && (
            <div className="text-xs p-2 rounded mt-2 whitespace-pre-wrap" style={{ background: 'var(--accent-light)', color: 'var(--foreground)' }}>
              <b>Extracted Text:</b> <br />{ocrText}
            </div>
          )}
          <div className="font-bold" style={{ color: 'var(--primary)' }}>Total: ₹{total}</div>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">{loading ? 'Submitting...' : 'Submit Expense'}</Button>
          {error && <div style={{ color: 'var(--accent)' }}>{error}</div>}
          {success && <div style={{ color: 'var(--accent)' }} className="text-lg font-semibold text-center">{success}</div>}
        </form>
        {/* Category Selection Modal */}
        <Dialog open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-xs w-full z-10">
            <Dialog.Title className="text-lg font-bold mb-4">Select Bill Category</Dialog.Title>
            <div className="space-y-2">
              {['food','hotel','transport','fuel','site','others'].map(cat => (
                <Button key={cat} className="w-full" onClick={() => handleCategorySelect(cat)}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setCategoryModalOpen(false)} className="bg-gray-500">Cancel</Button>
            </div>
          </div>
        </Dialog>
        {/* Confirm Add Modal */}
        <Dialog open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-md w-full z-10">
            <Dialog.Title className="text-lg font-bold mb-4">Expense Details</Dialog.Title>
            <div className="space-y-2 text-sm">
              <div><b>Category:</b> {selectedCategory}</div>
              <div className="flex items-center gap-2"><b>Amount:</b>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-32"
                  value={confirmAmount}
                  onChange={e => setConfirmAmount(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2"><b>Date:</b>
                <input
                  type="date"
                  className="border rounded px-2 py-1 w-40"
                  value={confirmDate}
                  onChange={e => setConfirmDate(e.target.value)}
                />
              </div>
              <div><b>Total:</b> ₹{(() => {
                if (selectedCategory === 'others') return confirmAmount;
                return confirmAmount;
              })()}</div>
              <div><b>Extracted Text:</b><br /><span className="whitespace-pre-wrap">{ocrText}</span></div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setConfirmModalOpen(false)} className="bg-gray-500">Cancel</Button>
            </div>
          </div>
        </Dialog>
      </Card>
      {/* Right: Upload/Take Picture Button */}
      <div className="flex flex-col items-center justify-center w-full h-full py-4 md:py-0">
        <Button
          type="button"
          className="w-full max-w-xs h-24 md:w-64 md:h-48 text-white text-base md:text-lg font-bold flex flex-col items-center justify-center gap-2 shadow-lg rounded-xl"
          style={{ background: 'var(--primary)' }}
          onClick={() => setCategoryModalOpen(true)}
          disabled={ocrLoading}
        >
          <PhotoIcon className="w-10 h-10 md:w-12 md:h-12 mb-2" />
          Upload/Take a picture of a bill
        </Button>
        <input
          ref={fileInputRef}
          key={fileInputKey}
          type="file"
          name="billImages"
          accept="image/*"
          multiple
          onChange={handleBillImageChange}
          className="hidden"
          disabled={ocrLoading}
        />
      </div>
      {/* Bill Modal for reviewing each image one by one */}
      <Dialog open={showBillModal} onClose={closeBillModal} className="fixed z-50 inset-0 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full z-10 flex flex-col items-center">
          <Dialog.Title className="text-lg font-bold mb-4">Review Bill {billImages.length > 1 ? `${currentBillIdx + 1} of ${billImages.length}` : ''}</Dialog.Title>
          {billImages.length > 0 && (
            <>
              <img src={URL.createObjectURL(billImages[currentBillIdx])} alt={billImages[currentBillIdx].name} className="w-32 h-32 object-cover rounded mb-2" />
              <div className="w-full mb-2">
                <label className="block text-xs font-semibold mb-1">Extracted Amount</label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-full"
                  value={billAmounts[currentBillIdx]}
                  onChange={e => setBillAmounts(billAmounts.map((a, i) => i === currentBillIdx ? e.target.value : a))}
                />
              </div>
              <div className="w-full mb-2">
                <label className="block text-xs font-semibold mb-1">Date/Time Stamp</label>
                <input
                  type="text"
                  className="border rounded px-2 py-1 w-full bg-gray-100 text-black"
                  value={new Date().toLocaleString()}
                  readOnly
                />
              </div>
              <div className="flex w-full justify-between mt-4 gap-2">
                <Button onClick={handlePrevBill} disabled={currentBillIdx === 0} className="w-1/3">Previous</Button>
                {currentBillIdx < billImages.length - 1 ? (
                  <Button onClick={handleNextBill} className="w-1/3">Next</Button>
                ) : (
                  <Button onClick={handleConfirmAllBills} className="w-1/3 bg-green-600">Confirm All</Button>
                )}
              </div>
            </>
          )}
        </div>
      </Dialog>
      {/* Review All Modal for final confirmation and total */}
      <Dialog open={showReviewAllModal} onClose={handleBackToReview} className="fixed z-50 inset-0 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full z-10">
          <Dialog.Title className="text-lg font-bold mb-4">Confirm All Bills</Dialog.Title>
          <div className="space-y-2">
            {billImages.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 border-b pb-2">
                <img src={URL.createObjectURL(file)} alt={file.name} className="w-12 h-12 object-cover rounded" />
                <div className="flex-1">
                  <div className="text-xs">Amount: <b>₹{billAmounts[idx]}</b></div>
                  <div className="text-xs text-gray-500">{billOcrTexts[idx]?.slice(0, 40)}...</div>
                </div>
              </div>
            ))}
            <div className="mt-4 text-right font-bold">Total: ₹{billAmounts.reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0)}</div>
            <div className="mt-2 text-sm">Category: <span className="font-semibold">{selectedCategory}</span></div>
            <div className="mt-2 text-sm">Timestamp: <span className="font-semibold">{new Date().toLocaleString()}</span></div>
            <div className="flex w-full justify-between mt-4 gap-2">
              <Button onClick={handleBackToReview} className="w-1/2">Back</Button>
              <Button className="w-1/2 bg-green-600" onClick={handleAddBillExpense}>Add Expense</Button>
            </div>
          </div>
        </div>
      </Dialog>
      {/* Loader Modal for OCR */}
      <Dialog open={billOcrLoading} onClose={() => {}} className="fixed z-50 inset-0 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-xs w-full z-10 flex flex-col items-center justify-center">
          <div className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Extracting text...</div>
          <svg className="animate-spin h-8 w-8" style={{ color: 'var(--primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
        </div>
      </Dialog>
    </div>
  );
} 