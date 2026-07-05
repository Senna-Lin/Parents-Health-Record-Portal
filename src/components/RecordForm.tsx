import React, { useState, useEffect } from 'react';
import { Calendar, Heart, ArrowUpCircle, ArrowDownCircle, FileText, PlusCircle, UserCheck } from 'lucide-react';
import { evaluateBPStatus } from '../lib/bpHelper';

interface RecordFormProps {
  selectedParent: string;
  onAddRecord: (data: {
    parent: string;
    systolic: number;
    diastolic: number;
    heartRate: number;
    date: string;
    note: string;
    status: 'Normal' | 'Elevated' | 'Stage 1' | 'Stage 2' | 'Crisis' | 'Low';
  }) => Promise<void>;
  parentsList: string[];
}

export const RecordForm: React.FC<RecordFormProps> = ({
  selectedParent,
  onAddRecord,
  parentsList,
}) => {
  const [parent, setParent] = useState(selectedParent);
  const [isCustomParent, setIsCustomParent] = useState(false);
  const [customName, setCustomName] = useState('');
  
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [heartRate, setHeartRate] = useState<string>('75');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default current local date and time
  useEffect(() => {
    const now = new Date();
    // Format to local date time for input type="datetime-local"
    const tzOffset = now.getTimezoneOffset() * 60000; // in ms
    const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
    setDate(localISOTime);
  }, []);

  useEffect(() => {
    setParent(selectedParent);
    setIsCustomParent(!['父親', '母親'].includes(selectedParent) && selectedParent !== '');
  }, [selectedParent]);

  const sysNum = parseInt(systolic) || 0;
  const diaNum = parseInt(diastolic) || 0;
  const bpEvaluation = sysNum > 0 && diaNum > 0 ? evaluateBPStatus(sysNum, diaNum) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalParentName = isCustomParent ? customName.trim() : parent;
    if (!finalParentName) {
      setError('請選擇或輸入測量對象。');
      return;
    }

    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    const pulse = parseInt(heartRate);

    if (isNaN(sys) || sys < 40 || sys > 250) {
      setError('收縮壓數值不合理，請填寫 40 至 250 之間的數字。');
      return;
    }
    if (isNaN(dia) || dia < 30 || dia > 180) {
      setError('舒張壓數值不合理，請填寫 30 至 180 之間的數字。');
      return;
    }
    if (isNaN(pulse) || pulse < 30 || pulse > 200) {
      setError('心率數值不合理，請填寫 30 至 200 之間的數字。');
      return;
    }
    if (!date) {
      setError('請填寫測量時間。');
      return;
    }

    setIsSubmitting(true);
    try {
      const evaluation = evaluateBPStatus(sys, dia);
      
      // Convert standard local datetime input string (YYYY-MM-DDTHH:mm) into a beautiful readable date time
      const formattedDate = date.replace('T', ' ');

      await onAddRecord({
        parent: finalParentName,
        systolic: sys,
        diastolic: dia,
        heartRate: pulse,
        date: formattedDate,
        note: note.trim(),
        status: evaluation.status,
      });

      // Reset form fields
      setNote('');
      // Keep other numerical values as base, but update timestamp
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      setDate((new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16));
    } catch (err: any) {
      setError(err.message || '新增記錄失敗，請重試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs" id="record-form-card">
      <h3 className="text-md font-bold text-slate-800 font-display flex items-center mb-4">
        <PlusCircle className="w-5 h-5 text-rose-500 mr-2" />
        輸入新血壓記錄
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Parent Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
            <UserCheck className="w-3.5 h-3.5 mr-1 text-slate-400" /> 測量對象 (長輩)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['父親', '母親'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setParent(p);
                  setIsCustomParent(false);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  parent === p && !isCustomParent
                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsCustomParent(true);
                setParent('');
              }}
              className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                isCustomParent
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              自訂名稱
            </button>
          </div>

          {isCustomParent && (
            <input
              type="text"
              placeholder="請輸入長輩名稱 (例如: 阿公, 外婆)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden transition-all bg-slate-50"
              required
            />
          )}
        </div>

        {/* BP Values Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
              <ArrowUpCircle className="w-3.5 h-3.5 mr-1 text-rose-500" /> 收縮壓 (Systolic)
            </label>
            <div className="relative">
              <input
                type="number"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                placeholder="120"
                min="40"
                max="250"
                className="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-200 text-sm font-bold font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden transition-all text-slate-800"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">
                mmHg
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
              <ArrowDownCircle className="w-3.5 h-3.5 mr-1 text-blue-500" /> 舒張壓 (Diastolic)
            </label>
            <div className="relative">
              <input
                type="number"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                placeholder="80"
                min="30"
                max="180"
                className="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-200 text-sm font-bold font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden transition-all text-slate-800"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">
                mmHg
              </span>
            </div>
          </div>
        </div>

        {/* Pulse Heart Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
              <Heart className="w-3.5 h-3.5 mr-1 text-red-500 animate-pulse-heart" /> 心率 (Pulse)
            </label>
            <div className="relative">
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="75"
                min="30"
                max="200"
                className="w-full pl-3 pr-12 py-2.5 rounded-xl border border-slate-200 text-sm font-bold font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden transition-all text-slate-800"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">
                bpm
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> 測量時間
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden transition-all"
              required
            />
          </div>
        </div>

        {/* Realtime Analysis Badge */}
        {bpEvaluation && (
          <div className={`p-3.5 rounded-xl border transition-all ${bpEvaluation.bgColor} ${bpEvaluation.borderColor}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500">即時評估狀態:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bpEvaluation.textColor} ${bpEvaluation.iconBgColor}`}>
                {bpEvaluation.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">{bpEvaluation.desc}</p>
          </div>
        )}

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
            <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" /> 記錄備註 (選填)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如: 起床後測量、服藥前、活動後..."
            rows={2}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden transition-all resize-none text-slate-700 bg-slate-50"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          id="submit-record-btn"
          className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-xs font-semibold transition-all hover:shadow-md active:scale-[0.98] cursor-pointer shadow-sm shadow-rose-100 flex items-center justify-center space-x-1.5"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>正在寫入 Google Sheets...</span>
            </>
          ) : (
            <span>儲存血壓資料</span>
          )}
        </button>
      </form>
    </div>
  );
};
