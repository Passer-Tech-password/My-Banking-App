"use client";

import { useEffect, use, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ClipboardIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/components/ToastProvider";

type UserDetail = {
  uid: string;
  firstName: string;
  middleName: string;
  lastName: string;
  displayName: string;
  email: string;
  photoURL?: string;
  accountNumber: string;
  balance: number;
  accountStatus: "ACTIVE" | "inactive" | "SUSPENDED" | "CLOSED";
  blocked: boolean;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
  suspendedAt?: string;
  reactivatedAt?: string;
  closedReason?: string;
  suspendedReason?: string;
  reactivatedReason?: string;
  photoVersion?: number;
  role: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  dob: string;
  mobile: string;
  phone?: string;
  language?: string;
  accountPinPlain?: string;
  transferCodePlain?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    postalCode?: string;
    addressLine?: string;
    latitude?: number;
    longitude?: number;
  };
  kycDocuments?: Record<
    string,
    {
      url?: string;
      version?: number;
      format?: string;
      bytes?: number;
      fileName?: string;
      uploadedAt?: string;
      uploadedBy?: string;
    }
  >;
};

type LoadState = { status: "idle" | "loading" | "error"; error?: string | null };

type Adjust = {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  size: 256 | 512;
  quality: 0.85 | 0.9 | 0.95;
  brightness: number;
  contrast: number;
  saturation: number;
};

type KycSlotKey = "id_front" | "id_back" | "passport" | "proof_of_address";

const INITIAL_ADJUST: Adjust = {
  cropX: 0,
  cropY: 0,
  cropW: 1,
  cropH: 1,
  size: 512,
  quality: 0.9,
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

const ACCEPTED = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const KYC_ACCEPTED = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];
const KYC_MAX_BYTES = 10 * 1024 * 1024;

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
];

const KYC_SLOTS: { key: KycSlotKey; label: string }[] = [
  { key: "id_front", label: "ID Card (Front)" },
  { key: "id_back", label: "ID Card (Back)" },
  { key: "passport", label: "Passport" },
  { key: "proof_of_address", label: "Proof of Address" },
];

function readFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image."));
    };
    img.src = url;
  });
}

function applyAdjust(img: HTMLImageElement, adj: Adjust): { blob: Blob; dataUrl: string; width: number; height: number } {
  const W = Math.max(32, Math.round(adj.size));
  const H = Math.max(32, Math.round(adj.size));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.imageSmoothingQuality = "high";

  const sx = Math.max(0, Math.min(img.naturalWidth - 1, Math.floor(img.naturalWidth * adj.cropX)));
  const sy = Math.max(0, Math.min(img.naturalHeight - 1, Math.floor(img.naturalHeight * adj.cropY)));
  const sw = Math.max(1, Math.floor(img.naturalWidth * adj.cropW));
  const sh = Math.max(1, Math.floor(img.naturalHeight * adj.cropH));

  const filter = `brightness(${100 + adj.brightness}%) contrast(${100 + adj.contrast}%) saturate(${100 + adj.saturation}%)`;
  ctx.filter = filter;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);

  const dataUrl = canvas.toDataURL("image/jpeg", adj.quality);
  let blobOut: Blob | null = null;
  canvas.toBlob(
    (b) => {
      blobOut = b;
    },
    "image/jpeg",
    adj.quality,
  );
  if (!blobOut) throw new Error("Canvas export failed.");
  return { blob: blobOut, dataUrl, width: W, height: H };
}

