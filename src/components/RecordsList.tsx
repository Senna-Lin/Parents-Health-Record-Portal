import React, { useState } from 'react';
import { BloodPressureRecord, AlertHistory } from '../types';
import { evaluateBPStatus, parseSpreadsheetDate } from '../lib/bpHelper';
import { FileSpreadsheet, Trash2, ShieldAlert, History, Activity, MessageSquare } from 'lucide-react';

interface RecordsListProps {
  records: BloodPressureRecord[];
  alerts: AlertHistory[];
  onDeleteRecord: (recordId: string) => Promise<void>;
  isDeleting: boolean;
  selectedParent: string;
}

export const RecordsList: React.FC<RecordsListProps> = ({
  records,
  alerts,
  onDeleteRecord,
  isDeleting,
  selectedParent,
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'alerts'>('records');

  // Filter by selected parent
  const filteredRecords = records.filter((r) => r.parent === selectedParent);
  const filteredAlerts = alerts.filter((alt) => alt.parent === selectedParent);

  // Sort: newest first
  const sortedRecords = [...filteredRecords].sort((a, b) => parseSpreadsheetDate(b.date).getTime() - parseSpreadsheetDate(a.date).getTime());
  const sortedAlerts = [...filteredAlerts].sort((a, b) => parseSpreadsheetDate(b.dateTime).getTime() - parseSpreadsheetDate(a.dateTime).getTime());

  const handleDelete = async (recordId: string, parent: string, bp: string) => {
    const confirmed = window.confirm(
      `確定要刪除「${parent}」於該時段的血壓量測紀錄 (${bp} mmHg) 嗎？\n此動作將會同步修改您的 Google Sheets 試算表，且無法復原。`
    );
    if (confirmed) {
      await onDeleteRecord(recordId);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="records-list-card">
      {/* Tabs */}
      <div className="border-b border-slate-100 bg-slate-50/50 flex items-center justify-between px-4 sm:px-6">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('records')}
            className={`py-4 text-xs font-bold border-b-2 transition-all relative cursor-pointer ${
              activeTab === 'records'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center">
              <Activity className="w-4 h-4 mr-1.5" />
              血壓量測記錄 ({filteredRecords.length})
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-4 text-xs font-bold border-b-2 transition-all relative cursor-pointer ${
              activeTab === 'alerts'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="flex items-center">
              <ShieldAlert className="w-4 h-4 mr-1.5" />
              異常警報歷史 ({filteredAlerts.length})
            </span>
          </button>
        </div>
        
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">
          試算表即時連動
        </span>
      </div>

      {/* List Body */}
      <div className="p-4 sm:p-6">
        {activeTab === 'records' ? (
          sortedRecords.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              目前無任何量測紀錄。請登入 Google 並新增第一筆資料。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="pb-3 font-semibold">量測對象</th>
                    <th className="pb-3 font-semibold">時間</th>
                    <th className="pb-3 font-semibold text-center">血壓 (Sys/Dia)</th>
                    <th className="pb-3 font-semibold text-center">心率</th>
                    <th className="pb-3 font-semibold text-center">健康評估</th>
                    <th className="pb-3 font-semibold hidden md:table-cell">備註</th>
                    <th className="pb-3 font-semibold text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedRecords.map((r) => {
                    const evalDetail = evaluateBPStatus(r.systolic, r.diastolic);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 font-bold text-slate-700">{r.parent}</td>
                        <td className="py-3.5 text-slate-500 font-mono text-[10px]">{r.date}</td>
                        <td className="py-3.5 text-center">
                          <span className="font-bold font-mono text-slate-800 text-sm">
                            {r.systolic}
                          </span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="font-semibold font-mono text-slate-600">
                            {r.diastolic}
                          </span>
                          <span className="text-[9px] text-slate-400 ml-1">mmHg</span>
                        </td>
                        <td className="py-3.5 text-center font-bold font-mono text-slate-600">{r.heartRate} <span className="text-[9px] text-slate-400 font-medium">bpm</span></td>
                        <td className="py-3.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] ${evalDetail.textColor} ${evalDetail.iconBgColor}`}>
                            {evalDetail.label.split(' ')[0]}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-500 hidden md:table-cell max-w-[140px] truncate" title={r.note}>
                          {r.note || '-'}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleDelete(r.id, r.parent, `${r.systolic}/${r.diastolic}`)}
                            disabled={isDeleting}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="刪除記錄"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          sortedAlerts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              目前無異常警報發送歷史。當血壓超出設定門檻時，會在此留下警報通知紀錄。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="pb-3 font-semibold">警報對象</th>
                    <th className="pb-3 font-semibold">發送時間</th>
                    <th className="pb-3 font-semibold text-center">觸發數值</th>
                    <th className="pb-3 font-semibold">子女信箱</th>
                    <th className="pb-3 font-semibold text-center">發送狀態</th>
                    <th className="pb-3 font-semibold hidden md:table-cell">警報詳情</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedAlerts.map((alt) => (
                    <tr key={alt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-bold text-slate-700">{alt.parent}</td>
                      <td className="py-3.5 text-slate-500 font-mono text-[10px]">{alt.dateTime}</td>
                      <td className="py-3.5 text-center">
                        <span className="font-bold font-mono text-rose-600">
                          {alt.systolic}/{alt.diastolic}
                        </span>
                        <span className="text-[9px] text-slate-400 ml-1">mmHg</span>
                      </td>
                      <td className="py-3.5 font-mono text-slate-600 text-[10px]">{alt.contactEmail}</td>
                      <td className="py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 font-bold text-[10px]">
                          {alt.alertStatus}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500 hidden md:table-cell text-[11px]" title={alt.alertNote}>
                        {alt.alertNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};
