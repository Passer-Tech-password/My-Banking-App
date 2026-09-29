"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

type CreateUserPayload = {
  customerName: string;
  email: string;
  password: string;
  accountNumber: string;
  balance: number;
  accountStatus: "ACTIVE" | "inactive";
  pin?: string;
  transferCode?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dob?: string;
  mobile?: string;
  phone?: string;
};

type CreatedUserResult = {
  uid: string;
  customerName: string;
  displayName: string;
  email: string;
  accountNumber: string;
  balance: number;
  balanceFormatted: string;
  accountStatus: string;
  password: string;
  pin: string;
  transferCode: string;
};

type CreateUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (created: CreatedUserResult) => void;
};

function isPin(v: string): boolean {
  return /^\d{6}$/.test(v);
}

function isAccountNumber(v: string): boolean {
  return /^\d{10}$/.test(v);
}

function passwordComplexity(v: string): { ok: boolean; message: string } {
  if (v.length < 8) return { ok: false, message: "At least 8 characters" };
  if (!/[A-Z]/.test(v)) return { ok: false, message: "One uppercase letter" };
  if (!/[a-z]/.test(v)) return { ok: false, message: "One lowercase letter" };
  if (!/[0-9]/.test(v)) return { ok: false, message: "One number" };
  if (!/[^A-Za-z0-9]/.test(v)) return { ok: false, message: "One special character" };
  return { ok: true, message: "Strong password" };
}

function secureRandomDigits(len: number): string {
  const out: string[] = [];
  const arr = new Uint32Array(len);
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(arr);
  }
  for (let i = 0; i < len; i++) {
    const v = arr ? arr[i] : Math.floor(Math.random() * 10);
    out.push(String((v ?? 0) % 10));
  }
  return out.join("");
}

const PWD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PWD_LOWER = "abcdefghijkmnpqrstuvwxyz";
const PWD_DIGIT = "23456789";
const PWD_SPECIAL = "!@#$%^&*-_=+?.,";

function secureRandomPassword(len: number = 14): string {
  const groups = [PWD_UPPER, PWD_LOWER, PWD_DIGIT, PWD_SPECIAL];
  const all = groups.join("");
  const pick = (source: string, n: number): string[] => {
    const arr = new Uint32Array(n);
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
    }
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const v = arr ? arr[i] : Math.floor(Math.random() * source.length);
      out.push(source[(v ?? 0) % source.length]);
    }
    return out;
  };
  const required = groups.flatMap((g) => pick(g, 1));
  const rest = pick(all, Math.max(0, len - required.length));
  const combined = [...required, ...rest];
  const shuffle = new Uint32Array(combined.length);
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(shuffle);
  }
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(((shuffle[i] ?? Math.random() * combined.length) % (i + 1)));
    [combined[i], combined[j]] = [combined[j]!, combined[i]!];
  }
  return combined.join("");
}

async function generateUniqueAccountNumber(): Promise<string> {
  try {
    const res = await fetch("/api/admin/users/check-unique", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ field: "accountNumber", generate: true }),
    });
    const body = await res.json().catch(() => null as unknown);
    if (
      res.ok &&
      body &&
      typeof body === "object" &&
      (body as any).ok === true &&
      typeof (body as any).value === "string"
    ) {
      return (body as any).value as string;
    }
  } catch (e) {
    console.warn("Auto-generate accountNumber via API failed, falling back to client-only:", e);
  }
  return secureRandomDigits(10);
}

