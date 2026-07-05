import React from 'react';
import { ShieldAlert, Mail, Bell, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { evaluateBPStatus } from '../lib/bpHelper';

interface AlertConfirmationModalProps {
  isOpen: boolean;
  systolic: number;
  diastolic: number;
  heartRate: number;
  parent: string;
  contactEmail: string;
  onConfirm: (sendAlert: boolean) => void;
  onCancel: () => void;
}

export const AlertConfirmationModal: React.FC<AlertConfirmationModalProps> = ({
  isOpen,
  systolic,
  diastolic,
  heartRate,
  parent,
  contactEmail,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const bpEval = evaluateBPStatus(systolic, diastolic);
  const isLow = bpEval.status === 'Low';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" id="alert-confirm-modal">
      <div className="relative bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-hidden animate-scale-up">
        {/* Banner with alarm design */}
        <div className={`absolute top-0 left-0 w-full h-1.5 ${isLow ? 'bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500' : 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500'}`} />

        {/* Header Icon */}
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${isLow ? 'bg-sky-50 border-sky-100 text-sky-500' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
            <ShieldAlert className="w-6 h-6 animate-pulse-heart" />
          </div>
          <div>
            <h3 className="text-md font-bold text-slate-800 font-display">
              {isLow ? '⚠️ 檢測到長輩血壓偏低！' : '⚠️ 檢測到長輩血壓異常！'}
            </h3>
            <p className="text-xs text-slate-500">
              {isLow ? '正在評估是否向子女發送低血壓提醒' : '正在評估是否向子女發送異常提醒'}
            </p>
          </div>
        </div>

        {/* Content Box */}
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${isLow ? 'bg-sky-50/50 border-sky-100' : 'bg-rose-50/50 border-rose-100'}`}>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">【{parent}】測量數值:</span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${bpEval.textColor} ${bpEval.iconBgColor}`}>
                {bpEval.label}
              </span>
            </div>
            <div className="flex items-baseline space-x-1 mb-1">
              <span className="text-3xl font-extrabold font-mono text-slate-800 tracking-tight">
                {systolic}
              </span>
              <span className="text-lg font-bold text-slate-400">/</span>
              <span className="text-2xl font-bold font-mono text-slate-600">
                {diastolic}
              </span>
              <span className="text-xs text-slate-400 font-semibold ml-1">mmHg</span>
              <span className="text-xs text-slate-400 font-semibold ml-3">心率: {heartRate} bpm</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal mt-1">{bpEval.desc}</p>
          </div>

          {/* Email Notification Preview */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-slate-50">
            <h4 className="text-xs font-bold text-slate-700 flex items-center">
              <Mail className="w-4 h-4 text-slate-400 mr-1.5" />
              異常警報發送預覽
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">收件人子女:</span>
                <span className="font-semibold text-slate-700 font-mono">{contactEmail || '未設定 (預設模擬)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">警報標題:</span>
                <span className={`font-semibold ${isLow ? 'text-sky-600' : 'text-rose-600'}`}>
                  【{isLow ? '血壓偏低警報' : '血壓異常警報'}】請留意 {parent} 的健康狀況
                </span>
              </div>
              <div className="border-t border-slate-200 my-1.5 pt-1.5 text-[11px] leading-relaxed text-slate-500 bg-white p-2.5 rounded-lg border border-dashed">
                您好：系統於剛才測量到 {parent} 的血壓為 <strong>{systolic}/{diastolic} mmHg</strong>、心率 <strong>{heartRate} bpm</strong>，已超出設定的警戒標準，屬於 <strong>{bpEval.label}</strong> 狀態。請儘速撥打電話關心長輩或引導就醫。
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 leading-normal font-medium">
              提醒您：此操作將會新增一筆異常歷史至您的 Google Sheets。請點選下方選項，確認是否同時發送/記錄此警報。
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          <button
            onClick={() => onConfirm(true)}
            id="confirm-send-alert-btn"
            className={`flex-1 py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer ${
              isLow 
                ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-100' 
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>確認發送警報並存檔</span>
          </button>
          
          <button
            onClick={() => onConfirm(false)}
            id="save-only-btn"
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-200"
          >
            <Bell className="w-4 h-4 text-slate-500" />
            <span>僅存檔，不發送警報</span>
          </button>

          <button
            onClick={onCancel}
            id="cancel-record-btn"
            className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-slate-200"
          >
            <XCircle className="w-4 h-4" />
            <span>取消登錄</span>
          </button>
        </div>
      </div>
    </div>
  );
};
