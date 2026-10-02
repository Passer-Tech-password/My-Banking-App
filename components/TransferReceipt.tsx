"use client";

import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { CheckCircleIcon as CheckCircleOutlineIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useRouter } from "next/navigation";

export interface TransferReceiptData {
  amountFormatted: string;
  recipientName: string;
  transferId: string;
  reference?: string;
  bankName?: string;
  dateISO: string;
  balanceFormatted: string;
}

interface TransferReceiptProps {
  receipt: TransferReceiptData;
  onNewTransaction: () => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hour = d.getHours();
    const minute = String(d.getMinutes()).padStart(2, "0");
    const ampm = hour >= 12 ? "pm" : "am";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${day} ${month} ${year}, ${hour}:${minute} ${ampm}`;
  } catch {
    return iso;
  }
}

export default function TransferReceipt({ receipt, onNewTransaction }: TransferReceiptProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const rows = [
    { label: t("completion.amountDebited"), value: receipt.amountFormatted },
    { label: t("completion.transactionReference"), value: receipt.reference || receipt.transferId },
    { label: t("completion.accountHolder"), value: receipt.recipientName },
    { label: t("completion.bankName"), value: receipt.bankName || t("completion.defaultBankName") },
    { label: t("completion.date"), value: formatDate(receipt.dateISO) },
    { label: t("completion.availableBalance"), value: receipt.balanceFormatted },
  ];

  return (
    <div className="min-h-[600px] w-full bg-slate-900 rounded-2xl shadow-2xl p-8 md:p-12 text-white flex flex-col">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="h-24 w-24 rounded-full bg-emerald-400 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
          <CheckCircleIcon className="h-16 w-16 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {t("completion.title")}
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-3">
          {t("completion.message", {
            amount: receipt.amountFormatted,
            recipient: receipt.recipientName,
          })}
        </p>
        <p className="text-base text-slate-400 font-medium mt-4">
          {t("completion.detailsSubtitle")}
        </p>
      </div>

      <div className="w-full border border-slate-700 rounded-lg overflow-hidden mb-10">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between px-6 py-4 ${
              idx !== rows.length - 1 ? "border-b border-slate-700" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircleOutlineIcon className="w-6 h-6 text-slate-500 flex-shrink-0" />
              <span className="text-slate-300 font-medium">{row.label}</span>
            </div>
            <span className="text-slate-200 font-semibold text-right break-all ml-4">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col sm:flex-row gap-4 justify-center">
        <button
          type="button"
          onClick={onNewTransaction}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md shadow-blue-900/30 min-w-[200px]"
        >
          {t("completion.newTransaction")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-md shadow-red-900/30 min-w-[200px]"
        >
          {t("completion.backToHome")}
        </button>
      </div>
    </div>
  );
}
