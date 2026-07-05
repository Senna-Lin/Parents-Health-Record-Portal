import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { BloodPressureRecord } from '../types';
import { evaluateBPStatus, parseSpreadsheetDate } from '../lib/bpHelper';
import { TrendingUp, Activity, Heart, Award, ShieldAlert, ChevronRight, Calendar } from 'lucide-react';

interface BPDashboardProps {
  records: BloodPressureRecord[];
  selectedParent: string;
  onSelectParent: (parent: string) => void;
  parentsList: string[];
}

export const BPDashboard: React.FC<BPDashboardProps> = ({
  records,
  selectedParent,
  onSelectParent,
  parentsList,
}) => {
  const [timeFilter, setTimeFilter] = React.useState<'week' | 'all'>('week');

  // Filter records for the selected parent and sort chronologically for the chart
  const sortedParentRecords = React.useMemo(() => {
    return records
      .filter((r) => r.parent === selectedParent)
      .sort((a, b) => parseSpreadsheetDate(a.date).getTime() - parseSpreadsheetDate(b.date).getTime());
  }, [records, selectedParent]);

  // Filter for last 7 calendar days relative to the latest record's date (or all if selected)
  const parentRecords = React.useMemo(() => {
    if (sortedParentRecords.length === 0) return [];
    if (timeFilter === 'all') return sortedParentRecords;
    
    // Filter for last 7 calendar days relative to the latest record's date
    const latestDate = parseSpreadsheetDate(sortedParentRecords[sortedParentRecords.length - 1].date);
    const cutoffTime = latestDate.getTime() - 7 * 24 * 60 * 60 * 1000;
    
    return sortedParentRecords.filter(r => parseSpreadsheetDate(r.date).getTime() >= cutoffTime);
  }, [sortedParentRecords, timeFilter]);

  // Get latest record
  const latestRecord = sortedParentRecords[sortedParentRecords.length - 1]; // Latest is always latest overall
  const bpEvaluation = latestRecord ? evaluateBPStatus(latestRecord.systolic, latestRecord.diastolic) : null;

  // Prepare chart data (dynamic formatting based on timestamps)
  const chartData = parentRecords.map((r) => {
    let displayDate = r.date;
    try {
      const parsed = parseSpreadsheetDate(r.date);
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      const hh = String(parsed.getHours()).padStart(2, '0');
      const min = String(parsed.getMinutes()).padStart(2, '0');
      displayDate = `${mm}/${dd} ${hh}:${min}`;
    } catch (e) {
      // Fallback
    }
    return {
      date: displayDate,
      '收縮壓 (Sys)': r.systolic,
      '舒張壓 (Dia)': r.diastolic,
      '心率 (bpm)': r.heartRate,
    };
  });

  // Average calculations
  const totalReadings = parentRecords.length;
  const avgSystolic = totalReadings > 0 ? Math.round(parentRecords.reduce((sum, r) => sum + r.systolic, 0) / totalReadings) : 0;
  const avgDiastolic = totalReadings > 0 ? Math.round(parentRecords.reduce((sum, r) => sum + r.diastolic, 0) / totalReadings) : 0;
  const avgHeartRate = totalReadings > 0 ? Math.round(parentRecords.reduce((sum, r) => sum + r.heartRate, 0) / totalReadings) : 0;

  return (
    <div className="space-y-6">
      {/* Parent Selector & Time Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        {/* Left: Parent Select Tabs */}
        <div className="flex space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {parentsList.map((p) => (
            <button
              key={p}
              onClick={() => onSelectParent(p)}
              className={`py-2 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedParent === p
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-100 font-bold scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Right: Time Range Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setTimeFilter('week')}
            className={`py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
              timeFilter === 'week'
                ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3 h-3 text-rose-500" />
            <span>最近一週 (7天)</span>
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
              timeFilter === 'all'
                ? 'bg-white text-slate-800 shadow-2xs font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3 h-3 text-slate-400" />
            <span>所有歷史</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Widgets */}
      {latestRecord ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Systolic & Diastolic Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 flex items-center">
                <TrendingUp className="w-4 h-4 text-rose-500 mr-1" />
                最新血壓數值
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{latestRecord.date}</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-extrabold font-mono text-slate-800 tracking-tight">
                {latestRecord.systolic}
              </span>
              <span className="text-lg font-bold text-slate-400">/</span>
              <span className="text-3xl font-bold font-mono text-slate-600">
                {latestRecord.diastolic}
              </span>
              <span className="text-xs text-slate-400 font-medium">mmHg</span>
            </div>

            {/* Assessment Warning Tag */}
            {bpEvaluation && (
              <div className={`mt-4 px-3 py-2 rounded-xl border flex items-start space-x-2 ${bpEvaluation.bgColor} ${bpEvaluation.borderColor} transition-all`}>
                <div className={`mt-0.5 w-2 h-2 rounded-full ${bpEvaluation.textColor === 'text-emerald-800' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500 animate-bounce'}`} />
                <div>
                  <h4 className={`text-xs font-bold ${bpEvaluation.textColor}`}>{bpEvaluation.label}</h4>
                  <p className="text-[10px] text-slate-600 mt-0.5 leading-normal">{bpEvaluation.desc}</p>
                </div>
              </div>
            )}
          </div>

          {/* Heart Rate Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-400" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 flex items-center">
                <Heart className="w-4 h-4 text-red-500 mr-1 animate-pulse-heart" />
                最新量測心率
              </span>
              <span className="text-[10px] text-slate-400 font-mono">脈搏</span>
            </div>
            <div className="flex items-baseline space-x-1 mb-2">
              <span className="text-4xl font-extrabold font-mono text-slate-800 tracking-tight">
                {latestRecord.heartRate}
              </span>
              <span className="text-xs text-slate-400 font-medium">bpm</span>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">心跳健康標準:</span>
              <span className="text-[11px] font-semibold text-slate-700 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-100">
                60 - 100 bpm (靜止)
              </span>
            </div>
          </div>

          {/* Historical Averages Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 flex items-center">
                <Award className="w-4 h-4 text-amber-500 mr-1" />
                歷史加權平均值
              </span>
              <span className="text-[10px] text-slate-400">共 {totalReadings} 筆</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">平均血壓:</span>
                <span className="text-xs font-bold font-mono text-slate-800">
                  {avgSystolic} / {avgDiastolic} <span className="text-[10px] text-slate-400 font-medium">mmHg</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">平均心率:</span>
                <span className="text-xs font-bold font-mono text-slate-800">
                  {avgHeartRate} <span className="text-[10px] text-slate-400 font-medium">bpm</span>
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-xs text-slate-500">波動風險指數:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  (avgSystolic >= 140 || avgDiastolic >= 90) 
                    ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  {(avgSystolic >= 140 || avgDiastolic >= 90) ? '中高風險' : '穩定正常'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">尚未登錄 {selectedParent} 的血壓數據</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            您可以在左側的血壓記錄表單中輸入第一筆數據，系統將會即時同步至 Google Sheets 試算表並繪製趨勢圖。
          </p>
        </div>
      )}

      {/* BP Trend Line Chart Card */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs" id="trend-chart-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-display">血壓趨勢監測圖表</h3>
              <p className="text-xs text-slate-500">連續變化的收縮壓與舒張壓曲線對比（最多顯示最新 15 筆）</p>
            </div>
            <div className="flex items-center space-x-3 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full mr-1.5" />
                收縮壓
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-sky-500 rounded-full mr-1.5" />
                舒張壓
              </span>
            </div>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                />
                <YAxis
                  domain={['dataMin - 15', 'dataMax + 15']}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  }}
                  labelClassName="text-xs font-bold text-slate-700"
                />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={6} style={{ fontSize: '11px' }} />
                {/* Standard Threshold Lines */}
                <ReferenceLine y={140} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '高血壓 140', fill: '#f43f5e', fontSize: 9, position: 'insideTopLeft' }} />
                <ReferenceLine y={90} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: '舒張壓 90', fill: '#3b82f6', fontSize: 9, position: 'insideTopLeft' }} />
                <ReferenceLine y={60} stroke="#0284c7" strokeDasharray="4 4" label={{ value: '舒張壓低限 60', fill: '#0284c7', fontSize: 9, position: 'insideBottomLeft' }} />
                
                <Line
                  type="monotone"
                  dataKey="收縮壓 (Sys)"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  dot={{ r: 3, strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="舒張壓 (Dia)"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  dot={{ r: 3, strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
