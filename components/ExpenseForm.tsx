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
import {
  PaperClipIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
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
    <div
      className="flex items-center justify-center border border-dashed rounded p-2 cursor-pointer transition hover:bg-gray-50 min-w-[80px] min-h-[40px]"
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
        multiple
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.tar,.gz,.rtf,.odt,.ods,.odp"
        onChange={(e) => {
          if (e.target.files) {
            setFiles([...files, ...Array.from(e.target.files)]);
          }
        }}
        className="hidden"
      />
    </div>
    {files.length > 0 && (
      <span className="text-xs text-gray-500">
        {files.length} file{files.length > 1 ? "s" : ""}
      </span>
    )}
  </div>
);

const initialState = {
  date: "",
  category: "",
  food: "",
  fuel: "",
  entertainment: "",
  utility: "",
  home: "",
  travel: "",
  grocery: "",
  transport: "",
  hotel: "",
  siteName: "",
  labour: "",
  tools: "",
  consumables: "",
  stay: "",
  transportOfMaterial: "",
  localCommute: "",
  notes: "",
  file: null as File | null,
  foodFiles: [] as File[],
  fuelFiles: [] as File[],
  entertainmentFiles: [] as File[],
  utilityFiles: [] as File[],
  homeFiles: [] as File[],
  travelFiles: [] as File[],
  groceryFiles: [] as File[],
  transportFiles: [] as File[],
  hotelFiles: [] as File[],
  labourFiles: [] as File[],
  toolsFiles: [] as File[],
  consumablesFiles: [] as File[],
  stayFiles: [] as File[],
  transportOfMaterialFiles: [] as File[],
  localCommuteFiles: [] as File[],
  others: [] as { label: string; amount: string }[],
};

