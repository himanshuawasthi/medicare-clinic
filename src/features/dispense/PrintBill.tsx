import { forwardRef } from 'react';
import { formatDate, formatDateTime } from '@/lib/date';
import { formatRupees } from '@/lib/money';

interface BillLine {
  medicine_name: string;
  qty: number;
  unit_price_paise: number;
}

interface PrintBillProps {
  patientName: string;
  rxDate: string;
  dispensedAt: string;
  lines: BillLine[];
  totalPaise: number;
  doctorName?: string;
  pharmacistName?: string;
}

export const PrintBill = forwardRef<HTMLDivElement, PrintBillProps>(
  function PrintBill(
    { patientName, rxDate, dispensedAt, lines, totalPaise, doctorName, pharmacistName },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className="mx-auto max-w-[148mm] p-4 font-mono text-xs print:p-2"
        style={{ width: '148mm', minHeight: '105mm' }}
      >
        {/* Header */}
        <div className="border-b-2 pb-2 text-center">
          <h1 className="text-base font-bold">MediCare Clinic</h1>
          <p className="text-muted-foreground">Receipt / Bill</p>
        </div>

        {/* Patient info */}
        <div className="mt-2 space-y-0.5">
          <div className="flex justify-between">
            <span>Patient:</span>
            <span className="font-semibold">{patientName}</span>
          </div>
          <div className="flex justify-between">
            <span>Rx Date:</span>
            <span>{formatDate(rxDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Dispensed:</span>
            <span>{formatDateTime(dispensedAt)}</span>
          </div>
          {doctorName && (
            <div className="flex justify-between">
              <span>Doctor:</span>
              <span>{doctorName}</span>
            </div>
          )}
        </div>

        {/* Medicines table */}
        <table className="mt-3 w-full border-t">
          <thead>
            <tr className="border-b">
              <th className="py-1 text-left">Medicine</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-dashed">
                <td className="py-0.5">{line.medicine_name}</td>
                <td className="py-0.5 text-right">{line.qty}</td>
                <td className="py-0.5 text-right">{formatRupees(line.unit_price_paise)}</td>
                <td className="py-0.5 text-right">
                  {formatRupees(line.qty * line.unit_price_paise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="mt-2 border-t-2 pt-2 text-right font-bold">
          Total: {formatRupees(totalPaise)}
        </div>

        {/* Footer */}
        <div className="mt-3 border-t pt-2 text-center text-muted-foreground">
          {pharmacistName && <p>Dispensed by: {pharmacistName}</p>}
          <p>Thank you for visiting MediCare Clinic</p>
        </div>
      </div>
    );
  },
);