import React from "react";
import { formatHours, formatPeso, formatDate, formatTimeRange } from "@/lib/format";
import type { InvoiceLineItem } from "@/lib/services/invoice-service";

interface InvoiceLineItemsTableProps {
  lineItems?: InvoiceLineItem[];
  totalHours: number;
  totalAmount: number;
}

export function InvoiceLineItemsTable({
  lineItems,
  totalHours,
  totalAmount,
}: InvoiceLineItemsTableProps) {
  if (!lineItems || lineItems.length === 0) {
    return (
      <div className="rounded-xl border border-[#E5DFD5] bg-[#FAF7F2] p-4 text-center space-y-1">
        <p className="text-xs font-bold text-[#0F172A]">Line items not available</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Individual session details are not available for this invoice.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
        Itemized Work
      </span>
      <div className="overflow-x-auto rounded-xl border-[1.5px] border-[#0F172A] bg-white shadow-[2px_2px_0px_0px_#0F172A]">
        <table className="w-full text-left text-xs min-w-[480px] border-collapse">
          <thead className="border-b-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[10px] font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th scope="col" className="px-3 py-2.5">Date</th>
              <th scope="col" className="px-3 py-2.5">Task</th>
              <th scope="col" className="px-3 py-2.5">Session</th>
              <th scope="col" className="px-3 py-2.5 text-right">Hours</th>
              <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5DFD5]">
            {lineItems.map((item) => (
              <tr
                key={item.id}
                data-testid="invoice-detail-row"
                className="hover:bg-[#FAF7F2]/50 transition-colors"
              >
                <td className="px-3 py-2.5 font-medium whitespace-nowrap text-slate-700">
                  {formatDate(item.timeIn, "MMM d, yyyy")}
                </td>
                <td className="px-3 py-2.5 font-bold text-[#0F172A] max-w-[180px]">
                  <span className="block truncate" title={item.taskTitle}>
                    {item.taskTitle}
                  </span>
                  {item.sessionNote && (
                    <span
                      className="block text-[11px] font-normal text-slate-500 truncate mt-0.5"
                      title={item.sessionNote}
                    >
                      {item.sessionNote}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                  {formatTimeRange(item.timeIn, item.timeOut)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-medium whitespace-nowrap text-[#0F172A]">
                  {formatHours(item.totalHours)}
                </td>
                <td className="px-3 py-2.5 text-right font-bold whitespace-nowrap text-[#0F172A]">
                  {formatPeso(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-[1.5px] border-[#0F172A] bg-[#FAF7F2]">
            <tr data-testid="invoice-detail-total" className="font-bold text-[#0F172A]">
              <td colSpan={3} className="px-3 py-2.5">Total</td>
              <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                {formatHours(totalHours)}
              </td>
              <td className="px-3 py-2.5 text-right font-display text-sm font-black whitespace-nowrap">
                {formatPeso(totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

