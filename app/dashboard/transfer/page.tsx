"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ArrowRightIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/ToastProvider";

interface SenderProfile {
  accountNumber?: string;
  balance?: number;
  accountPin?: unknown;
  transferCode?: unknown;
  blocked?: boolean;
  accountStatus?: string;
  displayName?: string;
}

type StatusKind = "idle" | "info" | "success" | "error";

function formatCurrency(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function validateAccountNumber(v: string): string {
  if (!v.trim()) return "Recipient account number is required.";
  if (!/^\d{10}$/.test(v.trim())) return "Recipient account number must be exactly 10 digits.";
  return "";
}

function validateAmount(v: string, balance: number): string {
  if (!v.trim()) return "Amount is required.";
  const n = Number(v);
  if (!Number.isFinite(n)) return "Amount must be a number.";
  if (n <= 0) return "Amount must be greater than zero.";
  if (balance > 0 && n > balance + 0.0001) return "Amount exceeds your available balance.";
  return "";
}

function validatePin(v: string): string {
  if (!v) return "PIN is required.";
  if (!/^\d{6}$/.test(v)) return "PIN must be exactly 6 digits.";
  return "";
}

function validateTransferCode(v: string): string {
  if (!v) return "Transfer code is required.";
  if (!/^\d{6}$/.test(v)) return "Transfer code must be exactly 6 digits.";
  return "";
}

export default function UserTransferPage() {
  const router = useRouter();
  const toast = useToast();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SenderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notEligible, setNotEligible] = useState<string | null>(null);

  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [transferCode, setTransferCode] = useState("");
  const [reference, setReference] = useState("");

  const [lookupStatus, setLookupStatus] = useState<
    { kind: "idle" | "loading" | "success" | "error"; accountName?: string; message?: string }
  >({ kind: "idle" });
  const [recipientNameConfirmed, setRecipientNameConfirmed] = useState(false);
  const pendingLookupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookupRequestRef = useRef<number>(0);

  const [showPin, setShowPin] = useState(false);
  const [showTransferCode, setShowTransferCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<{ kind: StatusKind; message: string }>({
    kind: "idle",
    message: "",
  });

  useEffect(() => {
    let cancelled = false;
    let profileUnsub: null | (() => void) = null;
    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      if (!user) {
        setAuthUser(null);
        setProfile(null);
        router.push("/login");
        return;
      }
      setAuthUser(user);
      if (profileUnsub) profileUnsub();
      profileUnsub = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          if (cancelled) return;
          if (!snap.exists()) {
            setProfile(null);
            setNotEligible(
              "Your user profile has not been provisioned yet. Please refresh or contact support.",
            );
            setLoading(false);
            return;
          }
          const data = snap.data() as SenderProfile;
          setProfile(data);
          const hasAcct = /^\d{10}$/.test(String(data.accountNumber || "").trim());
          const hasPin = !!String(data?.accountPin || "");
          const hasTc = !!String(data?.transferCode || "");
          if (!hasAcct || !hasPin || !hasTc) {
            setNotEligible(
              "Fund transfers are available only for accounts created through the Admin Portal with a registered account number, PIN, and transfer code. Self-registered accounts are not eligible for this feature.",
            );
          } else {
            setNotEligible(null);
          }
          setLoading(false);
        },
        (e) => {
          if (cancelled) return;
          console.error("Transfer page: profile stream error:", e);
          setNotEligible("Failed to load your account profile. Please refresh the page.");
          setLoading(false);
        },
      );
    });
    return () => {
      cancelled = true;
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, [router]);

  const balance = useMemo(() => Number(profile?.balance ?? 0) || 0, [profile]);

  const runLookup = async (accountNumber: string, requestId: number) => {
    if (!/^\d{10}$/.test(accountNumber) || !authUser) {
      setLookupStatus({ kind: "idle" });
      setRecipientNameConfirmed(false);
      return;
    }
    try {
      setLookupStatus({ kind: "loading" });
      const token = await authUser.getIdToken();
      const res = await fetch("/api/user/lookup-account", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accountNumber }),
      });
      if (requestId !== lookupRequestRef.current) return;
      const text = await res.text().catch(() => "");
      const data: any = text ? JSON.parse(text) : null;
      if (!res.ok || !data?.ok) {
        const msg =
          typeof data?.message === "string"
            ? data.message
            : "Unable to verify this account number.";
        setLookupStatus({ kind: "error", message: msg });
        setRecipientNameConfirmed(false);
        return;
      }
      setLookupStatus({ kind: "success", accountName: String(data.accountName || "") });
      setRecipientNameConfirmed((prev) => (prev ? prev : false));
    } catch (e) {
      if (requestId !== lookupRequestRef.current) return;
      console.error("Transfer UI: account lookup error:", e);
      setLookupStatus({ kind: "error", message: "Network error while looking up account." });
      setRecipientNameConfirmed(false);
    }
  };

  useEffect(() => {
    if (!/^\d{10}$/.test(recipientAccountNumber)) {
      if (pendingLookupRef.current) {
        clearTimeout(pendingLookupRef.current);
        pendingLookupRef.current = null;
      }
      lookupRequestRef.current += 1;
      setLookupStatus({ kind: "idle" });
      setRecipientNameConfirmed(false);
      return;
    }
    if (pendingLookupRef.current) clearTimeout(pendingLookupRef.current);
    const acct = recipientAccountNumber;
    pendingLookupRef.current = setTimeout(() => {
      lookupRequestRef.current += 1;
      void runLookup(acct, lookupRequestRef.current);
    }, 250);
    return () => {
      if (pendingLookupRef.current) clearTimeout(pendingLookupRef.current);
    };
  }, [recipientAccountNumber, authUser]);

  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (touched.recipientAccountNumber) {
      const err = validateAccountNumber(recipientAccountNumber);
      if (err) errs.recipientAccountNumber = err;
    }
    if (touched.amount) {
      const err = validateAmount(amount, balance);
      if (err) errs.amount = err;
    }
    if (touched.pin) {
      const err = validatePin(pin);
      if (err) errs.pin = err;
    }
    if (touched.transferCode) {
      const err = validateTransferCode(transferCode);
      if (err) errs.transferCode = err;
    }
    return errs;
  }, [touched, recipientAccountNumber, amount, pin, transferCode, balance]);

  const canSubmit =
    authUser != null &&
    profile != null &&
    notEligible == null &&
    !submitting &&
    lookupStatus.kind === "success" &&
    recipientNameConfirmed === true &&
    !validateAccountNumber(recipientAccountNumber) &&
    !validateAmount(amount, balance) &&
    !validatePin(pin) &&
    !validateTransferCode(transferCode);

  const handleBlur = (name: string) => {
    setTouched((p) => ({ ...p, [name]: true }));
  };

  const handleSuccessBannerDismiss = () => {
    if (!submitting) setStatus({ kind: "idle", message: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      recipientAccountNumber: true,
      amount: true,
      pin: true,
      transferCode: true,
      reference: true,
    });
    setStatus({ kind: "idle", message: "" });
    if (!authUser || !profile) {
      setStatus({ kind: "error", message: "Not signed in." });
      return;
    }
    const hasAcct = /^\d{10}$/.test(String(profile.accountNumber || ""));
    if (!hasAcct || notEligible) {
      setStatus({
        kind: "error",
        message:
          notEligible ||
          "Your account is not eligible for transfers. Contact the administrator.",
      });
      return;
    }
    if (!canSubmit) {
      const firstErr =
        (lookupStatus.kind !== "success" && /^\d{10}$/.test(recipientAccountNumber.trim()))
          ? lookupStatus.kind === "loading"
            ? "Please wait while we verify the recipient account."
            : lookupStatus.kind === "error"
              ? `Account verification failed: ${lookupStatus.message || "Please verify the account number."}`
              : "Please verify the recipient account before submitting."
          : !recipientNameConfirmed && lookupStatus.kind === "success"
            ? "Please confirm that the displayed account name matches your intended recipient."
            : fieldErrors.recipientAccountNumber ||
              fieldErrors.amount ||
              fieldErrors.pin ||
              fieldErrors.transferCode ||
              "Please correct the highlighted fields.";
      setStatus({ kind: "error", message: firstErr });
      return;
    }

    setSubmitting(true);
    try {
      const token = await authUser.getIdToken(true);
      const res = await fetch("/api/user/transfer", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientAccountNumber: recipientAccountNumber.trim(),
          amount: Number(amount),
          pin,
          transferCode,
          reference: reference.trim(),
        }),
      });
      const text = await res.text().catch(() => "");
      const data: any = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const code: string | undefined = data?.code;
        const msg: string =
          typeof data?.message === "string"
            ? data.message
            : "Transfer request was declined. Please try again.";
        switch (code) {
          case "invalid_pin":
          case "invalid_transfer_code":
            setStatus({ kind: "error", message: msg });
            toast.error(msg);
            break;
          case "insufficient_balance":
            setStatus({ kind: "error", message: msg });
            toast.error(msg);
            break;
          case "recipient_not_found":
            setStatus({
              kind: "error",
              message: `${msg} Please verify the 10-digit recipient account number and try again.`,
            });
            break;
          case "self_transfer":
            setStatus({ kind: "error", message: msg });
            break;
          case "account_restricted":
            setStatus({ kind: "error", message: msg });
            break;
          case "not_eligible":
            setStatus({ kind: "error", message: msg });
            break;
          case "unauthorized":
            setStatus({
              kind: "error",
              message: "Your session has expired. Please sign in again.",
            });
            toast.error("Session expired.");
            setTimeout(() => router.push("/login"), 800);
            break;
          case "invalid_request":
            if (data?.details?.fields && typeof data.details.fields === "object") {
              const first = Object.values(data.details.fields)[0];
              setStatus({
                kind: "error",
                message: typeof first === "string" ? first : msg,
              });
            } else {
              setStatus({ kind: "error", message: msg });
            }
            break;
          default:
            setStatus({ kind: "error", message: msg });
        }
        return;
      }

      setStatus({
        kind: "success",
        message:
          `Transfer of ${typeof data?.amountFormatted === "string" ? data.amountFormatted : formatCurrency(Number(amount))} ` +
          `to account ${recipientAccountNumber.trim()} completed successfully.`,
      });
      toast.success("Transfer completed successfully.");

      setRecipientAccountNumber("");
      setAmount("");
      setPin("");
      setTransferCode("");
      setReference("");
      setTouched({});
      setRecipientNameConfirmed(false);
    } catch (err) {
      console.error("Transfer UI: submit error:", err);
      setStatus({
        kind: "error",
        message:
          "A network error occurred while submitting the transfer. Please check your connection and try again.",
      });
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBanner = (() => {
    if (status.kind === "idle") return null;
    const tone = {
      success: "bg-emerald-50 border-emerald-200 text-emerald-800",
      error: "bg-red-50 border-red-200 text-red-700",
      info: "bg-blue-50 border-blue-200 text-blue-800",
      idle: "bg-gray-50 border-gray-200 text-gray-700",
    }[status.kind];
    const Icon =
      status.kind === "success"
        ? CheckCircleIcon
        : status.kind === "error"
          ? ExclamationTriangleIcon
          : InformationCircleIcon;
    const iconColor =
      status.kind === "success"
        ? "text-emerald-600"
        : status.kind === "error"
          ? "text-red-500"
          : "text-blue-500";
    const dismissable = status.kind === "success";
    return (
      <div
        role={status.kind === "error" ? "alert" : "status"}
        aria-live="polite"
        className={`border rounded-lg px-4 py-3 text-sm ${tone} flex items-start gap-3`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
        <div className="flex-1 whitespace-pre-wrap">{status.message}</div>
        {dismissable && (
          <button
            type="button"
            onClick={handleSuccessBannerDismiss}
            className="text-xs text-emerald-700 hover:underline flex-shrink-0"
          >
            Dismiss
          </button>
        )}
      </div>
    );
  })();

  const inputClass = (errored: boolean) =>
    `w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
      errored
        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
        : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Funds</h1>
        <p className="text-sm text-gray-500 mt-1">
          Transfer money instantly using the recipient&apos;s 10-digit account number. You must
          confirm your identity with your account PIN and transfer code before the transfer is
          processed.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
          <span className="inline-block h-5 w-5 border-b-2 border-gray-600 rounded-full animate-spin align-middle mr-2" />
          Loading your account…
        </div>
      ) : notEligible ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 max-w-2xl">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-900 mb-1">
                Transfer feature is not available for this account
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">{notEligible}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="recipientAccountNumber"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Recipient Account Number
                  </label>
                  <span className="text-xs text-gray-500">10 digits</span>
                </div>
                <input
                  id="recipientAccountNumber"
                  name="recipientAccountNumber"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 1234567890"
                  value={recipientAccountNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setRecipientAccountNumber(v);
                    if (status.kind === "error")
                      setStatus({ kind: "idle", message: "" });
                  }}
                  onBlur={() => handleBlur("recipientAccountNumber")}
                  aria-invalid={!!fieldErrors.recipientAccountNumber}
                  aria-describedby={
                    fieldErrors.recipientAccountNumber ? "recipientAccountNumber-error" : undefined
                  }
                  className={inputClass(!!fieldErrors.recipientAccountNumber)}
                />
                {fieldErrors.recipientAccountNumber && (
                  <p
                    id="recipientAccountNumber-error"
                    className="mt-2 text-xs text-red-600"
                  >
                    {fieldErrors.recipientAccountNumber}
                  </p>
                )}

                {lookupStatus.kind === "loading" && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 flex items-center gap-2 text-sm text-blue-800">
                    <span className="inline-block h-4 w-4 border-b-2 border-blue-600 rounded-full animate-spin" />
                    Verifying account…
                  </div>
                )}

                {lookupStatus.kind === "error" && (
                  <div
                    role="alert"
                    className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2 text-sm text-red-800"
                  >
                    <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <div className="font-medium">Recipient account could not be verified.</div>
                      <div className="text-red-700">
                        {lookupStatus.message || "Please check the 10-digit account number."}
                      </div>
                    </div>
                  </div>
                )}

                {lookupStatus.kind === "success" && lookupStatus.accountName && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-emerald-900">
                          Recipient Account Name
                        </div>
                        <div className="text-base font-bold text-emerald-900 break-words">
                          {lookupStatus.accountName}
                        </div>
                      </div>
                    </div>
                    <label className="flex items-start gap-2 text-sm text-emerald-900 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recipientNameConfirmed}
                        onChange={(e) => setRecipientNameConfirmed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
                      />
                      <span>
                        I confirm that{" "}
                        <span className="font-semibold">{lookupStatus.accountName}</span>{" "}
                        is the intended recipient for this transfer.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount (USD)
                  </label>
                  <span className="text-xs text-gray-500">
                    Available: <span className="font-medium text-gray-700">{formatCurrency(balance)}</span>
                  </span>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-500">
                    $
                  </span>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (status.kind === "error")
                        setStatus({ kind: "idle", message: "" });
                    }}
                    onBlur={() => handleBlur("amount")}
                    aria-invalid={!!fieldErrors.amount}
                    aria-describedby={fieldErrors.amount ? "amount-error" : undefined}
                    className={`pl-7 ${inputClass(!!fieldErrors.amount)}`}
                  />
                </div>
                {fieldErrors.amount && (
                  <p id="amount-error" className="mt-2 text-xs text-red-600">
                    {fieldErrors.amount}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                      Account PIN
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin((v) => !v)}
                      className="text-xs text-blue-700 hover:underline"
                    >
                      {showPin ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="pin"
                    name="pin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="6-digit PIN"
                    value={pin}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setPin(v);
                      if (status.kind === "error")
                        setStatus({ kind: "idle", message: "" });
                    }}
                    onBlur={() => handleBlur("pin")}
                    aria-invalid={!!fieldErrors.pin}
                    aria-describedby={fieldErrors.pin ? "pin-error" : undefined}
                    className={inputClass(!!fieldErrors.pin)}
                  />
                  {fieldErrors.pin && (
                    <p id="pin-error" className="mt-2 text-xs text-red-600">
                      {fieldErrors.pin}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="transferCode"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Transfer Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTransferCode((v) => !v)}
                      className="text-xs text-blue-700 hover:underline"
                    >
                      {showTransferCode ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="transferCode"
                    name="transferCode"
                    type={showTransferCode ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="6-digit transfer code"
                    value={transferCode}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setTransferCode(v);
                      if (status.kind === "error")
                        setStatus({ kind: "idle", message: "" });
                    }}
                    onBlur={() => handleBlur("transferCode")}
                    aria-invalid={!!fieldErrors.transferCode}
                    aria-describedby={
                      fieldErrors.transferCode ? "transferCode-error" : undefined
                    }
                    className={inputClass(!!fieldErrors.transferCode)}
                  />
                  {fieldErrors.transferCode && (
                    <p id="transferCode-error" className="mt-2 text-xs text-red-600">
                      {fieldErrors.transferCode}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="reference"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Reference / Note <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="reference"
                  name="reference"
                  type="text"
                  maxLength={200}
                  autoComplete="off"
                  placeholder="e.g. Rent, Invoice #123, Gift"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputClass(false)}
                />
              </div>

              {statusBanner}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="inline-block h-5 w-5 border-b-2 border-white rounded-full animate-spin" />
                    Processing Transfer…
                  </>
                ) : (
                  <>
                    <ArrowRightIcon className="w-5 h-5" />
                    Send Transfer
                  </>
                )}
              </button>
            </form>
          </div>

          <aside className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Your Account
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Account Number</dt>
                  <dd className="font-mono text-gray-900">
                    {profile?.accountNumber ? String(profile.accountNumber) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Available Balance</dt>
                  <dd className="font-semibold text-gray-900">{formatCurrency(balance)}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-sm text-blue-800">
              <div className="font-semibold mb-2 flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5" />
                Security
              </div>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Your 6-digit PIN and 6-digit Transfer Code are always required.</li>
                <li>Ensure the recipient account number is correct before submitting.</li>
                <li>Transfers are processed immediately and cannot be reversed.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
