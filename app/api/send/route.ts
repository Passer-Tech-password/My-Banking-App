import { TransactionEmailTemplate } from '@/components/email-template';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, userName, type, amount, date, status, referenceId } = await request.json();

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set. Email skipped.");
      return NextResponse.json({ message: "Email skipped (no API key)" });
    }

    const { data, error } = await resend.emails.send({
      from: 'Aurora Bank <onboarding@resend.dev>',
      to: [email],
      subject: `Transaction Alert: ${type.toUpperCase()} of $${amount}`,
      react: TransactionEmailTemplate({
        userName,
        transactionType: type,
        amount: Number(amount),
        date,
        status,
        referenceId,
      }) as React.ReactElement,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