function formatBytes(bytes?: number): string {
  if (typeof bytes !== "number" || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function languageLabel(code?: string): string {
  if (!code) return "—";
  const found = LANGUAGE_OPTIONS.find((o) => o.code === code);
  return found ? found.label : code;
}

export default function AdminUserDetailPage(props: { params?: unknown }) {
  const paramsPromise = (props?.params ?? Promise.resolve({})) as Promise<{ uid?: unknown }>;
  const params = use(paramsPromise);
  const uid = typeof params?.uid === "string" ? params.uid : "";
  const router = useRouter();
  const toast = useToast();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading", error: null });
  const [sessionOk, setSessionOk] = useState(true);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<Adjust>(INITIAL_ADJUST);
  const [preview, setPreview] = useState<{ dataUrl: string; blob: Blob; width: number; height: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<{ url: string; version: number } | null>(null);
  const [copyUrlState, setCopyUrlState] = useState<"idle" | "copied">("idle");
  const [sending, setSending] = useState(false);
  const [sendChannel, setSendChannel] = useState<"email">("email");
  const [customMessage, setCustomMessage] = useState("");

  const [editing, setEditing] = useState<boolean>(false);
  const [editData, setEditData] = useState<{
    firstName: string;
    middleName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    dob: string;
    mobile: string;
    phone: string;
    language: string;
    email: string;
    password: string;
    accountNumber: string;
    accountPin: string;
    transferCode: string;
    location: {
      country: string;
      region: string;
      city: string;
      postalCode: string;
      addressLine: string;
      latitude: number | undefined;
      longitude: number | undefined;
    };
  }>({
    firstName: "",
    middleName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    dob: "",
    mobile: "",
    phone: "",
    language: "en",
    email: "",
    password: "",
    accountNumber: "",
    accountPin: "",
    transferCode: "",
    location: {
      country: "",
      region: "",
      city: "",
      postalCode: "",
      addressLine: "",
      latitude: undefined,
      longitude: undefined,
    },
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [kycUploading, setKycUploading] = useState<Record<string, boolean>>({});
  const [kycErrors, setKycErrors] = useState<Record<string, string>>({});
  const [copyCredState, setCopyCredState] = useState<Record<string, "idle" | "copied">>({});
  const [showCred, setShowCred] = useState<Record<string, boolean>>({
    password: false,
    accountPin: false,
    transferCode: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const kycIdFrontRef = useRef<HTMLInputElement | null>(null);
  const kycIdBackRef = useRef<HTMLInputElement | null>(null);
  const kycPassportRef = useRef<HTMLInputElement | null>(null);
  const kycProofRef = useRef<HTMLInputElement | null>(null);

  const kycRefMap: Record<KycSlotKey, React.RefObject<HTMLInputElement | null>> = {
    id_front: kycIdFrontRef,
    id_back: kycIdBackRef,
    passport: kycPassportRef,
    proof_of_address: kycProofRef,
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "include",
        });
        if (cancelled) return;
        const ok = res.ok;
        const body = ok
          ? await res.json().catch(() => null)
          : null;
        setSessionOk(ok && body && body.ok === true);
      } catch {
        if (!cancelled) setSessionOk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!uid || !sessionOk) {
      setUser(null);
      setLoadState({ status: "error", error: !sessionOk ? "Admin login required." : "Missing uid." });
      return;
    }
    (async () => {
      setLoadState({ status: "loading", error: null });
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`, {
          credentials: "include",
        });
        const text = await res.text().catch(() => "");
        const data = text ? JSON.parse(text) : null;
        if (!res.ok || !data?.ok) {
          const msg = typeof data?.error === "string" ? data.error : `Failed to load (HTTP ${res.status}).`;
          setLoadState({ status: "error", error: msg });
          setUser(null);
          return;
        }
        setUser(data.user as UserDetail);
        setLoadState({ status: "idle", error: null });
      } catch (e) {
        console.error("DETAIL PAGE CLIENT ERROR:", e);
        setLoadState({ status: "error", error: "Network error." });
      }
    })();
  }, [uid, sessionOk]);

  useEffect(() => {
    if (!user) return;
    setEditData({
      firstName: user.firstName ?? "",
      middleName: user.middleName ?? "",
      lastName: user.lastName ?? "",
      address: user.address ?? "",
      city: user.city ?? "",
      state: user.state ?? "",
      zipCode: user.zipCode ?? "",
      dob: user.dob ?? "",
      mobile: user.mobile ?? "",
      phone: user.phone ?? "",
      language: user.language ?? "en",
      email: user.email ?? "",
      password: "",
      accountNumber: user.accountNumber ?? "",
      accountPin: user.accountPinPlain ?? "",
      transferCode: user.transferCodePlain ?? "",
      location: {
        country: user.location?.country ?? "",
        region: user.location?.region ?? "",
        city: user.location?.city ?? "",
        postalCode: user.location?.postalCode ?? "",
        addressLine: user.location?.addressLine ?? "",
        latitude: user.location?.latitude,
        longitude: user.location?.longitude,
      },
    });
  }, [user]);

  useEffect(() => {
    if (!sourceImg) {
      setPreview(null);
      return;
    }
    try {
      const out = applyAdjust(sourceImg, adjust);
      setPreview(out);
      setFileError(null);
    } catch (e) {
      setPreview(null);
      setFileError(e instanceof Error ? e.message : String(e));
    }
  }, [sourceImg, adjust]);

  const onPickFile = async (file: File | null) => {
    setFileError(null);
    setPreview(null);
    setUploaded(null);
    if (!file) {
      setSourceFile(null);
      setSourceImg(null);
      setAdjust(INITIAL_ADJUST);
      return;
    }
    const t0 = performance.now();
    if (!file.type || !ACCEPTED.includes(file.type)) {
      setFileError(
        `Invalid file type "${file.type || file.name}". Allowed: JPG, PNG, GIF, WEBP.`,
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError(`File too large. Max size is 5MB; got ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      return;
    }
    if (file.size <= 0) {
      setFileError("File is empty.");
      return;
    }
    try {
      const img = await readFile(file);
      if (img.naturalWidth < 32 || img.naturalHeight < 32) {
        setFileError("Image too small. Minimum 32×32 pixels.");
        URL.revokeObjectURL(img.src);
        return;
      }
      const isLandscape = img.naturalWidth >= img.naturalHeight;
      const sizeSide = Math.min(img.naturalWidth, img.naturalHeight);
      const cropX = isLandscape ? (img.naturalWidth - sizeSide) / 2 / img.naturalWidth : 0;
      const cropY = isLandscape ? 0 : (img.naturalHeight - sizeSide) / 2 / img.naturalHeight;
      const cropW = isLandscape ? sizeSide / img.naturalWidth : 1;
      const cropH = isLandscape ? 1 : sizeSide / img.naturalHeight;
      setSourceFile(file);
      setSourceImg(img);
      setAdjust({ ...INITIAL_ADJUST, cropX, cropY, cropW, cropH });
      void t0;
    } catch (e) {
      setFileError(e instanceof Error ? e.message : String(e));
    }
  };

  const onUpload = async () => {
    if (!preview || !user?.uid || uploading) return;
    setUploading(true);
    try {
      const form = new FormData();
      const name = `${user.uid}.jpg`;
      form.append("file", new File([preview.blob], name, { type: "image/jpeg" }));
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.uid)}/avatar`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const text = await res.text().catch(() => "");
      const data = text ? JSON.parse(text) : null;
      if (!res.ok || !data?.ok) {
        const msg = typeof data?.error === "string" ? data.error : `Upload failed (HTTP ${res.status}).`;
        toast.error(msg);
        return;
      }
      const url = String(data.url || "");
      const version = Number(data.photoVersion) || 0;
      setUploaded({ url, version });
      setUser((prev) => (prev ? { ...prev, photoURL: url, photoVersion: version } : prev));
      toast.success("Profile picture uploaded and saved.");
    } catch (e) {
      console.error("UPLOAD CLIENT ERROR:", e);
      toast.error("Network error while uploading.");
    } finally {
      setUploading(false);
    }
  };

  const onCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyUrlState("copied");
      toast.success("Profile picture URL copied to clipboard.");
      window.setTimeout(() => setCopyUrlState("idle"), 1800);
    } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopyUrlState("copied");
        toast.success("Profile picture URL copied to clipboard.");
        window.setTimeout(() => setCopyUrlState("idle"), 1800);
      } catch (e2) {
        toast.error("Clipboard copy failed. Copy it manually.");
      }
      console.warn("COPY FALLBACK USED:", e);
    }
  };

  const onSend = async () => {
    if (!user?.uid || sending || !user.photoURL) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.uid)}/notify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendChannel, customMessage: customMessage.trim() }),
      });
      const text = await res.text().catch(() => "");
      const data = text ? JSON.parse(text) : null;
      if (!res.ok || !data?.ok) {
        const msg = typeof data?.error === "string" ? data.error : `Send failed (HTTP ${res.status}).`;
        toast.error(msg);
        return;
      }
      toast.success(`Profile picture sent to ${user.email} via ${sendChannel}.`);
    } catch (e) {
      console.error("SEND CLIENT ERROR:", e);
      toast.error("Network error while sending.");
    } finally {
      setSending(false);
    }
  };

  const onReload = () => {
    router.refresh();
    if (!uid || !sessionOk) return;
    (async () => {
      setLoadState({ status: "loading", error: null });
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}`, {
          credentials: "include",
        });
        const text = await res.text().catch(() => "");
        const data = text ? JSON.parse(text) : null;
        if (!res.ok || !data?.ok) {
          const msg = typeof data?.error === "string" ? data.error : `Failed to load (HTTP ${res.status}).`;
          setLoadState({ status: "error", error: msg });
          setUser(null);
          return;
        }
        setUser(data.user as UserDetail);
        setLoadState({ status: "idle", error: null });
      } catch (e) {
        console.error("DETAIL PAGE CLIENT ERROR:", e);
        setLoadState({ status: "error", error: "Network error." });
      }
    })();
  };

  const startEdit = () => {
    if (!user) return;
    setEditData({
      firstName: user.firstName ?? "",
      middleName: user.middleName ?? "",
      lastName: user.lastName ?? "",
      address: user.address ?? "",
      city: user.city ?? "",
      state: user.state ?? "",
      zipCode: user.zipCode ?? "",
      dob: user.dob ?? "",
      mobile: user.mobile ?? "",
      phone: user.phone ?? "",
      language: user.language ?? "en",
      email: user.email ?? "",
      password: "",
      accountNumber: user.accountNumber ?? "",
      accountPin: user.accountPinPlain ?? "",
      transferCode: user.transferCodePlain ?? "",
      location: {
        country: user.location?.country ?? "",
        region: user.location?.region ?? "",
        city: user.location?.city ?? "",
        postalCode: user.location?.postalCode ?? "",
        addressLine: user.location?.addressLine ?? "",
        latitude: user.location?.latitude,
        longitude: user.location?.longitude,
      },
    });
    setEditErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditErrors({});
  };

  const updateEdit = (key: string, value: any) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
    if (editErrors[key]) {
      setEditErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const updateLocation = (key: string, value: any) => {
    setEditData((prev) => ({
      ...prev,
      location: { ...prev.location, [key]: value },
    }));
    const errKey = `location.${key}`;
    if (editErrors[errKey]) {
      setEditErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  };

  const copyValue = async (key: string, value: string | undefined) => {
    if (!value) {
      toast.error("Nothing to copy for this field.");
      return;
    }
    try {
      if (typeof window !== "undefined" && window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
        await window.navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopyCredState((prev) => ({ ...prev, [key]: "copied" }));
      toast.success("Copied to clipboard.");
      window.setTimeout(() => {
        setCopyCredState((prev) => ({ ...prev, [key]: "idle" }));
      }, 1400);
    } catch (e) {
      toast.error("Failed to copy to clipboard.");
    }
  };

  const saveEdit = async () => {
    if (!user?.uid || savingEdit) return;
    setSavingEdit(true);
    setEditErrors({});
    try {
      const body = {
        firstName: editData.firstName,
        middleName: editData.middleName,
        lastName: editData.lastName,
        address: editData.address,
        city: editData.city,
        state: editData.state,
        zipCode: editData.zipCode,
        dob: editData.dob,
        mobile: editData.mobile,
        phone: editData.phone,
        language: editData.language,
        email: editData.email,
        password: editData.password,
        accountNumber: editData.accountNumber,
        accountPin: editData.accountPin,
        transferCode: editData.transferCode,
        location: {
          country: editData.location.country || undefined,
          region: editData.location.region || undefined,
          city: editData.location.city || undefined,
          postalCode: editData.location.postalCode || undefined,
          addressLine: editData.location.addressLine || undefined,
          latitude: editData.location.latitude,
          longitude: editData.location.longitude,
        },
      };
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.uid)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text().catch(() => "");
      const data = text ? JSON.parse(text) : null;
      if (!res.ok || !data?.ok) {
        if (data?.errors && typeof data.errors === "object") {
          setEditErrors(data.errors as Record<string, string>);
        }
        const msg = typeof data?.error === "string" ? data.error : `Save failed (HTTP ${res.status}).`;
        toast.error(msg);
        return;
      }
      toast.success("User details saved successfully.");
      onReload();
      setEditing(false);
    } catch (e) {
      console.error("SAVE EDIT CLIENT ERROR:", e);
      toast.error("Network error while saving changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const uploadKyc = async (docType: KycSlotKey, file: File | null) => {
    if (!user?.uid) return;
    const validKeys: KycSlotKey[] = ["id_front", "id_back", "passport", "proof_of_address"];
    if (!validKeys.includes(docType)) {
      toast.error("Invalid KYC document type.");
      return;
    }
    setKycErrors((prev) => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
    if (!file) return;
    if (!file.type || !KYC_ACCEPTED.includes(file.type)) {
      const msg = `Invalid file type "${file.type || file.name}". Allowed: JPG, PNG, GIF, WEBP, PDF.`;
      setKycErrors((prev) => ({ ...prev, [docType]: msg }));
      toast.error(msg);
      return;
    }
    if (file.size > KYC_MAX_BYTES) {
      const msg = `File too large. Max size is 10MB; got ${(file.size / 1024 / 1024).toFixed(2)}MB.`;
      setKycErrors((prev) => ({ ...prev, [docType]: msg }));
      toast.error(msg);
      return;
    }
    if (file.size <= 0) {
      const msg = "File is empty.";
      setKycErrors((prev) => ({ ...prev, [docType]: msg }));
      toast.error(msg);
      return;
    }
    setKycUploading((prev) => ({ ...prev, [docType]: true }));
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("docType", docType);
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.uid)}/kyc`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const text = await res.text().catch(() => "");
      const data = text ? JSON.parse(text) : null;
      if (!res.ok || !data?.ok) {
        const msg = typeof data?.error === "string" ? data.error : `Upload failed (HTTP ${res.status}).`;
        setKycErrors((prev) => ({ ...prev, [docType]: msg }));
        toast.error(msg);
        return;
      }
      if (data.document) {
        setUser((prev) => {
          if (!prev) return prev;
          const nextDocs = { ...(prev.kycDocuments ?? {}) };
          nextDocs[docType] = data.document;
          return { ...prev, kycDocuments: nextDocs };
        });
      }
      toast.success(`KYC document "${KYC_SLOTS.find((s) => s.key === docType)?.label ?? docType}" uploaded.`);
      onReload();
    } catch (e) {
      console.error("KYC UPLOAD CLIENT ERROR:", e);
      const msg = "Network error while uploading KYC document.";
      setKycErrors((prev) => ({ ...prev, [docType]: msg }));
      toast.error(msg);
    } finally {
      setKycUploading((prev) => {
        const next = { ...prev };
        delete next[docType];
        return next;
      });
    }
  };

  const statusBadge = useMemo(() => {
    if (!user) return null;
    const map = {
      ACTIVE: { label: "ACTIVE", cls: "bg-green-100 text-green-700 border-green-200" },
      inactive: { label: "Inactive", cls: "bg-gray-100 text-gray-600 border-gray-200" },
      SUSPENDED: { label: "Suspended", cls: "bg-amber-100 text-amber-800 border-amber-200" },
      CLOSED: { label: "Closed", cls: "bg-red-100 text-red-700 border-red-200" },
    } as const;
    const m = map[user.accountStatus] ?? map.inactive!;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${m.cls}`}>
        {m.label}
      </span>
    );
  }, [user]);

  const photoSrc = useMemo(() => {
    if (uploaded?.url) return uploaded.url;
    if (user?.photoURL) return user.photoURL;
    return "";
  }, [uploaded, user?.photoURL]);

  if (!uid) {
    return (
      <div className="p-5 sm:p-8 max-w-3xl mx-auto">
        <p className="text-sm text-gray-700">Missing user id.</p>
        <Link href="/admin/users" className="inline-block mt-2 text-xs font-medium">
          Back to users
        </Link>
      </div>
    );
  }

  if (loadState.status === "loading") {
    return (
      <div className="p-5 sm:p-8 max-w-5xl mx-auto w-full">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
          Loading user detail…
        </div>
      </div>
    );
  }

  if (loadState.status === "error") {
    return (
      <div className="p-5 sm:p-8 max-w-3xl mx-auto w-full">
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm">
          <div className="font-semibold mb-1">Could not load user detail</div>
          <div>{loadState.error ?? "Unknown error."}</div>
          <Link href="/admin/users" className="inline-block mt-3 text-xs font-medium text-blue-700" passHref>
            ← Back to users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="px-3 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-6xl mx-auto">
        <div className="mb-4 sm:mb-6 flex flex-wrap gap-2 sm:gap-3 items-center justify-between w-full">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-xs sm:text-sm font-medium text-gray-700 w-full sm:w-auto justify-center sm:justify-start"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to users
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="text-[11px] sm:text-xs text-gray-500 truncate max-w-full sm:max-w-[20rem] break-all">
              Admin: <span className="font-medium text-gray-700 break-all">{sessionOk ? "authenticated" : "login required"}</span>
            </div>
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-xs sm:text-sm font-medium text-gray-700 w-full sm:w-auto justify-center sm:justify-start"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden w-full">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-w-0 w-full">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1 w-full">
              <div className="flex-shrink-0">
                {photoSrc ? (
                  <img
                    key={photoSrc}
                    src={photoSrc}
                    alt={user?.displayName || "User"}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-gray-100"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold">
                    {((user?.firstName[0] ?? user?.displayName[0] ?? "U") + (user?.lastName[0] ?? "")).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 break-words truncate max-w-full">
                    {user?.displayName || user?.email || uid}
                  </h1>
                  {statusBadge}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 break-all mt-0.5">{user?.email}</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-[11px] sm:text-xs text-gray-600">
                  <div className="break-all">
                    <span className="text-gray-500">Account #</span>{" "}
                    <span className="font-mono text-gray-900">{user?.accountNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Balance</span>{" "}
                    <span className="tabular-nums text-gray-900 font-semibold">
                      ${(user?.balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="break-all">
                    <span className="text-gray-500">Role</span>{" "}
                    <span className="text-gray-900">{user?.role || "user"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 w-full">
            <section>
              <div className="mb-3 flex flex-wrap gap-2 sm:gap-3 items-baseline justify-between">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Profile picture management</h2>
                <div className="text-[11px] sm:text-xs text-gray-500">
                  Allowed: JPG, PNG, GIF, WEBP · max 5MB · min 32×32
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 w-full">
                <div className="lg:col-span-5 w-full min-w-0">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Upload a new picture</label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition ${
                      fileError
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50/60 hover:bg-gray-50"
                    }`}
                  >
                    <PhotoIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <div className="text-xs sm:text-sm text-gray-700 mb-2 break-words whitespace-normal">
                      Drag and drop an image here, or choose a file from your device.
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED.join(",")}
                      onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                      className="block mx-auto text-[11px] sm:text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold hover:file:bg-blue-700"
                    />
                    {sourceFile && (
                      <div className="mt-3 text-[11px] sm:text-xs text-gray-600 break-all">
                        Loaded: <span className="font-medium text-gray-900 break-all">{sourceFile.name}</span> ·{" "}
                        {(sourceFile.size / 1024).toFixed(1)} KB · {sourceFile.type}
                      </div>
                    )}
                    {fileError && (
                      <div className="mt-3 text-[11px] sm:text-xs text-red-700 flex items-start justify-center gap-2 break-words whitespace-normal">
                        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{fileError}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    <AdjustSlider
                      label="Output size"
                      help={`Crop output will be a square. 512px recommended for profile avatars.`}
                    >
                      <select
                        value={String(adjust.size)}
                        onChange={(e) =>
                          setAdjust((a) => ({ ...a, size: Number(e.target.value) === 256 ? 256 : 512 }))
                        }
                        className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="256">Small square (256×256, faster upload)</option>
                        <option value="512">Large square (512×512, recommended)</option>
                      </select>
                    </AdjustSlider>
                    <AdjustSlider label="JPEG quality" help="Higher = sharper but larger file.">
                      <select
                        value={String(adjust.quality)}
                        onChange={(e) =>
                          setAdjust((a) => {
                            const q = Number(e.target.value);
                            const qq: 0.85 | 0.9 | 0.95 = q === 0.85 ? 0.85 : q === 0.95 ? 0.95 : 0.9;
                            return { ...a, quality: qq };
                          })
                        }
                        className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="0.85">Smaller file · 85% quality</option>
                        <option value="0.9">Balanced · 90% quality</option>
                        <option value="0.95">Crisp · 95% quality</option>
                      </select>
                    </AdjustSlider>
                    <AdjustSlider label={`Crop X (${Math.round(adjust.cropX * 100)}%)`} help="Horizontal offset of crop square within source image.">
                      <Range
                        min={0}
                        max={100}
                        value={Math.round(adjust.cropX * 100)}
                        onChange={(v) => setAdjust((a) => ({ ...a, cropX: v / 100 }))}
                      />
                    </AdjustSlider>
                    <AdjustSlider label={`Crop Y (${Math.round(adjust.cropY * 100)}%)`} help="Vertical offset of crop square within source image.">
                      <Range
                        min={0}
                        max={100}
                        value={Math.round(adjust.cropY * 100)}
                        onChange={(v) => setAdjust((a) => ({ ...a, cropY: v / 100 }))}
                      />
                    </AdjustSlider>
                    <AdjustSlider label={`Crop size (${Math.round(adjust.cropW * 100)}% width × ${Math.round(adjust.cropH * 100)}% height)`} help="How much of the source image is used (square output always).">
                      <Range
                        min={20}
                        max={100}
                        value={Math.round(Math.min(adjust.cropW, adjust.cropH) * 100)}
                        onChange={(v) => {
                          const pct = v / 100;
                          setAdjust((a) => {
                            const srcW = sourceImg?.naturalWidth ?? 1;
                            const srcH = sourceImg?.naturalHeight ?? 1;
                            const isLandscape = srcW >= srcH;
                            if (isLandscape) {
                              const cropX = Math.min(Math.max(0, a.cropX), 1 - pct);
                              return { ...a, cropX, cropW: pct, cropH: 1 };
                            }
                            const cropY = Math.min(Math.max(0, a.cropY), 1 - pct);
                            return { ...a, cropY, cropW: 1, cropH: pct };
                          });
                        }}
                      />
                    </AdjustSlider>
                    <AdjustSlider label={`Brightness (${adjust.brightness >= 0 ? "+" : ""}${adjust.brightness}%)`} help="Adjust exposure.">
                      <Range min={-25} max={25} value={adjust.brightness} onChange={(v) => setAdjust((a) => ({ ...a, brightness: v }))} />
                    </AdjustSlider>
                    <AdjustSlider label={`Contrast (${adjust.contrast >= 0 ? "+" : ""}${adjust.contrast}%)`} help="Adjust difference between light and dark.">
                      <Range min={-25} max={25} value={adjust.contrast} onChange={(v) => setAdjust((a) => ({ ...a, contrast: v }))} />
                    </AdjustSlider>
                    <AdjustSlider label={`Saturation (${adjust.saturation >= 0 ? "+" : ""}${adjust.saturation}%)`} help="Adjust color intensity.">
                      <Range min={-50} max={50} value={adjust.saturation} onChange={(v) => setAdjust((a) => ({ ...a, saturation: v }))} />
                    </AdjustSlider>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdjust(INITIAL_ADJUST);
                          if (sourceImg) {
                            const img = sourceImg;
                            const isLandscape = img.naturalWidth >= img.naturalHeight;
                            const sizeSide = Math.min(img.naturalWidth, img.naturalHeight);
                            const cropX = isLandscape ? (img.naturalWidth - sizeSide) / 2 / img.naturalWidth : 0;
                            const cropY = isLandscape ? 0 : (img.naturalHeight - sizeSide) / 2 / img.naturalHeight;
                            const cropW = isLandscape ? sizeSide / img.naturalWidth : 1;
                            const cropH = isLandscape ? 1 : sizeSide / img.naturalHeight;
                            setAdjust({ ...INITIAL_ADJUST, cropX, cropY, cropW, cropH });
                          }
                        }}
                        disabled={!sourceImg}
                        className="px-4 py-2 border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
                      >
                        Reset edits
                      </button>
                      <button
                        type="button"
                        onClick={onUpload}
                        disabled={!preview || uploading || !user?.uid}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                      >
                        {uploading ? (
                          <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/40 border-t-white" />
                        ) : null}
                        {uploading ? "Uploading…" : preview ? "Upload & save profile picture" : "Choose an image first"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 w-full min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Source</label>
                        <span className="text-[11px] sm:text-xs text-gray-500">
                          {sourceImg ? `${sourceImg.naturalWidth}×${sourceImg.naturalHeight} px` : "No source loaded"}
                        </span>
                      </div>
                      <div className="aspect-square w-full rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                        {sourceImg ? (
                          <img
                            src={sourceImg.src}
                            alt="Source preview"
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          photoSrc ? (
                            <img src={photoSrc} alt="Current avatar" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <PhotoIcon className="w-10 h-10 text-gray-300" />
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Edited preview</label>
                        <span className="text-[11px] sm:text-xs text-gray-500">
                          {preview ? `${preview.width}×${preview.height} px · ${(preview.blob.size / 1024).toFixed(1)} KB` : "Preview will appear here"}
                        </span>
                      </div>
                      <div className="aspect-square w-full rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                        {preview ? (
                          <img src={preview.dataUrl} alt="Edited preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-[11px] sm:text-xs text-gray-400 text-center px-4 break-words whitespace-normal">
                            Upload an image and adjust sliders to see the final edited preview.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-6 border-t border-gray-100 pt-4 sm:pt-5 space-y-3 sm:space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-1.5">
                        <label className="text-xs sm:text-sm font-medium text-gray-700">Saved profile picture URL</label>
                        <button
                          type="button"
                          onClick={() => onCopy(photoSrc || "")}
                          disabled={!photoSrc}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-[11px] sm:text-xs font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {copyUrlState === "copied" ? (
                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ClipboardIcon className="w-3.5 h-3.5" />
                          )}
                          {copyUrlState === "copied" ? "Copied!" : "Copy URL"}
                        </button>
                      </div>
                      <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg break-all font-mono text-[11px] sm:text-xs text-gray-700 min-h-[2.5rem]">
                        {photoSrc || "(no profile picture saved yet)"}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                          Send via notification channel
                        </label>
                        <select
                          value={sendChannel}
                          onChange={(e) => setSendChannel(e.target.value as "email")}
                          disabled={!photoSrc}
                          className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-40 disabled:bg-gray-50"
                        >
                          <option value="email" disabled={false}>
                            Email (Resend)
                          </option>
                        </select>
                        <p className="mt-1 text-[11px] sm:text-xs text-gray-500 break-words whitespace-normal">
                          Sends the saved profile picture to the user at{" "}
                          <span className="font-medium text-gray-700 break-all">{user?.email || "—"}</span>
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                          Optional note (saved to audit log, included in email)
                        </label>
                        <textarea
                          rows={2}
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value.slice(0, 1000))}
                          disabled={!photoSrc}
                          placeholder="Example: Please review your updated profile picture before the next statement cycle."
                          className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-40 disabled:bg-gray-50"
                        />
                        <div className="mt-1 text-right text-[10px] sm:text-xs text-gray-400">{customMessage.length} / 1000</div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setCustomMessage("")}
                        disabled={!photoSrc || sending}
                        className="px-4 py-2 border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
                      >
                        Clear note
                      </button>
                      <button
                        type="button"
                        onClick={onSend}
                        disabled={!photoSrc || sending || !user?.uid}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                      >
                        {sending ? (
                          <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/40 border-t-white" />
                        ) : (
                          <EnvelopeIcon className="w-4 h-4" />
                        )}
                        {sending ? "Sending…" : "Send profile picture to user"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-white shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-indigo-100 bg-indigo-50/80 flex flex-wrap gap-2 sm:gap-3 items-baseline justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-indigo-900 flex items-center gap-2">
                    <span className="inline-block w-1.5 h-5 bg-indigo-600 rounded-full" />
                    User Credentials
                  </h2>
                  <div className="text-[11px] sm:text-xs text-indigo-700/80 break-words whitespace-normal mt-0.5">
                    Login details, account number, and secure transaction codes. Sensitive values are masked by default; use the eye icon to reveal. Use the clipboard button to copy each value individually.
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Login Email</label>
                  <div className="flex items-stretch gap-2">
                    {!editing ? (
                      <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md break-all font-mono text-[11px] sm:text-xs text-gray-900 min-h-[2.5rem] flex items-center">
                        {user?.email || "—"}
                      </div>
                    ) : (
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => updateEdit("email", e.target.value)}
                        className="flex-1 text-[11px] sm:text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                        placeholder="user@example.com"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => copyValue("email", user?.email)}
                      disabled={!user?.email}
                      title={copyCredState.email === "copied" ? "Copied!" : "Copy email address"}
                      className="relative inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-[11px] sm:text-xs font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {copyCredState.email === "copied" ? (
                        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <ClipboardIcon className="w-3.5 h-3.5" />
                      )}
                      {copyCredState.email === "copied" && (
                        <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-gray-900 text-white text-[10px] shadow-lg z-10">
                          Copied!
                        </span>
                      )}
                      <span className="sm:hidden">{copyCredState.email === "copied" ? "Ok" : "Copy"}</span>
                    </button>
                  </div>
                  {editErrors.email ? (
                    <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.email}</div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Login Password</label>
                  <div className="flex items-stretch gap-2">
                    {!editing ? (
                      <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md break-all font-mono text-[11px] sm:text-xs text-gray-500 italic min-h-[2.5rem] flex items-center">
                        (password hidden · use Edit to set)
                      </div>
                    ) : (
                      <>
                        <input
                          type={showCred.password ? "text" : "password"}
                          autoComplete="new-password"
                          value={editData.password}
                          onChange={(e) => updateEdit("password", e.target.value)}
                          className="flex-1 text-[11px] sm:text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                          placeholder="Leave blank to keep current password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCred((prev) => ({ ...prev, password: !prev.password }))
                          }
                          disabled={!editData.password && !showCred.password}
                          title={showCred.password ? "Hide password" : "Show password"}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {showCred.password ? (
                            <EyeSlashIcon className="w-3.5 h-3.5 text-gray-600" />
                          ) : (
                            <EyeIcon className="w-3.5 h-3.5 text-gray-600" />
                          )}
                        </button>
                      </>
                    )}
                    {editing ? (
                      <button
                        type="button"
                        onClick={() => copyValue("password", editData.password)}
                        disabled={!editData.password}
                        title={copyCredState.password === "copied" ? "Copied!" : "Copy new password"}
                        className="relative inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-[11px] sm:text-xs font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {copyCredState.password === "copied" ? (
                          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <ClipboardIcon className="w-3.5 h-3.5" />
                        )}
                        {copyCredState.password === "copied" && (
                          <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-gray-900 text-white text-[10px] shadow-lg z-10">
                            Copied!
                          </span>
                        )}
                      </button>
                    ) : null}
                  </div>
                  {editing ? (
                    <div className="mt-1 text-[10px] sm:text-[11px] text-gray-500 break-words whitespace-normal">
                      Min 8 characters · uppercase + lowercase + number · leave blank to keep unchanged
                    </div>
                  ) : null}
                  {editErrors.password ? (
                    <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.password}</div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Account Number (10 digits)</label>
                  <div className="flex items-stretch gap-2">
                    {!editing ? (
                      <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md break-all font-mono text-[11px] sm:text-xs text-gray-900 tabular-nums min-h-[2.5rem] flex items-center">
                        {user?.accountNumber || "—"}
                      </div>
                    ) : (
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        value={editData.accountNumber}
                        onChange={(e) => updateEdit("accountNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="flex-1 text-[11px] sm:text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono tabular-nums"
                        placeholder="10 digits"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => copyValue("accountNumber", user?.accountNumber)}
                      disabled={!user?.accountNumber}
                      title={copyCredState.accountNumber === "copied" ? "Copied!" : "Copy account number"}
                      className="relative inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-[11px] sm:text-xs font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {copyCredState.accountNumber === "copied" ? (
                        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <ClipboardIcon className="w-3.5 h-3.5" />
                      )}
                      {copyCredState.accountNumber === "copied" && (
                        <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-gray-900 text-white text-[10px] shadow-lg z-10">
                          Copied!
                        </span>
                      )}
                    </button>
                  </div>
                  {editErrors.accountNumber ? (
                    <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.accountNumber}</div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Account PIN (6 digits)</label>
                  <div className="flex items-stretch gap-2">
                    {!editing ? (
                      <>
                        <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md break-all font-mono text-[11px] sm:text-xs text-gray-900 tabular-nums min-h-[2.5rem] flex items-center tracking-wider">
                          {user?.accountPinPlain
                            ? showCred.accountPin
                              ? user.accountPinPlain
                              : "••••••"
                            : <span className="text-gray-500 italic tracking-normal">— not set</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setShowCred((prev) => ({ ...prev, accountPin: !prev.accountPin }))
                          }
                          disabled={!user?.accountPinPlain && !showCred.accountPin}
                          title={showCred.accountPin ? "Mask account PIN" : "Reveal account PIN"}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {showCred.accountPin ? (
                            <EyeSlashIcon className="w-3.5 h-3.5 text-gray-600" />
                          ) : (
                            <EyeIcon className="w-3.5 h-3.5 text-gray-600" />
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type={showCred.accountPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={6}
                          value={editData.accountPin}
                          onChange={(e) => updateEdit("accountPin", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="flex-1 text-[11px] sm:text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono tabular-nums"
                          placeholder="6 digits (blank = keep current)"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCred((prev) => ({ ...prev, accountPin: !prev.accountPin }))
                          }
                          disabled={!editData.accountPin && !showCred.accountPin}
                          title={showCred.accountPin ? "Hide PIN" : "Show PIN"}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {showCred.accountPin ? (
                            <EyeSlashIcon className="w-3.5 h-3.5 text-gray-600" />
                          ) : (
                            <EyeIcon className="w-3.5 h-3.5 text-gray-600" />
                          )}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => copyValue("accountPin", user?.accountPinPlain)}
                      disabled={!user?.accountPinPlain}
                      title={copyCredState.accountPin === "copied" ? "Copied!" : "Copy account PIN"}
                      className="relative inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-[11px] sm:text-xs font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {copyCredState.accountPin === "copied" ? (
                        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <ClipboardIcon className="w-3.5 h-3.5" />
                      )}
                      {copyCredState.accountPin === "copied" && (
                        <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-gray-900 text-white text-[10px] shadow-lg z-10">
                          Copied!
                        </span>
                      )}
                    </button>
                  </div>
                  {editErrors.accountPin ? (
                    <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.accountPin}</div>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Transfer Code (6 digits)</label>
                  <div className="flex items-stretch gap-2">
                    {!editing ? (
                      <>
                        <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md break-all font-mono text-[11px] sm:text-xs text-gray-900 tabular-nums min-h-[2.5rem] flex items-center tracking-wider">
                          {user?.transferCodePlain
                            ? showCred.transferCode
                              ? user.transferCodePlain
                              : "••••••"
                            : <span className="text-gray-500 italic tracking-normal">— not set</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setShowCred((prev) => ({ ...prev, transferCode: !prev.transferCode }))
                          }
                          disabled={!user?.transferCodePlain && !showCred.transferCode}
                          title={showCred.transferCode ? "Mask transfer code" : "Reveal transfer code"}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {showCred.transferCode ? (
                            <EyeSlashIcon className="w-3.5 h-3.5 text-gray-600" />
                          ) : (
                            <EyeIcon className="w-3.5 h-3.5 text-gray-600" />
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type={showCred.transferCode ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={6}
                          value={editData.transferCode}
                          onChange={(e) => updateEdit("transferCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="flex-1 text-[11px] sm:text-xs border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono tabular-nums"
                          placeholder="6 digits (blank = keep current)"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCred((prev) => ({ ...prev, transferCode: !prev.transferCode }))
                          }
                          disabled={!editData.transferCode && !showCred.transferCode}
                          title={showCred.transferCode ? "Hide transfer code" : "Show transfer code"}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {showCred.transferCode ? (
                            <EyeSlashIcon className="w-3.5 h-3.5 text-gray-600" />
                          ) : (
                            <EyeIcon className="w-3.5 h-3.5 text-gray-600" />
                          )}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => copyValue("transferCode", user?.transferCodePlain)}
                      disabled={!user?.transferCodePlain}
                      title={copyCredState.transferCode === "copied" ? "Copied!" : "Copy transfer code"}
                      className="relative inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-[11px] sm:text-xs font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {copyCredState.transferCode === "copied" ? (
                        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <ClipboardIcon className="w-3.5 h-3.5" />
                      )}
                      {copyCredState.transferCode === "copied" && (
                        <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-gray-900 text-white text-[10px] shadow-lg z-10">
                          Copied!
                        </span>
                      )}
                    </button>
                  </div>
                  {editErrors.transferCode ? (
                    <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.transferCode}</div>
                  ) : null}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex flex-wrap gap-2 sm:gap-3 items-baseline justify-between">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Profile & Preferences</h2>
                {!editing ? (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-[11px] sm:text-xs font-medium text-gray-700"
                  >
                    Edit details
                  </button>
                ) : null}
              </div>

              {!editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4">
                  <div>
                    <div className="text-[11px] sm:text-xs text-gray-500 mb-0.5">Name</div>
                    <div className="text-xs sm:text-sm text-gray-900 break-words whitespace-normal">
                      {[user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(" ") || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs text-gray-500 mb-0.5">Mailing Address</div>
                    <div className="text-xs sm:text-sm text-gray-900 break-words whitespace-normal">
                      {[user?.address, [user?.city, user?.state, user?.zipCode].filter(Boolean).join(" ")]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs text-gray-500 mb-0.5">Date of Birth</div>
                    <div className="text-xs sm:text-sm text-gray-900">{user?.dob || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs text-gray-500 mb-0.5">Mobile</div>
                    <div className="text-xs sm:text-sm text-gray-900 break-all">{user?.mobile || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs text-gray-500 mb-0.5">Phone</div>
                    <div className="text-xs sm:text-sm text-gray-900 break-all">{user?.phone || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs text-gray-500 mb-0.5">Preferred Language</div>
                    <div className="text-xs sm:text-sm text-gray-900">{languageLabel(user?.language)}</div>
                  </div>
                  {user?.location?.country ||
                  user?.location?.region ||
                  user?.location?.city ||
                  user?.location?.postalCode ||
                  user?.location?.addressLine ||
                  typeof user?.location?.latitude === "number" ||
                  typeof user?.location?.longitude === "number" ? (
                    <div className="sm:col-span-2">
                      <div className="text-[11px] sm:text-xs text-gray-500 mb-1">Location</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                        {user.location?.country ? (
                          <div>
                            <div className="text-[10px] sm:text-[11px] text-gray-500">Country</div>
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{user.location.country}</div>
                          </div>
                        ) : null}
                        {user.location?.region ? (
                          <div>
                            <div className="text-[10px] sm:text-[11px] text-gray-500">Region / State</div>
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{user.location.region}</div>
                          </div>
                        ) : null}
                        {user.location?.city ? (
                          <div>
                            <div className="text-[10px] sm:text-[11px] text-gray-500">City</div>
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{user.location.city}</div>
                          </div>
                        ) : null}
                        {user.location?.postalCode ? (
                          <div>
                            <div className="text-[10px] sm:text-[11px] text-gray-500">Postal Code</div>
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{user.location.postalCode}</div>
                          </div>
                        ) : null}
                        {user.location?.addressLine ? (
                          <div className="sm:col-span-2">
                            <div className="text-[10px] sm:text-[11px] text-gray-500">Address Line</div>
                            <div className="text-xs sm:text-sm text-gray-900 break-words whitespace-normal">
                              {user.location.addressLine}
                            </div>
                          </div>
                        ) : null}
                        {typeof user.location?.latitude === "number" ||
                        typeof user.location?.longitude === "number" ? (
                          <div className="sm:col-span-2">
                            <div className="text-[10px] sm:text-[11px] text-gray-500">Coordinates</div>
                            <div className="text-xs sm:text-sm font-mono text-gray-900 break-all">
                              {typeof user.location.latitude === "number"
                                ? `Lat ${user.location.latitude.toFixed(6)}`
                                : ""}
                              {typeof user.location.latitude === "number" &&
                              typeof user.location.longitude === "number"
                                ? " · "
                                : ""}
                              {typeof user.location.longitude === "number"
                                ? `Lng ${user.location.longitude.toFixed(6)}`
                                : ""}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={editData.firstName}
                      onChange={(e) => updateEdit("firstName", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {editErrors.firstName ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.firstName}</div>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={editData.middleName}
                      onChange={(e) => updateEdit("middleName", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {editErrors.middleName ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.middleName}</div>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editData.lastName}
                      onChange={(e) => updateEdit("lastName", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {editErrors.lastName ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.lastName}</div>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={editData.address}
                      onChange={(e) => updateEdit("address", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {editErrors.address ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.address}</div>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={editData.city}
                      onChange={(e) => updateEdit("city", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {editErrors.city ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.city}</div>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">State / Region</label>
                    <input
                      type="text"
                      value={editData.state}
                      onChange={(e) => updateEdit("state", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {editErrors.state ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.state}</div>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Postal / ZIP Code</label>
                    <input
                      type="text"
                      value={editData.zipCode}
                      onChange={(e) => updateEdit("zipCode", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {editErrors.zipCode ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.zipCode}</div>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editData.dob}
                      onChange={(e) => updateEdit("dob", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {editErrors.dob ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.dob}</div>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
                    <select
                      value={editData.language}
                      onChange={(e) => updateEdit("language", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {editErrors.language ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.language}</div>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input
                      type="tel"
                      value={editData.mobile}
                      onChange={(e) => updateEdit("mobile", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {editErrors.mobile ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.mobile}</div>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => updateEdit("phone", e.target.value)}
                      className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {editErrors.phone ? (
                      <div className="mt-1 text-[11px] text-red-700 break-words">{editErrors.phone}</div>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3">Location</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={editData.location.country}
                          onChange={(e) => updateLocation("country", e.target.value)}
                          className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {editErrors["location.country"] ? (
                          <div className="mt-1 text-[11px] text-red-700 break-words">
                            {editErrors["location.country"]}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Region</label>
                        <input
                          type="text"
                          value={editData.location.region}
                          onChange={(e) => updateLocation("region", e.target.value)}
                          className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {editErrors["location.region"] ? (
                          <div className="mt-1 text-[11px] text-red-700 break-words">
                            {editErrors["location.region"]}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={editData.location.city}
                          onChange={(e) => updateLocation("city", e.target.value)}
                          className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {editErrors["location.city"] ? (
                          <div className="mt-1 text-[11px] text-red-700 break-words">
                            {editErrors["location.city"]}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={editData.location.postalCode}
                          onChange={(e) => updateLocation("postalCode", e.target.value)}
                          className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {editErrors["location.postalCode"] ? (
                          <div className="mt-1 text-[11px] text-red-700 break-words">
                            {editErrors["location.postalCode"]}
                          </div>
                        ) : null}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Address Line</label>
                        <input
                          type="text"
                          value={editData.location.addressLine}
                          onChange={(e) => updateLocation("addressLine", e.target.value)}
                          className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {editErrors["location.addressLine"] ? (
                          <div className="mt-1 text-[11px] text-red-700 break-words">
                            {editErrors["location.addressLine"]}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          value={
                            typeof editData.location.latitude === "number" ? editData.location.latitude : ""
                          }
                          onChange={(e) =>
                            updateLocation(
                              "latitude",
                              e.target.value === "" ? undefined : Number(e.target.value),
                            )
                          }
                          className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {editErrors["location.latitude"] ? (
                          <div className="mt-1 text-[11px] text-red-700 break-words">
                            {editErrors["location.latitude"]}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          value={
                            typeof editData.location.longitude === "number" ? editData.location.longitude : ""
                          }
                          onChange={(e) =>
                            updateLocation(
                              "longitude",
                              e.target.value === "" ? undefined : Number(e.target.value),
                            )
                          }
                          className="w-full text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        {editErrors["location.longitude"] ? (
                          <div className="mt-1 text-[11px] text-red-700 break-words">
                            {editErrors["location.longitude"]}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={savingEdit}
                      className="px-4 py-2 border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={savingEdit}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                      {savingEdit ? (
                        <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/40 border-t-white" />
                      ) : null}
                      {savingEdit ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section>
              <div className="mb-3">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">KYC Documents</h2>
                <div className="text-[11px] sm:text-xs text-gray-500 break-words whitespace-normal">
                  Allowed: JPG, PNG, GIF, WEBP, PDF · max 10MB per document
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {KYC_SLOTS.map((slot) => {
                  const doc = user?.kycDocuments?.[slot.key];
                  const isUploading = Boolean(kycUploading[slot.key]);
                  const err = kycErrors[slot.key];
                  const ref = kycRefMap[slot.key];
                  return (
                    <div
                      key={slot.key}
                      className="border border-gray-200 rounded-xl bg-gray-50/40 p-3 sm:p-4 flex flex-col gap-2 sm:gap-3"
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 break-words">
                          {slot.label}
                        </h3>
                        <button
                          type="button"
                          onClick={() => ref.current?.click()}
                          disabled={isUploading}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {isUploading ? (
                            <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white/40 border-t-white" />
                          ) : null}
                          {isUploading ? "Uploading…" : "Upload"}
                        </button>
                        <input
                          ref={ref}
                          type="file"
                          accept={KYC_ACCEPTED.join(",")}
                          className="hidden"
                          onChange={(e) => uploadKyc(slot.key, e.target.files?.[0] ?? null)}
                        />
                      </div>

                      {doc?.url ? (
                        <div className="text-[11px] sm:text-xs space-y-1 bg-white border border-gray-200 rounded-lg p-2.5 sm:p-3">
                          <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                            <span className="text-gray-500">File:</span>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="font-medium text-blue-700 hover:underline break-all"
                            >
                              {doc.fileName || doc.url}
                            </a>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2 text-gray-600">
                            <span className="text-gray-500">Size:</span>
                            <span className="tabular-nums">{formatBytes(doc.bytes)}</span>
                            {doc.version ? (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-gray-500">v{doc.version}</span>
                              </>
                            ) : null}
                            {doc.format ? (
                              <>
                                <span className="text-gray-300">·</span>
                                <span>{doc.format}</span>
                              </>
                            ) : null}
                          </div>
                          {doc.uploadedAt ? (
                            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2 text-gray-600">
                              <span className="text-gray-500">Uploaded:</span>
                              <span>{new Date(doc.uploadedAt).toLocaleString()}</span>
                            </div>
                          ) : null}
                          {doc.uploadedBy ? (
                            <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2 text-gray-600">
                              <span className="text-gray-500">By admin:</span>
                              <span className="break-all">{doc.uploadedBy}</span>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-[11px] sm:text-xs text-gray-500 bg-white/60 border border-dashed border-gray-200 rounded-lg p-2.5 sm:p-3">
                          No document uploaded yet.
                        </div>
                      )}

                      {err ? (
                        <div className="text-[11px] sm:text-xs text-red-700 flex items-start gap-1.5 sm:gap-2 break-words whitespace-normal">
                          <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span>{err}</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdjustSlider({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="text-[11px] sm:text-xs font-medium text-gray-700 break-words whitespace-normal">{label}</label>
      </div>
      {children}
      {help ? <div className="mt-1 text-[10px] sm:text-xs text-gray-500 break-words whitespace-normal">{help}</div> : null}
    </div>
  );
}

function Range({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-blue-600"
    />
  );
}
