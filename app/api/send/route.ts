import { TransactionEmailTemplate } from "@/components/email-template";
import { Resend } from "resend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ApiErrorCode = "invalid_request" | "missing_env" | "send_failed" | "internal_error";

function jsonError(status: number, code: ApiErrorCode, message: string) {
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
    },
    { status },
  );
}

export async function POST(request: Request) {
  try {
    const apiKey = String(process.env.RESEND_API_KEY || "").trim();
    if (!apiKey) {
      return jsonError(400, "missing_env", "RESEND_API_KEY is not set.");
    }

    const body = (await request.json().catch(() => null)) as
      | null
      | {
          email?: unknown;
          userName?: unknown;
          type?: unknown;
          amount?: unknown;
          date?: unknown;
          status?: unknown;
          referenceId?: unknown;
        };

    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const userName = typeof body?.userName === "string" ? body.userName.trim() : "";
    const type = typeof body?.type === "string" ? body.type.trim() : "";
    const date = typeof body?.date === "string" ? body.date.trim() : "";
    const status = typeof body?.status === "string" ? body.status.trim() : "";
    const referenceId = typeof body?.referenceId === "string" ? body.referenceId.trim() : "";
    const amountRaw = body?.amount;
    const amount = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);

    if (!Number.isFinite(amount)) {
      return jsonError(400, "invalid_request", "Amount must be a valid number");
    }

    if (!email || !type) {
      return jsonError(400, "invalid_request", "Missing or invalid request fields.");
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "Aurora Bank <onboarding@resend.dev>",
      to: [email],
      subject: `Transaction Alert: ${type.toUpperCase()} of $${amount}`,
      react: TransactionEmailTemplate({
        userName,
        transactionType: type,
        amount,
        date,
        status,
        referenceId,
      }) as React.ReactElement,
    });

    if (error) {
      console.error("RESEND ERROR:", error);
      return jsonError(502, "send_failed", "Failed to send email.");
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonError(500, "internal_error", message);
  }
}