export default function CreateUserModal({ open, onClose, onSuccess }: CreateUserModalProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CreatedUserResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showTransferCode, setShowTransferCode] = useState(false);
  const [genState, setGenState] = useState<Record<string, boolean>>({});

  const [customerName, setCustomerName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [balance, setBalance] = useState<string>("0.00");
  const [accountStatus, setAccountStatus] = useState<"ACTIVE" | "inactive">("ACTIVE");
  const [pin, setPin] = useState("");
  const [transferCode, setTransferCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateLoc, setStateLoc] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [dob, setDob] = useState("");
  const [mobile, setMobile] = useState("");
  const [phone, setPhone] = useState("");

  const resetForm = () => {
    setError(null);
    setFieldErrors({});
    setResult(null);
    setSubmitting(false);
    setGenState({});
    setCustomerName("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setAccountNumber(secureRandomDigits(10));
    setBalance("0.00");
    setAccountStatus("ACTIVE");
    setPin(secureRandomDigits(6));
    setTransferCode(secureRandomDigits(6));
    setAddress("");
    setCity("");
    setStateLoc("");
    setZipCode("");
    setDob("");
    setMobile("");
    setPhone("");
  };

  const runGenerate = async (key: "accountNumber" | "password" | "pin" | "transferCode") => {
    setGenState((prev) => ({ ...prev, [key]: true }));
    try {
      if (key === "accountNumber") {
        const v = await generateUniqueAccountNumber();
        setAccountNumber(v);
      } else if (key === "password") {
        setPassword(secureRandomPassword(14));
      } else if (key === "pin") {
        setPin(secureRandomDigits(6));
      } else if (key === "transferCode") {
        setTransferCode(secureRandomDigits(6));
      }
      toast.success(`Auto-generated ${key.replace(/([A-Z])/g, " $1").toLowerCase().trim()}.`);
    } catch (e) {
      console.error("Auto-generate failed for", key, e);
      toast.error(`Failed to auto-generate ${key}. Please try again.`);
    } finally {
      setGenState((prev) => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  if (!open) return null;

  const pwdCheck = passwordComplexity(password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    const fieldErrs: Record<string, string> = {};

    if (!customerName.trim()) fieldErrs.customerName = "Customer name is required.";
    if (!email.trim()) fieldErrs.email = "Login email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) fieldErrs.email = "Email format is invalid.";

    if (!password) fieldErrs.password = "Login password is required.";
    else if (!pwdCheck.ok) fieldErrs.password = pwdCheck.message;

    const accountNumberFinal = accountNumber.trim() || secureRandomDigits(10);
    if (!isAccountNumber(accountNumberFinal)) {
      fieldErrs.accountNumber = "Account number must be exactly 10 digits.";
    }

    const balanceNum = Number(String(balance || 0));
    if (!Number.isFinite(balanceNum) || balanceNum < 0) {
      fieldErrs.balance = "Balance must be a non-negative number.";
    }

    const pinFinal = pin.trim() || secureRandomDigits(6);
    if (!isPin(pinFinal)) fieldErrs.pin = "PIN must be exactly 6 digits.";
    const tcFinal = transferCode.trim() || secureRandomDigits(6);
    if (!isPin(tcFinal)) fieldErrs.transferCode = "Transfer code must be exactly 6 digits.";

    setFieldErrors(fieldErrs);
    if (Object.keys(fieldErrs).length > 0) {
      setError("Please correct the highlighted fields.");
      return;
    }

    setError("");

    try {
      const precheckEmail = email.trim().toLowerCase();
      const precheckRes = await fetch(
        `/api/admin/users/check-unique?email=${encodeURIComponent(precheckEmail)}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Cache-Control": "no-store" },
        },
      );
      const precheckBody = await precheckRes
        .json()
        .catch(() => null as unknown);
      if (precheckBody && typeof precheckBody === "object") {
        const emailStatus =
          "email" in precheckBody ? (precheckBody as any).email : undefined;
        const ok =
          "ok" in precheckBody && precheckBody.ok === true ? true : undefined;
        const err =
          "error" in precheckBody && typeof (precheckBody as any).error === "string"
            ? ((precheckBody as any).error as string)
            : "";
        if (
          emailStatus === "taken" ||
          (ok === false && err.toLowerCase().includes("email"))
        ) {
          const fieldMsg =
            "Email is already registered — choose a different address.";
          setFieldErrors((p) => ({ ...p, email: fieldMsg }));
          setError(
            "A user with this login email already exists. Use a different email address.",
          );
          return;
        }
      }
    } catch (e) {
    }

    const payload: CreateUserPayload = {
      customerName: customerName.trim(),
      email: email.trim().toLowerCase(),
      password,
      accountNumber: accountNumberFinal,
      balance: Math.round(balanceNum * 100) / 100,
      accountStatus,
      pin: pinFinal,
      transferCode: tcFinal,
      firstName: firstName.trim() || undefined,
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: stateLoc.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      dob: dob.trim() || undefined,
      mobile: mobile.trim() || undefined,
      phone: phone.trim() || undefined,
    };

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null as unknown);

      if (!res.ok) {
        if (res.status === 401) {
          if (typeof window !== "undefined") window.location.href = "/admin/login";
          return;
        }
        if (body && typeof body === "object") {
          const fields =
            "fields" in body &&
            body.fields &&
            typeof (body as any).fields === "object"
              ? (body as any).fields as Record<string, unknown>
              : null;
          if (fields) {
            const flat: Record<string, string> = {};
            for (const k of Object.keys(fields)) {
              const v = fields[k];
              if (typeof v === "string") flat[k] = v;
            }
            if (Object.keys(flat).length > 0) {
              setFieldErrors((p) => ({ ...p, ...flat }));
            }
          }
          const msg =
            "error" in body && typeof (body as any).error === "string"
              ? (body as any).error as string
              : `Server returned HTTP ${res.status}`;
          const code =
            "code" in body && typeof (body as any).code === "string"
              ? (body as any).code as string
              : "";
          const full = code && !msg.toLowerCase().includes(code.toLowerCase()) ? `${msg} (${code})` : msg;
          setError(full);
          throw new Error(full);
        }
        throw new Error(`HTTP ${res.status}`);
      }

      if (!body || typeof body !== "object" || (body as any).ok !== true || !(body as any).user) {
        throw new Error("Server response missing created user data.");
      }

      const created = (body as any).user as CreatedUserResult;
      setResult(created);
      toast.success("User account created.");
      onSuccess?.(created);
    } catch (err) {
      console.error("Create user failed:", err);
      if (!error) setError(err instanceof Error ? err.message : "Create user failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const generatedPwdHint = (() => {
    if (!password) return "Will be auto-generated if left blank";
    return pwdCheck.message;
  })();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Create User Account</h3>
            <p className="text-sm text-gray-500">Generate a new bank customer login and profile.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {result ? (
          <div className="p-6 space-y-5">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
              <p className="font-semibold mb-1">Account created successfully.</p>
              <p className="text-sm">
                Securely share these credentials with the account holder. PIN and transfer codes are
                shown only once.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <label className="text-gray-500">Customer Name</label>
              <div className="font-medium text-gray-900">{result.customerName}</div>
              <label className="text-gray-500">Login Email</label>
              <div className="font-medium text-gray-900 break-all">{result.email}</div>
              <label className="text-gray-500">Login Password</label>
              <div className="font-mono text-gray-900 break-all">{result.password}</div>
              <label className="text-gray-500">Account Number</label>
              <div className="font-mono text-gray-900">{result.accountNumber}</div>
              <label className="text-gray-500">Account PIN</label>
              <div className="font-mono text-gray-900">{result.pin}</div>
              <label className="text-gray-500">Transfer Code</label>
              <div className="font-mono text-gray-900">{result.transferCode}</div>
              <label className="text-gray-500">Balance</label>
              <div className="font-semibold text-gray-900">{result.balanceFormatted}</div>
              <label className="text-gray-500">Status</label>
              <div className="font-medium text-gray-900">{result.accountStatus}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Create another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Customer Name *" error={fieldErrors.customerName}>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John A. Smith"
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
              <Field label="Login Email *" error={fieldErrors.email}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
              <div>
                <Field label="Login Password *" error={fieldErrors.password} hint={generatedPwdHint}>
                  <div className="flex items-stretch gap-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="StrongP@ssw0rd"
                      disabled={submitting}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={submitting}
                      title={showPassword ? "Hide password" : "Show password"}
                      className="inline-flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-4 h-4 text-gray-600" />
                      ) : (
                        <EyeIcon className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => runGenerate("password")}
                      disabled={submitting || genState.password}
                      title="Auto-generate strong password"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-xs font-semibold text-gray-700"
                    >
                      {genState.password ? (
                        <span className="inline-block h-3.5 w-3.5 border-b-2 border-gray-600 rounded-full animate-spin" />
                      ) : (
                        <ArrowPathIcon className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">auto-generate</span>
                    </button>
                  </div>
                </Field>
              </div>
              <div>
                <Field label="Account Number" error={fieldErrors.accountNumber} hint="10 digits; click auto-generate for uniqueness verified account">
                  <div className="flex items-stretch gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="0123456789"
                      disabled={submitting}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => runGenerate("accountNumber")}
                      disabled={submitting || genState.accountNumber}
                      title="Auto-generate unique account number"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-xs font-semibold text-gray-700"
                    >
                      {genState.accountNumber ? (
                        <span className="inline-block h-3.5 w-3.5 border-b-2 border-gray-600 rounded-full animate-spin" />
                      ) : (
                        <ArrowPathIcon className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">auto-generate</span>
                    </button>
                  </div>
                </Field>
              </div>
              <Field label="Opening Balance ($) *" error={fieldErrors.balance}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
              <Field label="Account Status">
                <select
                  value={accountStatus}
                  onChange={(e) => setAccountStatus(e.target.value as any)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="inactive">inactive</option>
                </select>
              </Field>
              <div>
                <Field label="Account PIN" error={fieldErrors.pin} hint="6 digits; click to auto-generate">
                  <div className="flex items-stretch gap-2">
                    <input
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      disabled={submitting}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin((v) => !v)}
                      disabled={submitting}
                      title={showPin ? "Hide PIN" : "Show PIN"}
                      className="inline-flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {showPin ? (
                        <EyeSlashIcon className="w-4 h-4 text-gray-600" />
                      ) : (
                        <EyeIcon className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => runGenerate("pin")}
                      disabled={submitting || genState.pin}
                      title="Auto-generate secure PIN"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-xs font-semibold text-gray-700"
                    >
                      {genState.pin ? (
                        <span className="inline-block h-3.5 w-3.5 border-b-2 border-gray-600 rounded-full animate-spin" />
                      ) : (
                        <ArrowPathIcon className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">auto-generate</span>
                    </button>
                  </div>
                </Field>
              </div>
              <div>
                <Field label="Transfer Code" error={fieldErrors.transferCode} hint="6 digits; click to auto-generate">
                  <div className="flex items-stretch gap-2">
                    <input
                      type={showTransferCode ? "text" : "password"}
                      inputMode="numeric"
                      value={transferCode}
                      onChange={(e) => setTransferCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="654321"
                      disabled={submitting}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTransferCode((v) => !v)}
                      disabled={submitting}
                      title={showTransferCode ? "Hide transfer code" : "Show transfer code"}
                      className="inline-flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {showTransferCode ? (
                        <EyeSlashIcon className="w-4 h-4 text-gray-600" />
                      ) : (
                        <EyeIcon className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => runGenerate("transferCode")}
                      disabled={submitting || genState.transferCode}
                      title="Auto-generate secure transfer code"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-xs font-semibold text-gray-700"
                    >
                      {genState.transferCode ? (
                        <span className="inline-block h-3.5 w-3.5 border-b-2 border-gray-600 rounded-full animate-spin" />
                      ) : (
                        <ArrowPathIcon className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">auto-generate</span>
                    </button>
                  </div>
                </Field>
              </div>
            </div>

            <details className="rounded-lg border border-gray-200 bg-gray-50 text-sm">
              <summary className="cursor-pointer px-4 py-3 select-none font-medium text-gray-700">
                Optional: Advanced profile fields (name, address, contact)
              </summary>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-200">
                <Field label="First Name (override)">
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
                </Field>
                <Field label="Middle Name">
                  <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
                </Field>
                <Field label="Last Name (override)">
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
                </Field>
                <Field label="Date of Birth">
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
                </Field>
                <Field label="Address">
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
                </Field>
                <Field label="City">
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
                </Field>
                <Field label="State / Province">
                  <input type="text" value={stateLoc} onChange={(e) => setStateLoc(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
                </Field>
                <Field label="Zip / Postal Code">
                  <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
                </Field>
                <Field label="Mobile Number">
                  <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
                </Field>
                <Field label="Alternate Phone">
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
                </Field>
              </div>
            </details>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <span className="inline-block h-4 w-4 border-b-2 border-white rounded-full animate-spin" />
                )}
                {submitting ? "Creating…" : "Create User"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{props.label}</span>
      {props.children}
      {props.error && <span className="block mt-1 text-xs text-red-600">{props.error}</span>}
      {!props.error && props.hint && (
        <span className="block mt-1 text-xs text-gray-500">{props.hint}</span>
      )}
    </label>
  );
}
