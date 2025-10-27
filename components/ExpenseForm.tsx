"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { Input, Button, Card, Select } from "./ui/shadcn";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Tesseract from "tesseract.js";
import { Dialog } from "@headlessui/react";
import { PaperClipIcon, XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { db } from "../lib/firebase";
import { sendNewExpenseNotification } from "../lib/emailService";

const FileUploadArea = ({
  files,
  setFiles,
  fieldName,
}: {
  files: File[];
  setFiles: (files: File[]) => void;
  fieldName: string;
}) => (
  <div className="flex items-center gap-2">
    {files.length === 0 ? (
      <div
        className="flex items-center justify-center border border-dashed rounded p-2 cursor-pointer transition hover:bg-gray-50 min-w-20 min-h-10"
        style={{ borderColor: "var(--muted)", background: "var(--accent-light)" }}
        onClick={() => document.getElementById(`${fieldName}-input`)?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const droppedFiles = Array.from(e.dataTransfer.files);
          setFiles([...files, ...droppedFiles]);
        }}
      >
        <PaperClipIcon className="w-4 h-4" style={{ color: "var(--primary)" }} />
        <input
          id={`${fieldName}-input`}
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.tar,.gz,.rtf,.odt,.ods,.odp"
          onChange={(e) => {
            if (e.target.files?.length) {
              setFiles([Array.from(e.target.files)[0]]);
            }
          }}
          className="hidden"
        />
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
          <PaperClipIcon className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-600 max-w-[100px] truncate">
            {files[0].name}
          </span>
          <button
            type="button"
            onClick={() => setFiles([])}
            className="ml-1 text-red-500 hover:text-red-600"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div
          className="flex items-center justify-center border border-dashed rounded p-2 cursor-pointer transition hover:bg-gray-50"
          onClick={() => document.getElementById(`${fieldName}-input`)?.click()}
        >
          <ArrowPathIcon className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <input
            id={`${fieldName}-input`}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.tar,.gz,.rtf,.odt,.ods,.odp"
            onChange={(e) => {
              if (e.target.files?.length) {
                setFiles([Array.from(e.target.files)[0]]);
              }
            }}
            className="hidden"
          />
        </div>
      </div>
    )}
    {files.length > 0 && (
      <span className="text-xs text-gray-500">
        {files.length} file{files.length > 1 ? "s" : ""}
      </span>
    )}
  </div>
);

type ExpenseItem = { amount: string; description: string; files: File[] };
type ExpenseFormState = {
  date: string;
  category: string;
  food: ExpenseItem[];
  fuel: ExpenseItem[];
  entertainment: ExpenseItem[];
  utility: ExpenseItem[];
  home: ExpenseItem[];
  travel: ExpenseItem[];
  grocery: ExpenseItem[];
  transport: ExpenseItem[];
  hotel: ExpenseItem[];
  siteName: string;
  labour: ExpenseItem[];
  tools: ExpenseItem[];
  consumables: ExpenseItem[];
  stay: ExpenseItem[];
  transportOfMaterial: ExpenseItem[];
  localCommute: ExpenseItem[];
  miscellaneous: ExpenseItem[];
  notes: string;
  file: File | null;
  others: { label: string; amount: string; description: string; files: File[] }[];
};

const initialState: ExpenseFormState = {
  date: "",
  category: "",
  food: [{ amount: "", description: "", files: [] }],
  fuel: [{ amount: "", description: "", files: [] }],
  entertainment: [{ amount: "", description: "", files: [] }],
  utility: [{ amount: "", description: "", files: [] }],
  home: [{ amount: "", description: "", files: [] }],
  travel: [{ amount: "", description: "", files: [] }],
  grocery: [{ amount: "", description: "", files: [] }],
  transport: [{ amount: "", description: "", files: [] }],
  hotel: [{ amount: "", description: "", files: [] }],
  siteName: "",
  labour: [{ amount: "", description: "", files: [] }],
  tools: [{ amount: "", description: "", files: [] }],
  consumables: [{ amount: "", description: "", files: [] }],
  miscellaneous: [{ amount: "", description: "", files: [] }],
  stay: [{ amount: "", description: "", files: [] }],
  transportOfMaterial: [{ amount: "", description: "", files: [] }],
  localCommute: [{ amount: "", description: "", files: [] }],
  notes: "",
  file: null as File | null,
  others: [{ label: "", amount: "", description: "", files: [] }],
};

