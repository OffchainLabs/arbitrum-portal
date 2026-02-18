'use client';

import { ReactNode } from 'react';

export interface TransactionDetail {
  label: string;
  value: string | ReactNode;
}

interface EarnTransactionDetailsSectionProps {
  details: TransactionDetail[];
}

export function EarnTransactionDetailsSection({ details }: EarnTransactionDetailsSectionProps) {
  if (!details || details.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center">
        <span className="text-xs text-white">Transaction Details</span>
      </div>
      {details.map((detail, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-xs text-[#737373]">{detail.label}</span>
          <span className="text-xs text-white">{detail.value}</span>
        </div>
      ))}
    </div>
  );
}