export default function ExpenseForm(props: { onExpenseAdded?: () => void }) {
  const mounted = React.useRef(true);
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialState);
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
  const [shouldTriggerFileInput, setShouldTriggerFileInput] = useState(false);
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
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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
          form.food,
          form.fuel,
          form.entertainment,
          form.utility,
          form.home,
          form.travel,
          form.grocery,
        ]
          .map(Number)
          .reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)
      : form.category === "official"
      ? [form.food, form.fuel, form.transport, form.hotel]
          .map(Number)
          .reduce((a, b) => a + (isNaN(b) ? 0 : b), 0)
      : form.category === "site"
      ? [
          form.labour,
          form.travel,
          form.tools,
          form.consumables,
          form.stay,
          form.transportOfMaterial,
          form.localCommute,
        ]
          .map(Number)
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

  const addOtherField = () => {
    safeSetState(() =>
      setForm((prev) => ({
        ...prev,
        others: [...prev.others, { label: "", amount: "" }],
      }))
    );
  };

  const removeOtherField = (idx: number) => {
    safeSetState(() =>
      setForm((prev) => {
        const updated = [...prev.others];
        updated.splice(idx, 1);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    safeSetState(() => setShowLoadingModal(true));
    safeSetState(() => setError(""));

    const proofUrls: string[] = [];

    try {
      // Collect all files from individual field arrays
      const allFiles = [
        ...foodFiles,
        ...fuelFiles,
        ...entertainmentFiles,
        ...utilityFiles,
        ...homeFiles,
        ...travelFiles,
        ...groceryFiles,
        ...transportFiles,
        ...hotelFiles,
        ...labourFiles,
        ...toolsFiles,
        ...consumablesFiles,
        ...stayFiles,
        ...transportOfMaterialFiles,
        ...localCommuteFiles,
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
            ? Number(form.home)
            : form.category === "official"
            ? Number(form.hotel)
            : form.category === "site"
            ? Number(form.stay)
            : 0,
        transport:
          form.category === "personal"
            ? Number(form.travel)
            : form.category === "official"
            ? Number(form.transport)
            : form.category === "site"
            ? Number(form.transportOfMaterial) + Number(form.localCommute)
            : 0,
        fuel:
          form.category === "personal"
            ? Number(form.fuel)
            : form.category === "official"
            ? Number(form.fuel)
            : 0,
        meals:
          form.category === "personal"
            ? Number(form.food) + Number(form.grocery)
            : form.category === "official"
            ? Number(form.food)
            : 0,
        entertainment:
          form.category === "personal" ? Number(form.entertainment) : 0,
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
        safeSetState(() => setFoodFiles([]));
        safeSetState(() => setFuelFiles([]));
        safeSetState(() => setEntertainmentFiles([]));
        safeSetState(() => setUtilityFiles([]));
        safeSetState(() => setHomeFiles([]));
        safeSetState(() => setTravelFiles([]));
        safeSetState(() => setGroceryFiles([]));
        safeSetState(() => setTransportFiles([]));
        safeSetState(() => setHotelFiles([]));
        safeSetState(() => setLabourFiles([]));
        safeSetState(() => setToolsFiles([]));
        safeSetState(() => setConsumablesFiles([]));
        safeSetState(() => setStayFiles([]));
        safeSetState(() => setTransportOfMaterialFiles([]));
        safeSetState(() => setLocalCommuteFiles([]));
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
      safeSetState(() => setErrorMessage(err.message || "Error submitting expense"));
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
    safeSetState(() => setShouldTriggerFileInput(true));
  };

  React.useEffect(() => {
    if (shouldTriggerFileInput && fileInputRef.current) {
      fileInputRef.current.click();
      safeSetState(() => setShouldTriggerFileInput(false));
    }
  }, [shouldTriggerFileInput]);

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
    <div className="max-w-4xl mx-auto mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start">
        {/* Left: Expense Form */}
        <Card className="p-4 sm:p-6 w-full">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location Display */}
            <div
              className="mb-4 p-3 rounded-lg border"
              style={{
                background: "var(--accent-light)",
                borderColor: "var(--muted)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  📍 Current Location
                </h3>
                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={locationLoading}
                  className="text-xs px-2 py-1 rounded border"
                  style={{
                    background: locationLoading
                      ? "var(--muted)"
                      : "var(--primary)",
                    color: "var(--surface)",
                    borderColor: "var(--primary)",
                  }}
                >
                  {locationLoading ? "🔄 Getting..." : "🔄 Refresh"}
                </button>
              </div>
              {locationError ? (
                <div className="text-xs text-red-500 mb-1">
                  ⚠️ {locationError}
                </div>
              ) : null}
              {location ? (
                <div className="space-y-1">
                  <div className="text-xs" style={{ color: "var(--foreground)" }}>
                    <strong>Address:</strong> {location.address}
                  </div>
                  <div className="text-xs text-gray-500">
                    <strong>Coordinates:</strong> {location.latitude.toFixed(6)},{" "}
                    {location.longitude.toFixed(6)}
                  </div>
                  <div className="text-xs text-gray-500">
                    <strong>Captured:</strong> {location.timestamp}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  Location not captured yet...
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
                label="Date"
              />
              <select
                name="category"
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="themed-input w-full px-3 py-2 border rounded focus:outline-none focus:ring-2"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-end gap-2">
                  <Input
                    name="food"
                    value={form.food}
                    onChange={handleChange}
                    label="Food"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={foodFiles}
                    setFiles={setFoodFiles}
                    fieldName="food"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="fuel"
                    value={form.fuel}
                    onChange={handleChange}
                    label="Fuel"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={fuelFiles}
                    setFiles={setFuelFiles}
                    fieldName="fuel"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="entertainment"
                    value={form.entertainment}
                    onChange={handleChange}
                    label="Entertainment"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={entertainmentFiles}
                    setFiles={setEntertainmentFiles}
                    fieldName="entertainment"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="utility"
                    value={form.utility}
                    onChange={handleChange}
                    label="Utility"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={utilityFiles}
                    setFiles={setUtilityFiles}
                    fieldName="utility"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="home"
                    value={form.home}
                    onChange={handleChange}
                    label="Home"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={homeFiles}
                    setFiles={setHomeFiles}
                    fieldName="home"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="travel"
                    value={form.travel}
                    onChange={handleChange}
                    label="Travel"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={travelFiles}
                    setFiles={setTravelFiles}
                    fieldName="travel"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="grocery"
                    value={form.grocery}
                    onChange={handleChange}
                    label="Grocery"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={groceryFiles}
                    setFiles={setGroceryFiles}
                    fieldName="grocery"
                  />
                </div>
              </div>
            )}
            {form.category === "official" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-end gap-2">
                  <Input
                    name="food"
                    value={form.food}
                    onChange={handleChange}
                    label="Food"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={foodFiles}
                    setFiles={setFoodFiles}
                    fieldName="food"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="fuel"
                    value={form.fuel}
                    onChange={handleChange}
                    label="Fuel"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={fuelFiles}
                    setFiles={setFuelFiles}
                    fieldName="fuel"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="transport"
                    value={form.transport}
                    onChange={handleChange}
                    label="Transport"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={transportFiles}
                    setFiles={setTransportFiles}
                    fieldName="transport"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="hotel"
                    value={form.hotel}
                    onChange={handleChange}
                    label="Hotel"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={hotelFiles}
                    setFiles={setHotelFiles}
                    fieldName="hotel"
                  />
                </div>
              </div>
            )}
            {form.category === "site" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-end gap-2">
                  <Input
                    name="siteName"
                    value={form.siteName}
                    onChange={handleChange}
                    label="Site Name"
                    type="text"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="labour"
                    value={form.labour}
                    onChange={handleChange}
                    label="Labour"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={labourFiles}
                    setFiles={setLabourFiles}
                    fieldName="labour"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="travel"
                    value={form.travel}
                    onChange={handleChange}
                    label="Travel"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={travelFiles}
                    setFiles={setTravelFiles}
                    fieldName="travel"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="tools"
                    value={form.tools}
                    onChange={handleChange}
                    label="Tools"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={toolsFiles}
                    setFiles={setToolsFiles}
                    fieldName="tools"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="consumables"
                    value={form.consumables}
                    onChange={handleChange}
                    label="Consumables"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={consumablesFiles}
                    setFiles={setConsumablesFiles}
                    fieldName="consumables"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="stay"
                    value={form.stay}
                    onChange={handleChange}
                    label="Stay"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={stayFiles}
                    setFiles={setStayFiles}
                    fieldName="stay"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="transportOfMaterial"
                    value={form.transportOfMaterial}
                    onChange={handleChange}
                    label="Transport of Material"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={transportOfMaterialFiles}
                    setFiles={setTransportOfMaterialFiles}
                    fieldName="transportOfMaterial"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Input
                    name="localCommute"
                    value={form.localCommute}
                    onChange={handleChange}
                    label="Local Commute"
                    type="number"
                    min="0"
                  />
                  <FileUploadArea
                    files={localCommuteFiles}
                    setFiles={setLocalCommuteFiles}
                    fieldName="localCommute"
                  />
                </div>
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
                    >
                      <Input
                        type="text"
                        value={other.label}
                        onChange={(e) =>
                          handleOtherChange(idx, "label", e.target.value)
                        }
                        label={idx === 0 ? "Others (label)" : ""}
                        placeholder="Other expense label"
                      />
                      <Input
                        type="number"
                        value={other.amount}
                        onChange={(e) =>
                          handleOtherChange(idx, "amount", e.target.value)
                        }
                        label={idx === 0 ? "Amount" : ""}
                        placeholder="Amount"
                        min="0"
                      />
                      <Button
                        type="button"
                        className="px-2 py-1"
                        style={{
                          background: "var(--muted)",
                          color: "var(--surface)",
                        }}
                        onClick={() => removeOtherField(idx)}
                      >
                        -
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    style={{
                      background: "var(--primary)",
                      color: "var(--surface)",
                    }}
                    onClick={addOtherField}
                  >
                    + Add Other expense
                  </Button>
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
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Submitting..." : "Submit Expense"}
            </Button>
          </form>
        </Card>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <Dialog open={showSuccessModal} onClose={closeSuccessModal} className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" onClick={closeSuccessModal} />
          <Card className="relative p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full mx-4 z-10">
            <Dialog.Title className="text-xl font-semibold text-center mb-4" style={{ color: 'var(--primary)' }}>
              ✅ Expense Submitted
            </Dialog.Title>
            <Dialog.Description className="text-center text-sm mb-4" style={{ color: 'var(--foreground)' }}>
              Expense successfully submitted for review
            </Dialog.Description>
            <div className="flex justify-center">
              <Button
                onClick={closeSuccessModal}
                className="w-full sm:w-auto"
                style={{ background: 'var(--primary)', color: 'var(--surface)' }}
              >
                OK
              </Button>
            </div>
          </Card>
        </Dialog>
      )}

      {/* Loading Modal */}
      {showLoadingModal && (
        <Dialog open={showLoadingModal} onClose={() => {}} className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
          <Card className="relative p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full mx-4 z-10">
            <Dialog.Title className="text-xl font-semibold text-center mb-4" style={{ color: 'var(--primary)' }}>
              ⏳ Submitting Expense
            </Dialog.Title>
            <Dialog.Description className="text-center text-sm mb-4" style={{ color: 'var(--foreground)' }}>
              Please wait while we submit your expense...
            </Dialog.Description>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
            </div>
          </Card>
        </Dialog>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <Dialog open={showErrorModal} onClose={closeErrorModal} className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" onClick={closeErrorModal} />
          <Card className="relative p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full mx-4 z-10">
            <Dialog.Title className="text-xl font-semibold text-center mb-4" style={{ color: 'var(--accent)' }}>
              ❌ Submission Failed
            </Dialog.Title>
            <Dialog.Description className="text-center text-sm mb-4" style={{ color: 'var(--foreground)' }}>
              {errorMessage}
            </Dialog.Description>
            <div className="flex justify-center">
              <Button
                onClick={closeErrorModal}
                className="w-full sm:w-auto"
                style={{ background: 'var(--accent)', color: 'var(--surface)' }}
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
