import * as React from 'react';

interface TransactionEmailProps {
  userName: string;
  transactionType: string;
  amount: number;
  date: string;
  status: string;
  referenceId: string;
}

export const TransactionEmailTemplate: React.FC<Readonly<TransactionEmailProps>> = ({
  userName,
  transactionType,
  amount,
  date,
  status,
  referenceId,
}) => (
  <div style={{ fontFamily: 'Arial, sans-serif', color: '#333' }}>
    <h1 style={{ color: '#2563EB' }}>Aurora Bank Alert</h1>
    <p>Hello <strong>{userName}</strong>,</p>
    <p>A new transaction has been recorded on your account.</p>
    
    <div style={{ 
      backgroundColor: '#F3F4F6', 
      padding: '20px', 
      borderRadius: '8px', 
      margin: '20px 0' 
    }}>
      <p style={{ margin: '10px 0' }}><strong>Type:</strong> {transactionType.toUpperCase()}</p>
      <p style={{ margin: '10px 0', fontSize: '18px' }}><strong>Amount:</strong> ${amount.toFixed(2)}</p>
      <p style={{ margin: '10px 0' }}><strong>Status:</strong> {status.toUpperCase()}</p>
      <p style={{ margin: '10px 0' }}><strong>Date:</strong> {new Date(date).toLocaleString()}</p>
      <p style={{ margin: '10px 0', fontSize: '12px', color: '#6B7280' }}>Ref: {referenceId}</p>
    </div>

    <p>If you did not authorize this transaction, please contact support immediately.</p>
    
    <hr style={{ border: 'none', borderTop: '1px solid #E5E7EB', margin: '30px 0' }} />
    
    <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>
      © {new Date().getFullYear()} Aurora Bank. All rights reserved.<br/>
      Secure Banking for Everyone.
    </p>
  </div>
);
