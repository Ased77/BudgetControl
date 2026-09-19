import React from 'react';
import { AuditLogItem } from '../types';
import { History, ShieldCheck, User, Clock, ArrowLeftRight } from 'lucide-react';

interface AuditTrailViewProps {
  auditLogs: AuditLogItem[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ auditLogs }) => {
  return (
    <div id="audit-trail-view-root" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
      <div id="audit-trail-view-div-2" className="border-b border-slate-100 pb-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          سوابق و لاگ تغییرات حسابرسی (Audit Trail)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          ثبت تمام دستکاری‌ها، موازنه‌سازی‌ها، تغییر درصدها و ویرایش بودجه توسط مدیران با مشخصات زمان و کاربر
        </p>
      </div>

      <div id="audit-trail-view-div-3" className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">زمان ثبت</th>
              <th className="py-3 px-4">کاربر ثبت‌کننده</th>
              <th className="py-3 px-4">نوع اقدام</th>
              <th className="py-3 px-4">اولویت / موضوع</th>
              <th className="py-3 px-4 text-center">مقدار قبلی → مقدار جدید</th>
              <th className="py-3 px-4">استدلال و علت تغییر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                  {log.timestamp}
                </td>
                <td className="py-3 px-4">
                  <div id={`audit-trail-view-div-4-${log.id}`} className="font-bold text-slate-900">{log.userName}</div>
                  <div id={`audit-trail-view-div-5-${log.id}`} className="text-[10px] text-blue-600 font-medium">{log.userRole}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="bg-blue-50 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full text-[10px] border border-blue-200">
                    {log.actionType}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-slate-800">
                  {log.targetPriorityTitle || '-'}
                </td>
                <td className="py-3 px-4 text-center dir-ltr font-mono text-[11px]">
                  <span className="text-slate-400">{log.oldValue || '—'}</span>
                  <span className="mx-1 text-blue-600 font-bold">→</span>
                  <span className="text-slate-900 font-extrabold">{log.newValue}</span>
                </td>
                <td className="py-3 px-4 text-slate-600 max-w-xs leading-relaxed">
                  {log.rationale || 'تغییر مستقیم توسط کاربر در پنل اصلی'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
