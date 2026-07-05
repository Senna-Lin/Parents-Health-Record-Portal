import React from 'react';
import ReactMarkdown from 'react-markdown';
import { BloodPressureRecord } from '../types';
import { Sparkles, Brain, Loader2, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';

interface AIAnalysisCardProps {
  records: BloodPressureRecord[];
  selectedParent: string;
  onRunAnalysis: () => Promise<void>;
  aiAnalysis: string | null;
  isAnalyzing: boolean;
  parentAge?: number;
  parentGender?: 'M' | 'F' | 'Other';
}

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  records,
  selectedParent,
  onRunAnalysis,
  aiAnalysis,
  isAnalyzing,
  parentAge = 65,
  parentGender = 'F',
}) => {
  const parentRecords = records.filter((r) => r.parent === selectedParent);
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!aiAnalysis) return;
    try {
      await navigator.clipboard.writeText(aiAnalysis);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('複製失敗:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden" id="ai-analysis-card">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-bold text-slate-800 font-display flex items-center">
          <Sparkles className="w-5 h-5 text-rose-500 mr-2 animate-pulse-heart" />
          Gemini AI 家醫健康顧問
        </h3>
        <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 font-bold px-2 py-0.5 rounded-full">
          智慧分析
        </span>
      </div>

      {parentRecords.length === 0 ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
          請先輸入長輩血壓數據後，即可啟用 Gemini 進行趨勢診斷。
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-normal">
            根據 Google 試算表中 <strong>{selectedParent}</strong> 的 <strong>{parentRecords.length}</strong> 筆血壓測量值，AI 家醫將為您量身解讀血壓趨勢、波動規律、生活調適與異常警告建議。
          </p>

          {isAnalyzing ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-600">正在分析試算表數據，請稍候...</p>
              <p className="text-[10px] text-slate-400">正在呼叫 Google Gemini 2.5 進行健康診斷與分析</p>
            </div>
          ) : aiAnalysis ? (
            <div className="space-y-4">
              {/* Render AI report inside stylized Markdown reader */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed max-h-[420px] overflow-y-auto shadow-inner prose prose-slate max-w-none">
                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <span className="text-[10px] text-slate-400 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  提示：本分析僅供參考，血壓持續異常請遵從醫囑。
                </span>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopy}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 hover:shadow-xs active:scale-95 cursor-pointer"
                    id="copy-analysis-btn"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{isCopied ? '已複製！' : '複製分析報告'}</span>
                  </button>
                  <button
                    onClick={onRunAnalysis}
                    className="flex-1 sm:flex-initial px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1 hover:shadow-xs active:scale-95 cursor-pointer"
                    id="re-analyze-btn"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>重新分析數據</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <Brain className="w-10 h-10 text-slate-400 mb-2" />
              <button
                onClick={onRunAnalysis}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-rose-500 hover:from-purple-700 hover:to-rose-600 text-white rounded-xl text-xs font-semibold transition-all hover:shadow-md active:scale-95 cursor-pointer flex items-center space-x-1.5"
                id="run-ai-analysis-btn"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>分析 {selectedParent} 血壓報告</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-2">
                點擊後將會讀取 Google Sheets 歷史數據交由 Gemini 分析。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