export default function ExpenseForm(props: { onExpenseAdded?: () => void }) {
  const mounted = React.useRef(true);
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ExpenseFormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [confirmAmount, setConfirmAmount] = useState("");
  const [confirmDate, setConfirmDate] = useState("");
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
  const [locationError, setLocationError] = useState("");
  const [billOcrTexts, setBillOcrTexts] = useState<string[]>([]);
  const [currentBillIdx, setCurrentBillIdx] = useState(0);
  const [showReviewAllModal, setShowReviewAllModal] = useState(false);
  const [foodFiles, setFoodFiles] = useState<File[]>([]);
  const [fuelFiles, setFuelFiles] = useState<File[]>([]);
  const [entertainmentFiles, setEntertainmentFiles] = useState<File[]>([]);
  const [utilityFiles, setUtilityFiles] = useState<File[]>([]);
  const [homeFiles, setHomeFiles] = useState<File[]>([]);
  const [travelFiles, setTravelFiles] = useState<File[]>([]);
  const [groceryFiles, setGroceryFiles] = useState<File[]>([]);
  const [transportFiles, setTransportFiles] = useState<File[]>([]);
  const [hotelFiles, setHotelFiles] = useState<File[]>([]);
  const [labourFiles, setLabourFiles] = useState<File[]>([]);
  const [toolsFiles, setToolsFiles] = useState<File[]>([]);
  const [consumablesFiles, setConsumablesFiles] = useState<File[]>([]);
  const [stayFiles, setStayFiles] = useState<File[]>([]);
  const [transportOfMaterialFiles, setTransportOfMaterialFiles] = useState<
    File[]
  >([]);
  const [localCommuteFiles, setLocalCommuteFiles] = useState<File[]>([]);
  const [miscellaneousFiles, setMiscellaneousFiles] = useState<File[]>([]);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [siteNames, setSiteNames] = useState<string[]>([]);

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
        console.error("State update error:", error);
      }
    }
  };

  const total =
    form.category === "personal"
      ? [
          ...form.food,
          ...form.fuel,
          ...form.entertainment,
          ...form.utility,
          ...form.home,
          ...form.travel,
          ...form.grocery,
          ...form.miscellaneous,
        ]
          .map((item) => Number(item.amount))
          .reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)
      : form.category === "official"
      ? [...form.food, ...form.fuel, ...form.transport, ...form.hotel, ...form.miscellaneous]
          .map((item) => Number(item.amount))
          .reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)
      : form.category === "site"
      ? [
          ...form.labour,
          ...form.travel,
          ...form.tools,
          ...form.consumables,
          ...form.stay,
          ...form.transportOfMaterial,
          ...form.localCommute,
          ...form.miscellaneous,
        ]
          .map((item) => Number(item.amount))
          .reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)
      : form.others.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, files } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleOtherChange = (
    idx: number,
    field: "label" | "amount",
    value: string
  ) => {
    safeSetState(() =>
      setForm((prev) => {
        const updated = [...prev.others];
        updated[idx] = { ...updated[idx], [field]: value };
        return { ...prev, others: updated };
      })
    );
  };

  const addItem = (field: keyof typeof initialState) => {
    setForm((prev) => ({
      ...prev,
      [field]: [
        ...(prev[field] as { amount: string; files: File[] }[]),
        { amount: "", description: "", files: [] },
      ],
    }));
  };

  const removeItem = (field: keyof typeof initialState, idx: number) => {
    setForm((prev) => {
      const items = [...(prev[field] as { amount: string; files: File[] }[])];
      // Don't remove if it's the last item
      if (items.length <= 1) return prev;
      items.splice(idx, 1);
      return { ...prev, [field]: items };
    });
  };

  const handleItemChange = (
    field: keyof typeof initialState,
    idx: number,
    subfield: "amount" | "description",
    value: string
  ) => {
    setForm((prev) => {
      const updated = [...(prev[field] as ExpenseItem[])];
      updated[idx] = { ...updated[idx], [subfield]: value };
      return { ...prev, [field]: updated };
    });
  };

  const handleItemFilesChange = (
    field: keyof typeof initialState,
    idx: number,
    files: File[]
  ) => {
    setForm((prev) => {
      const updated = [...(prev[field] as { amount: string; files: File[] }[])];
      updated[idx] = { ...updated[idx], files };
      return { ...prev, [field]: updated };
    });
  };

  const handleOtherFilesChange = (idx: number, files: File[]) => {
    safeSetState(() =>
      setForm((prev) => {
        const updated = [...prev.others];
        updated[idx] = { ...updated[idx], files };
        return { ...prev, others: updated };
      })
    );
  };

  // Location tracking functions
  const getCurrentLocation = (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
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
          let errorMessage = "Unable to retrieve location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out";
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

  const getAddressFromCoordinates = async (
    lat: number,
    lng: number
  ): Promise<string> => {
    try {
      // Use a free reverse geocoding service that doesn't require API key
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "ExpenseTracker/1.0",
          },
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
      console.error("Error getting address:", error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const captureLocation = async () => {
    setLocationLoading(true);
    setLocationError("");

    try {
      const coords = await getCurrentLocation();
      const address = await getAddressFromCoordinates(
        coords.latitude,
        coords.longitude
      );

      const locationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: address,
        timestamp: new Date().toLocaleString(),
      };

      setLocation(locationData);
      setLocationError("");
    } catch (error: any) {
      console.error("Location capture error:", error);
      setLocationError(error.message || "Failed to capture location");
      // Set a fallback location with error message
      setLocation({
        latitude: 0,
        longitude: 0,
        address: "Location unavailable",
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

  // Fetch existing site names
  useEffect(() => {
    const fetchSiteNames = async () => {
      try {
        const { getDocs, collection, query } = await import('firebase/firestore');
        const q = query(collection(db, 'expenses'));
        const snapshot = await getDocs(q);
        const sites = new Set<string>();
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.siteName && data.siteName.trim()) {
            sites.add(data.siteName.trim());
          }
        });
        setSiteNames(Array.from(sites).sort());
      } catch (error) {
        console.error('Error fetching site names:', error);
      }
    };
    fetchSiteNames();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    safeSetState(() => setShowLoadingModal(true));
    safeSetState(() => setError(""));

    const proofUrls: string[] = [];

    try {
      // Collect all files from form arrays
      const allFiles = [
        ...form.food.flatMap((item) => item.files),
        ...form.fuel.flatMap((item) => item.files),
        ...form.entertainment.flatMap((item) => item.files),
        ...form.utility.flatMap((item) => item.files),
        ...form.home.flatMap((item) => item.files),
        ...form.travel.flatMap((item) => item.files),
        ...form.grocery.flatMap((item) => item.files),
        ...form.transport.flatMap((item) => item.files),
        ...form.hotel.flatMap((item) => item.files),
        ...form.labour.flatMap((item) => item.files),
        ...form.tools.flatMap((item) => item.files),
        ...form.consumables.flatMap((item) => item.files),
        ...form.stay.flatMap((item) => item.files),
        ...form.miscellaneous.flatMap((item) => item.files),
        ...form.transportOfMaterial.flatMap((item) => item.files),
        ...form.localCommute.flatMap((item) => item.files),
        ...form.others.flatMap((item) => item.files),
      ];

      if (allFiles.length > 0) {
        for (const proofFile of allFiles) {
          const filePath = `expenses/${user?.uid}/${Date.now()}_${
            proofFile.name
          }`;
          const { error: uploadError } = await supabase.storage
            .from("expenses")
            .upload(filePath, proofFile);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from("expenses")
            .getPublicUrl(filePath);
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
          address: "Location not available",
          timestamp: new Date().toLocaleString(),
        },
        createdAt: Timestamp.now(),
      };
      delete (expenseData as any).file; // Remove redundant `file` property from form state

      const docRef = await addDoc(collection(db, "expenses"), expenseData);

      // Send email notification
      await sendNewExpenseNotification({
        id: docRef.id,
        user: {
          name: user?.displayName || user?.email || "Unknown User",
          email: user?.email || "",
          department: "Not specified", // You can add department to user profile later
        },
        date: expenseData.date,
        purpose: expenseData.notes || "General expense", // Using notes as purpose for now
        hotel:
          form.category === "personal"
            ? form.home.reduce((sum, item) => sum + Number(item.amount), 0)
            : form.category === "official"
            ? form.hotel.reduce((sum, item) => sum + Number(item.amount), 0)
            : form.category === "site"
            ? form.stay.reduce((sum, item) => sum + Number(item.amount), 0)
            : 0,
        transport:
          form.category === "personal"
            ? form.travel.reduce((sum, item) => sum + Number(item.amount), 0)
            : form.category === "official"
            ? form.transport.reduce((sum, item) => sum + Number(item.amount), 0)
            : form.category === "site"
            ? form.transportOfMaterial.reduce(
                (sum, item) => sum + Number(item.amount),
                0
              ) +
              form.localCommute.reduce(
                (sum, item) => sum + Number(item.amount),
                0
              )
            : 0,
        fuel:
          form.category === "personal"
            ? form.fuel.reduce((sum, item) => sum + Number(item.amount), 0)
            : form.category === "official"
            ? form.fuel.reduce((sum, item) => sum + Number(item.amount), 0)
            : 0,
        meals:
          form.category === "personal"
            ? form.food.reduce((sum, item) => sum + Number(item.amount), 0) +
              form.grocery.reduce((sum, item) => sum + Number(item.amount), 0)
            : form.category === "official"
            ? form.food.reduce((sum, item) => sum + Number(item.amount), 0)
            : 0,
        entertainment:
          form.category === "personal"
            ? form.entertainment.reduce(
                (sum, item) => sum + Number(item.amount),
                0
              )
            : 0,
        total: total,
        createdAt: expenseData.createdAt,
        notes: expenseData.notes,
      });

      // Show email sent toast
      safeSetState(() => setToastMessage("Email sent successfully"));
      safeSetState(() => setShowToast(true));
      setTimeout(() => safeSetState(() => setShowToast(false)), 3000);

      safeSetState(() => setShowLoadingModal(false));
      safeSetState(() => setShowSuccessModal(true));

      if (mounted.current) {
        // Modal is shown, reset form and navigate after delay
        safeSetState(() => setForm(initialState));
        if (typeof props.onExpenseAdded === "function") props.onExpenseAdded();

        // Delay navigation to prevent state updates after unmount
        setTimeout(() => {
          if (mounted.current) {
            closeSuccessModal();
          }
        }, 2000);
      }
    } catch (err: any) {
      console.error("Expense submit error:", err);
      safeSetState(() => setShowLoadingModal(false));
      safeSetState(() =>
        setErrorMessage(err.message || "Error submitting expense")
      );
      safeSetState(() => setShowErrorModal(true));
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
    safeSetState(() => setFileInputKey((prev) => prev + 1));
    safeSetState(() => setBillOcrLoading(false));
  };

  React.useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Handle bill image(s) selection and OCR
  const handleBillImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    if (!mounted.current) return;

    safeSetState(() => setBillImages(files));
    safeSetState(() => setBillOcrLoading(true));
    safeSetState(() => setShowBillModal(false));
    safeSetState(() => setCurrentBillIdx(0));
    safeSetState(() => setShowReviewAllModal(false));
    safeSetState(() => setBillAmounts(Array(files.length).fill("")));
    safeSetState(() => setBillDates(Array(files.length).fill("")));
    safeSetState(() => setBillOcrTexts(Array(files.length).fill("")));

    const amounts: string[] = [];
    const dates: string[] = [];
    const ocrs: string[] = [];

    for (let i = 0; i < files.length; i++) {
      if (!mounted.current) return;

      try {
        const { data } = await Tesseract.recognize(files[i], "eng", {
          logger: (m) => console.log(m),
        });
        ocrs[i] = data.text;
        // Extract numbers (amounts)
        const numbers = Array.from(data.text.matchAll(/\d+[.,]?\d*/g)).map(
          (m) => m[0].replace(/,/g, "")
        );
        const sorted = numbers
          .map(Number)
          .filter((n) => !isNaN(n))
          .sort((a, b) => b - a);
        let [first] = sorted;
        amounts[i] = first ? String(first) : "";
        // Extract date
        const dateMatch = data.text.match(
          /(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/
        );
        dates[i] = dateMatch ? dateMatch[0].replace(/\//g, "-") : "";
      } catch (err) {
        console.error("OCR error:", err);
        amounts[i] = "";
        dates[i] = "";
        ocrs[i] = "OCR failed";
        safeSetState(() =>
          setError("Text extraction failed for one or more images.")
        );
      }
    }

    if (mounted.current) {
      safeSetState(() => setBillAmounts(amounts));
      safeSetState(() => setBillDates(dates));
      safeSetState(() => setBillOcrTexts(ocrs));
      safeSetState(() => setBillOcrLoading(false));
      safeSetState(() => setCurrentBillIdx(0));
      safeSetState(() => setShowBillModal(true));
      safeSetState(() => setFileInputKey((prev) => prev + 1));
      if (e.target) e.target.value = "";
    }
  };

  // Move to next/prev image in review modal
  const handleNextBill = () =>
    safeSetState(() =>
      setCurrentBillIdx((idx) => Math.min(idx + 1, billImages.length - 1))
    );
  const handlePrevBill = () => {
    if (currentBillIdx === 0) {
      if (mounted.current) {
        router.push("/");
      }
    } else {
      safeSetState(() => setCurrentBillIdx((idx) => Math.max(idx - 1, 0)));
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
    safeSetState(() =>
      setBillOcrTexts(billOcrTexts.filter((_, i) => i !== idx))
    );
  };

  // Add expense from bill modal
  const handleAddBillExpense = async () => {
    safeSetState(() => setShowBillModal(false));
    safeSetState(() => setShowReviewAllModal(false));
    safeSetState(() => setLoading(true));
    safeSetState(() => setError(""));

    let billImageUrls: string[] = [];
    try {
      for (const file of billImages) {
        const filePath = `expense-bills/${user?.uid}/${Date.now()}_${
          file.name
        }`;
        const { error: uploadError } = await supabase.storage
          .from("expense-bills")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("expense-bills")
          .getPublicUrl(filePath);
        billImageUrls.push(data.publicUrl);
      }
      const total = billAmounts.reduce(
        (sum, amt) => sum + (parseFloat(amt) || 0),
        0
      );
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
          address: "Location not available",
          timestamp: new Date().toLocaleString(),
        },
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, "expenses"), expenseData);

      if (mounted.current) {
        safeSetState(() => setShowSuccessModal(true));
        safeSetState(() => setForm(initialState));
        safeSetState(() => setBillImages([]));
        safeSetState(() => setBillAmounts([]));
        safeSetState(() => setBillDates([]));
        safeSetState(() => setSelectedCategory(""));
        if (typeof props.onExpenseAdded === "function") props.onExpenseAdded();

        // Delay navigation to prevent state updates after unmount
        setTimeout(() => {
          if (mounted.current) {
            router.push("/");
          }
        }, 1000);
      }
    } catch (err: any) {
      safeSetState(() => setError(err.message || "Error submitting expense"));
    } finally {
      safeSetState(() => setLoading(false));
    }
  };

  // When closing the bill modal, also reset file input key
  const closeBillModal = () => {
    safeSetState(() => setShowBillModal(false));
    safeSetState(() => setFileInputKey((prev) => prev + 1));
  };

  const closeSuccessModal = () => {
    safeSetState(() => setShowSuccessModal(false));
    router.push("/");
  };

  const closeErrorModal = () => {
    safeSetState(() => setShowErrorModal(false));
    safeSetState(() => setErrorMessage(""));
  };

  return (
    <div className="max-w-screen-2xl mx-auto mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start">
        {/* Left: Expense Form */}
        <Card className="p-4 sm:p-6 w-full">
          <form onSubmit={handleSubmit} className="space-y-4">
           <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
            Enter your expense
           </h1>
           {location && (
              <div className="text-sm text-gray-600 mb-6">
                📍 {location.address.split(",").slice(1, 3).join(", ")}
              </div>
           )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                name="date"
                value={new Date().toISOString().split('T')[0]}
                readOnly
                required
                label="Date"
              />
              <select
                name="category"
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="themed-input w-full px-8 py-2 border rounded focus:outline-none focus:ring-2"
                style={{
                  background: "var(--surface)",
                  color: "var(--foreground)",
                  borderColor: "var(--muted)",
                  fontFamily: "var(--font-sans)",
                  boxShadow: "none",
                }}
              >
                <option value="">Select Category</option>
                <option value="personal">Personal</option>
                <option value="official">Official</option>
                <option value="site">Site</option>
              </select>
            </div>
            {form.category === "personal" && (
              <div className="space-y-4">
                {form.food.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Food {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`food-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("food", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`food-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("food", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("food", idx, files)
                          }
                          fieldName={`food-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("food", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.food.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.food.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("food")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Fuel section */}
                {form.fuel.map((item, idx) => (
                  <div key={`fuel-${idx}`} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Fuel {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`fuel-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("fuel", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`fuel-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("fuel", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("fuel", idx, files)
                          }
                          fieldName={`fuel-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("fuel", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.fuel.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.fuel.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("fuel")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Entertainment section */}
                {form.entertainment.map((item, idx) => (
                  <div key={`entertainment-${idx}`} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Entertainment {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`entertainment-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("entertainment", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`entertainment-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("entertainment", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("entertainment", idx, files)
                          }
                          fieldName={`entertainment-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("entertainment", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.entertainment.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.entertainment.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("entertainment")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Utility section */}
                {form.utility.map((item, idx) => (
                  <div key={`utility-${idx}`} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Utility {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`utility-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("utility", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`utility-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("utility", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("utility", idx, files)
                          }
                          fieldName={`utility-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("utility", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.utility.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.utility.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("utility")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Hotel section */}
                {form.hotel.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Hotel {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`hotel-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("hotel", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`hotel-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("hotel", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("hotel", idx, files)
                          }
                          fieldName={`hotel-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("hotel", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.hotel.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.hotel.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("hotel")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Miscellaneous section */}
                {form.miscellaneous.map((item, idx) => (
                  <div key={`miscellaneous-${idx}`} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Miscellaneous {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`miscellaneous-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("miscellaneous", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`miscellaneous-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("miscellaneous", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("miscellaneous", idx, files)
                          }
                          fieldName={`miscellaneous-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("miscellaneous", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.miscellaneous.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.miscellaneous.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("miscellaneous")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {form.category === "official" && (
              <div className="space-y-4">
                {form.food.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Food {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`food-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("food", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`food-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("food", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("food", idx, files)
                          }
                          fieldName={`food-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("food", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.food.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.food.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("food")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Fuel section */}
                {form.fuel.map((item, idx) => (
                  <div key={`fuel-${idx}`} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Fuel {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`fuel-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("fuel", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`fuel-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("fuel", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("fuel", idx, files)
                          }
                          fieldName={`fuel-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("fuel", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.fuel.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.fuel.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("fuel")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Transport section */}
                {form.transport.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Transport {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`transport-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("transport", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`transport-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("transport", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("transport", idx, files)
                          }
                          fieldName={`transport-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("transport", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.transport.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.transport.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("transport")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Hotel section */}
                {form.hotel.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Hotel {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`hotel-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("hotel", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`hotel-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("hotel", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("hotel", idx, files)
                          }
                          fieldName={`hotel-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("hotel", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.hotel.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.hotel.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("hotel")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Miscellaneous section */}
                {form.miscellaneous.map((item, idx) => (
                  <div key={`miscellaneous-${idx}`} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Miscellaneous {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`miscellaneous-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("miscellaneous", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`miscellaneous-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("miscellaneous", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("miscellaneous", idx, files)
                          }
                          fieldName={`miscellaneous-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("miscellaneous", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.miscellaneous.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.miscellaneous.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("miscellaneous")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {form.category === "site" && (
              <div className="space-y-4">
                <div className="mb-4">
                  <div className="text-sm mb-2 text-gray-600">Site Name</div>
                  <div className="flex items-center space-x-4 w-full">
                    <Input
                      name="siteName"
                      value={form.siteName}
                      onChange={handleChange}
                      list="site-names"
                      placeholder="Enter or select site name"
                      type="text"
                      className="grow px-4"
                    />
                    <datalist id="site-names">
                      {siteNames.map(site => (
                        <option key={site} value={site} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {form.labour.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Labour {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`labour-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("labour", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`labour-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("labour", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("labour", idx, files)
                          }
                          fieldName={`labour-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("labour", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.labour.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.labour.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("labour")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {form.travel.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Travel {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`travel-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("travel", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`travel-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("travel", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("travel", idx, files)
                          }
                          fieldName={`travel-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("travel", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.travel.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.travel.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("travel")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {form.tools.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Tools {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`tools-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("tools", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`tools-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("tools", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("tools", idx, files)
                          }
                          fieldName={`tools-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("tools", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.tools.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.tools.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("tools")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {form.consumables.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Consumables {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`consumables-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("consumables", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`consumables-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("consumables", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("consumables", idx, files)
                          }
                          fieldName={`consumables-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("consumables", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.consumables.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.consumables.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("consumables")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {form.stay.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Stay {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`stay-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("stay", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`stay-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("stay", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("stay", idx, files)
                          }
                          fieldName={`stay-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("stay", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.stay.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.stay.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("stay")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {form.transportOfMaterial.map((item, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Transport of Material {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`transportOfMaterial-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("transportOfMaterial", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`transportOfMaterial-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("transportOfMaterial", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("transportOfMaterial", idx, files)
                          }
                          fieldName={`transportOfMaterial-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("transportOfMaterial", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.transportOfMaterial.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.transportOfMaterial.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("transportOfMaterial")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {form.localCommute.map((item, idx) => (
                  <div key={idx} className="mb-4">
                  </div>
                ))}

                {/* Miscellaneous section */}
                {form.miscellaneous.map((item, idx) => (
                  <div key={`miscellaneous-${idx}`} className="mb-4">
                    <div className="text-sm mb-2 text-gray-600">
                      Miscellaneous {idx + 1}
                    </div>
                    <div className="flex items-center space-x-4 w-full">
                      <Input
                        name={`miscellaneous-${idx}-description`}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange("miscellaneous", idx, "description", e.target.value)
                        }
                        placeholder="Description"
                        type="text"
                        className="grow px-4"
                      />
                      <Input
                        name={`miscellaneous-${idx}-amount`}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange("miscellaneous", idx, "amount", e.target.value)
                        }
                        placeholder="Amount"
                        type="number"
                        min="0"
                        className="w-32 px-4"
                      />
                      <div className="shrink-0">
                        <FileUploadArea
                          files={item.files}
                          setFiles={(files) =>
                            handleItemFilesChange("miscellaneous", idx, files)
                          }
                          fieldName={`miscellaneous-${idx}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem("miscellaneous", idx)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 min-w-8"
                        disabled={form.miscellaneous.length <= 1}
                      >
                        -
                      </button>
                      {idx === form.miscellaneous.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addItem("miscellaneous")}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 min-w-8"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {form.category !== "personal" &&
              form.category !== "official" &&
              form.category !== "site" && (
                <div className="space-y-2">
                  {form.others.map((other, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row gap-2 items-end"
                    ></div>
                  ))}
                </div>
              )}
            <Input
              name="notes"
              value={form.notes}
              onChange={handleChange}
              label="Notes"
            />

            <div className="font-bold" style={{ color: "var(--primary)" }}>
              Total: ₹{total}
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? "Submitting..." : "Submit Expense"}
            </Button>
          </form>
        </Card>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <Dialog
          open={showSuccessModal}
          onClose={closeSuccessModal}
          className="fixed z-50 inset-0 flex items-center justify-center"
        >
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            aria-hidden="true"
            onClick={closeSuccessModal}
          />
          <Card className="relative p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full mx-4 z-10 transform transition-all">
            <div className="flex flex-col items-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <Dialog.Title
                className="text-2xl font-semibold text-center mb-2"
                style={{ color: "var(--primary)" }}
              >
                Success!
              </Dialog.Title>
              <Dialog.Description
                className="text-center text-base mb-6"
                style={{ color: "var(--foreground)" }}
              >
                Your expense has been successfully submitted for review
              </Dialog.Description>
              <div className="flex justify-center w-full">
                <Button
                  onClick={closeSuccessModal}
                  className="px-6 py-2 rounded-lg transition-colors duration-200 ease-in-out transform hover:scale-105"
                  style={{
                    background: "var(--primary)",
                    color: "var(--surface)",
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </Card>
        </Dialog>
      )}

      {/* Loading Modal */}
      {showLoadingModal && (
        <Dialog
          open={showLoadingModal}
          onClose={() => {}}
          className="fixed z-50 inset-0 flex items-center justify-center"
        >
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            aria-hidden="true"
          />
          <Card className="relative p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full mx-4 z-10">
            <Dialog.Title
              className="text-xl font-semibold text-center mb-4"
              style={{ color: "var(--primary)" }}
            >
              ⏳ Submitting Expense
            </Dialog.Title>
            <Dialog.Description
              className="text-center text-sm mb-4"
              style={{ color: "var(--foreground)" }}
            >
              Please wait while we submit your expense...
            </Dialog.Description>
            <div className="flex justify-center">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: "var(--primary)" }}
              ></div>
            </div>
          </Card>
        </Dialog>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <Dialog
          open={showErrorModal}
          onClose={closeErrorModal}
          className="fixed z-50 inset-0 flex items-center justify-center"
        >
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            aria-hidden="true"
            onClick={closeErrorModal}
          />
          <Card className="relative p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full mx-4 z-10">
            <Dialog.Title
              className="text-xl font-semibold text-center mb-4"
              style={{ color: "var(--accent)" }}
            >
              ❌ Submission Failed
            </Dialog.Title>
            <Dialog.Description
              className="text-center text-sm mb-4"
              style={{ color: "var(--foreground)" }}
            >
              {errorMessage}
            </Dialog.Description>
            <div className="flex justify-center">
              <Button
                onClick={closeErrorModal}
                className="w-full sm:w-auto"
                style={{ background: "var(--accent)", color: "var(--surface)" }}
              >
                Try Again
              </Button>
            </div>
          </Card>
        </Dialog>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
