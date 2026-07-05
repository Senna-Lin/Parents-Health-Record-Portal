/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { RecordForm } from './components/RecordForm';
import { BPDashboard } from './components/BPDashboard';
import { AIAnalysisCard } from './components/AIAnalysisCard';
import { ConfigCard } from './components/ConfigCard';
import { RecordsList } from './components/RecordsList';
import { AlertConfirmationModal } from './components/AlertConfirmationModal';
import { BloodPressureRecord, AlertHistory, NotificationConfig } from './types';
import { initAuth, googleSignIn, logout } from './lib/firebaseAuth';
import { sheetsService } from './lib/sheetsService';
import { parseSpreadsheetDate } from './lib/bpHelper';
import { Heart, Activity, ShieldAlert, Sparkles, Database, ArrowRight, RefreshCw, Loader2, Info, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Mock/Sandbox initial values for the offline sandbox mode
const SANDBOX_INITIAL_RECORDS: BloodPressureRecord[] = [
  { id: 'BP_1', parent: '父親', date: '2026-07-01 08:30', systolic: 125, diastolic: 82, heartRate: 72, status: 'Stage 1', note: '起床後，服藥前量測' },
  { id: 'BP_2', parent: '父親', date: '2026-07-01 20:15', systolic: 132, diastolic: 85, heartRate: 78, status: 'Stage 1', note: '晚餐後半小時' },
  { id: 'BP_3', parent: '父親', date: '2026-07-02 08:00', systolic: 145, diastolic: 92, heartRate: 75, status: 'Stage 2', note: '頭部稍微感覺有些脹，起床量測' },
  { id: 'BP_4', parent: '母親', date: '2026-07-01 09:00', systolic: 118, diastolic: 76, heartRate: 68, status: 'Normal', note: '早餐前量測' },
  { id: 'BP_5', parent: '母親', date: '2026-07-02 09:30', systolic: 115, diastolic: 74, heartRate: 70, status: 'Normal', note: '散步回家後半小時' },
];

const SANDBOX_INITIAL_ALERTS: AlertHistory[] = [
  {
    id: 'ALT_1',
    parent: '父親',
    dateTime: '2026-07-02 08:01',
    systolic: 145,
    diastolic: 92,
    heartRate: 75,
    contactEmail: 'son_daughter@example.com',
    alertStatus: '已發送 (模擬)',
    alertNote: '量測數值：145/92 mmHg，心率：75 bpm。系統已觸發異常通知。',
  },
];

export default function App() {
  // Authentication & Session States
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSandboxMode, setIsSandboxMode] = useState(false);

  // Google Sheets Integration States
  const [parentSheets, setParentSheets] = useState<Record<string, { spreadsheetId: string; sheetsInfo: { title: string; sheetId: number }[]; recordsSheetName: string }>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // Core App Data States
  const [records, setRecords] = useState<BloodPressureRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertHistory[]>([]);
  const [selectedParent, setSelectedParent] = useState<string>('父親');
  const [parentsList, setParentsList] = useState<string[]>(['父親', '母親']);

  // Settings Configurations
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    contactEmail: 'son_daughter@example.com',
    alertThresholdSystolic: 140,
    alertThresholdDiastolic: 90,
    alertThresholdSystolicMin: 90,
    alertThresholdDiastolicMin: 60,
    enableEmailAlert: true,
  });

  // AI & Recommendation States
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Interactive Alert Confirmation Modal State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<{
    parent: string;
    systolic: number;
    diastolic: number;
    heartRate: number;
    date: string;
    note: string;
    status: 'Normal' | 'Elevated' | 'Stage 1' | 'Stage 2' | 'Crisis' | 'Low';
  } | null>(null);

  // Actions Progress Status
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 1. Initial Authentication & Sync Check on load
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, accessToken) => {
        setUser(firebaseUser);
        setToken(accessToken);
        setNeedsAuth(false);
        setIsSandboxMode(false);
        setSyncError(null);
        await handleSyncGoogleSheets(accessToken);
      },
      () => {
        // Unauthenticated
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Derive unique parents list from records
  useEffect(() => {
    const list = Array.from(new Set(records.map((r) => r.parent)));
    // Always keep father and mother as options
    const defaultList = ['父親', '母親'];
    const combined = Array.from(new Set([...defaultList, ...list]));
    setParentsList(combined);
    if (combined.length > 0 && !combined.includes(selectedParent)) {
      setSelectedParent(combined[0]);
    }
  }, [records, selectedParent]);

  // 3. Authenticate with Google
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setSyncError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        setIsSandboxMode(false);
        await handleSyncGoogleSheets(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign in failed:', err);
      setSyncError(`登入失敗: ${err.message || err}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 4. Trigger Sandbox / Try Offline Mode
  const handleStartSandbox = () => {
    setIsSandboxMode(true);
    setNeedsAuth(false);
    setRecords(SANDBOX_INITIAL_RECORDS);
    setAlerts(SANDBOX_INITIAL_ALERTS);
    setParentSheets({});
    setAiAnalysis(null);
    setSyncError(null);
  };

  // 5. Logout User
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setIsSandboxMode(false);
    setRecords([]);
    setAlerts([]);
    setParentSheets({});
    setAiAnalysis(null);
  };

  // 6. Connect & Synchronize with Google Sheets
  const handleSyncGoogleSheets = async (accessTokenString: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      // Find or create spreadsheet for 父親 (Father)
      const fatherResult = await sheetsService.findOrCreateSpreadsheet(accessTokenString, 'Grandfather’s health record (回覆)');
      // Find or create spreadsheet for 母親 (Mother)
      const motherResult = await sheetsService.findOrCreateSpreadsheet(accessTokenString, 'Grandmother’s health record (回覆)');

      const configMap = {
        '父親': fatherResult,
        '母親': motherResult,
      };
      setParentSheets(configMap);

      // Fetch existing sheets tables
      const [fatherRecords, fatherAlerts] = await Promise.all([
        sheetsService.fetchBPRecords(accessTokenString, fatherResult.spreadsheetId, fatherResult.recordsSheetName, '父親'),
        sheetsService.fetchAlertHistory(accessTokenString, fatherResult.spreadsheetId),
      ]);

      const [motherRecords, motherAlerts] = await Promise.all([
        sheetsService.fetchBPRecords(accessTokenString, motherResult.spreadsheetId, motherResult.recordsSheetName, '母親'),
        sheetsService.fetchAlertHistory(accessTokenString, motherResult.spreadsheetId),
      ]);

      // Ensure proper parent mapping
      const cleanedFatherRecords = fatherRecords.map(r => ({ ...r, parent: '父親' }));
      const cleanedFatherAlerts = fatherAlerts.map(a => ({ ...a, parent: '父親' }));

      const cleanedMotherRecords = motherRecords.map(r => ({ ...r, parent: '母親' }));
      const cleanedMotherAlerts = motherAlerts.map(a => ({ ...a, parent: '母親' }));

      const sortedRecords = [...cleanedFatherRecords, ...cleanedMotherRecords].sort(
        (a, b) => parseSpreadsheetDate(a.date).getTime() - parseSpreadsheetDate(b.date).getTime()
      );
      const sortedAlerts = [...cleanedFatherAlerts, ...cleanedMotherAlerts].sort(
        (a, b) => parseSpreadsheetDate(b.dateTime).getTime() - parseSpreadsheetDate(a.dateTime).getTime()
      );

      setRecords(sortedRecords);
      setAlerts(sortedAlerts);
    } catch (err: any) {
      console.error('Sync Google Sheets error:', err);
      setSyncError(`試算表同步失敗。請確保網路連線，或重新登入授予雲端硬碟權限。`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Force manual sync update
  const handleManualSync = async () => {
    if (token) {
      await handleSyncGoogleSheets(token);
    }
  };

  // 7. Add Blood Pressure record handler
  const handleAddBPRecord = async (newRecord: {
    parent: string;
    systolic: number;
    diastolic: number;
    heartRate: number;
    date: string;
    note: string;
    status: 'Normal' | 'Elevated' | 'Stage 1' | 'Stage 2' | 'Crisis' | 'Low';
  }) => {
    // Check if blood pressure violates safety threshold rules
    const isCrisisOrStage2OrLow = newRecord.status === 'Crisis' || newRecord.status === 'Stage 2' || newRecord.status === 'Low';
    const violatesCustomSys = newRecord.systolic >= notificationConfig.alertThresholdSystolic;
    const violatesCustomDia = newRecord.diastolic >= notificationConfig.alertThresholdDiastolic;
    const violatesCustomSysMin = newRecord.systolic <= notificationConfig.alertThresholdSystolicMin;
    const violatesCustomDiaMin = newRecord.diastolic <= notificationConfig.alertThresholdDiastolicMin;

    if (notificationConfig.enableEmailAlert && (isCrisisOrStage2OrLow || violatesCustomSys || violatesCustomDia || violatesCustomSysMin || violatesCustomDiaMin)) {
      // Intercept and show confirmation modal before permanent save/notifications
      setPendingRecord(newRecord);
      setIsAlertModalOpen(true);
    } else {
      // Normal reading, add to table directly
      await saveRecordToDatabase(newRecord, false);
    }
  };

  // 8. Commit the saved record (triggered after alert confirmation)
  const saveRecordToDatabase = async (
    recordToSave: typeof pendingRecord,
    shouldSendAndLogAlert: boolean
  ) => {
    if (!recordToSave) return;
    setIsActionLoading(true);

    try {
      if (isSandboxMode) {
        // 8a. Local Sandbox persistence
        const recordId = `BP_${Date.now()}`;
        const committedRecord: BloodPressureRecord = {
          id: recordId,
          parent: recordToSave.parent,
          date: recordToSave.date,
          systolic: recordToSave.systolic,
          diastolic: recordToSave.diastolic,
          heartRate: recordToSave.heartRate,
          status: recordToSave.status,
          note: recordToSave.note,
        };

        setRecords((prev) => [...prev, committedRecord]);

        if (shouldSendAndLogAlert) {
          const alertId = `ALT_${Date.now()}`;
          const committedAlert: AlertHistory = {
            id: alertId,
            parent: recordToSave.parent,
            dateTime: recordToSave.date,
            systolic: recordToSave.systolic,
            diastolic: recordToSave.diastolic,
            heartRate: recordToSave.heartRate,
            contactEmail: notificationConfig.contactEmail,
            alertStatus: '已發送 (模擬)',
            alertNote: `量測數值：${recordToSave.systolic}/${recordToSave.diastolic} mmHg，心率：${recordToSave.heartRate} bpm。系統已觸發異常通知。`,
          };
          setAlerts((prev) => [...prev, committedAlert]);
        }
      } else if (token) {
        // 8b. Real Google Sheets cloud persistence
        const parentKey = recordToSave.parent === '母親' ? '母親' : '父親';
        const sheetConfig = parentSheets[parentKey];
        if (!sheetConfig) {
          throw new Error(`找不到【${parentKey}】對應的試算表設定`);
        }

        const addedRecord = await sheetsService.addBPRecord(token, sheetConfig.spreadsheetId, {
          parent: recordToSave.parent,
          date: recordToSave.date,
          systolic: recordToSave.systolic,
          diastolic: recordToSave.diastolic,
          heartRate: recordToSave.heartRate,
          status: recordToSave.status,
          note: recordToSave.note,
        }, sheetConfig.recordsSheetName);

        // Sync with local state safely
        setRecords((prev) => [...prev, addedRecord]);

        if (shouldSendAndLogAlert) {
          const addedAlert = await sheetsService.addAlertHistory(token, sheetConfig.spreadsheetId, {
            parent: recordToSave.parent,
            dateTime: recordToSave.date,
            systolic: recordToSave.systolic,
            diastolic: recordToSave.diastolic,
            heartRate: recordToSave.heartRate,
            contactEmail: notificationConfig.contactEmail,
            alertStatus: '已發送 (雲端存檔)',
            alertNote: `健康警報：${recordToSave.parent} 血壓達 ${recordToSave.systolic}/${recordToSave.diastolic} mmHg (屬 ${recordToSave.status})。子女聯絡信箱: ${notificationConfig.contactEmail} 已登錄異常提醒。`,
          });
          setAlerts((prev) => [...prev, addedAlert]);
        }
      }
    } catch (err: any) {
      console.error('Error saving blood pressure record:', err);
      alert(`存檔失敗：${err.message || err}`);
    } finally {
      setIsActionLoading(false);
      setIsAlertModalOpen(false);
      setPendingRecord(null);
    }
  };

  // 9. Handle delete record action
  const handleDeleteBPRecord = async (recordId: string) => {
    setIsActionLoading(true);
    try {
      if (isSandboxMode) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      } else if (token) {
        const recordToDelete = records.find(r => r.id === recordId);
        if (!recordToDelete) {
          throw new Error('找不到該筆量測記錄');
        }
        const parentKey = recordToDelete.parent === '母親' ? '母親' : '父親';
        const sheetConfig = parentSheets[parentKey];
        if (!sheetConfig) {
          throw new Error(`找不到【${parentKey}】對應的試算表設定`);
        }

        const bpSheetInfo = sheetConfig.sheetsInfo.find((s) => s.title === sheetConfig.recordsSheetName);
        if (!bpSheetInfo) {
          throw new Error(`找不到血壓記錄工作表【${sheetConfig.recordsSheetName}】的 ID`);
        }
        await sheetsService.deleteBPRecord(token, sheetConfig.spreadsheetId, bpSheetInfo.sheetId, recordId, sheetConfig.recordsSheetName);
        // Reload from server
        await handleSyncGoogleSheets(token);
      }
    } catch (err: any) {
      console.error('Delete blood pressure record failed:', err);
      alert(`刪除失敗：${err.message || err}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 10. Call backend server to execute Gemini AI health report analysis
  const handleRunAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);

    // Filter, sort chronologically, and take the last 100 records to optimize request size and AI analysis focus
    const parentRecords = [...records]
      .filter((r) => r.parent === selectedParent)
      .sort((a, b) => parseSpreadsheetDate(a.date).getTime() - parseSpreadsheetDate(b.date).getTime())
      .slice(-100);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: parentRecords,
          parentInfo: {
            name: selectedParent,
            gender: selectedParent === '父親' ? 'M' : 'F',
            age: selectedParent === '父親' ? 70 : 68,
          },
        }),
      });

      const contentType = response.headers.get('content-type');
      let data: any = {};
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`伺服器傳回非 JSON 格式回應 (狀態碼 ${response.status})。可能是伺服器未啟動或 API 金鑰配置錯誤。回應前 200 字元：${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'AI 伺服器分析失敗。');
      }

      setAiAnalysis(data.analysis);
    } catch (err: any) {
      console.error('AI analysis API error:', err);
      setAiAnalysis(`### ❌ AI 分析發生錯誤\n\n${err.message || err}\n\n請確保您的伺服器上已設定 \`GEMINI_API_KEY\` 環境變數，並且血壓記錄表中已有充足的歷史量測數據。`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 11. Configuration saving handler
  const handleSaveConfig = (updated: NotificationConfig) => {
    setNotificationConfig(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header element */}
      <Header
        user={user}
        needsAuth={needsAuth}
        isLoggingIn={isLoggingIn}
        onLogin={handleGoogleLogin}
        onLogout={handleLogout}
        fatherSpreadsheetId={parentSheets['父親']?.spreadsheetId || null}
        motherSpreadsheetId={parentSheets['母親']?.spreadsheetId || null}
        isSyncing={isSyncing}
      />

      {/* Main layout container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {needsAuth && !isSandboxMode ? (
            /* Intro / Login illustrative Welcome Page */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 text-center space-y-6"
              id="welcome-card"
            >
              {/* Pulsing Visual Heart */}
              <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-100 animate-pulse-heart">
                <Heart className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold font-display text-slate-800 tracking-tight">
                  父母血壓健康守護者
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  這是一款專為子女設計的長輩血壓關懷 App。您可以安全、自主地記錄父母血壓，檢測高血壓異常，並自動觸發警報通知。
                </p>
              </div>

              {/* Feature Highlights list */}
              <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-100 space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Google Sheets 數據同步</h4>
                    <p className="text-[11px] text-slate-500">
                      所有量測資料、異常警報歷史，均安全記錄在您自己的 Google 試算表中，數據自主、防遺失。
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">多級別血壓異常警報</h4>
                    <p className="text-[11px] text-slate-500">
                      自動化辨識 WHO 高血壓分級，當出現異常高壓或低壓，子女會立刻接獲通知進行電話關懷或安排就醫。
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Gemini AI 家醫趨勢分析</h4>
                    <p className="text-[11px] text-slate-500">
                      結合 AI 智慧解讀長輩血壓、脈壓差與心率波動曲線，生成客觀的生活、飲食與就醫調養報告。
                    </p>
                  </div>
                </div>
              </div>

              {syncError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold">
                  {syncError}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col space-y-3 pt-2">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold transition-all hover:shadow-lg shadow-sm active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在建立 Google 安全連線...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4.5 h-4.5" />
                      <span>使用 Google 帳號登入</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleStartSandbox}
                  className="w-full py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1 hover:shadow-xs active:scale-95 cursor-pointer"
                >
                  <span>以「訪客沙盒模式」直接免登入試用</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-[10px] text-slate-400">
                本系統完全遵守醫療隱私權與最少權限原則，僅用於試算表資料記錄與子女通知。
              </div>
            </motion.div>
          ) : (
            /* Active Blood Pressure tracking dashboard */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Alert Error message banner */}
              {syncError && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs font-semibold flex items-center justify-between">
                  <span>{syncError}</span>
                  <button
                    onClick={handleManualSync}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-[10px] font-bold flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>重試同步</span>
                  </button>
                </div>
              )}

              {/* Guest sandbox notification warning */}
              {isSandboxMode && (
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Info className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>您正處於「訪客沙盒模式」。所有修改僅保留在本地記憶體中，不會寫入 Google Sheets 雲端。</span>
                  </div>
                  <button
                    onClick={handleGoogleLogin}
                    className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    立即連結試算表
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Log Entry Form & Settings Configurations */}
                <div className="lg:col-span-4 space-y-6">
                  {isSandboxMode ? (
                    <RecordForm
                      selectedParent={selectedParent}
                      onAddRecord={handleAddBPRecord}
                      parentsList={parentsList}
                    />
                  ) : (
                    /* Caregiver Google Form Connection Card */
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
                      id="google-form-link-card"
                    >
                      <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">看護 Google 表單連結</h3>
                          <p className="text-[10px] text-slate-400 font-medium">數據自動讀取與異常監測</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        本系統專為子女打造，<strong>數據完全由看護端填寫 Google 表單輸入</strong>，不在此網頁上重複輸入。系統已成功與您的雲端硬碟試算表連線：
                      </p>

                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {/* Father spreadsheet status */}
                        <div className="flex items-start justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-700 flex items-center">
                              <span className="mr-1">👨</span> 父親試算表 (阿公)
                            </span>
                            <span className="text-[10px] text-slate-400 block max-w-[150px] truncate">
                              Grandfather’s health record (回覆)
                            </span>
                            <span className="inline-flex items-center text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded mt-1 border border-emerald-100">
                              工作表: {parentSheets['父親']?.recordsSheetName || '載入中...'}
                            </span>
                          </div>
                          {parentSheets['父親']?.spreadsheetId ? (
                            <a
                              href={`https://docs.google.com/spreadsheets/d/${parentSheets['父親'].spreadsheetId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-[10px] font-bold rounded-lg text-slate-600 flex items-center space-x-1"
                            >
                              <span>開啟</span>
                              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">未連結</span>
                          )}
                        </div>

                        <div className="border-t border-slate-200/50 my-2" />

                        {/* Mother spreadsheet status */}
                        <div className="flex items-start justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-700 flex items-center">
                              <span className="mr-1">👩</span> 母親試算表 (阿嬤)
                            </span>
                            <span className="text-[10px] text-slate-400 block max-w-[150px] truncate">
                              Grandmother’s health record (回覆)
                            </span>
                            <span className="inline-flex items-center text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded mt-1 border border-emerald-100">
                              工作表: {parentSheets['母親']?.recordsSheetName || '載入中...'}
                            </span>
                          </div>
                          {parentSheets['母親']?.spreadsheetId ? (
                            <a
                              href={`https://docs.google.com/spreadsheets/d/${parentSheets['母親'].spreadsheetId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-[10px] font-bold rounded-lg text-slate-600 flex items-center space-x-1"
                            >
                              <span>開啟</span>
                              <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">未連結</span>
                          )}
                        </div>
                      </div>

                      {/* Sync triggers */}
                      <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl text-xs font-bold border border-rose-200/50 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                            <span>正在從試算表讀取新數據...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-rose-500 mr-1 animate-spin" style={{ animationDuration: isSyncing ? '1s' : '0s' }} />
                            <span>檢查並重新同步 Google 表單</span>
                          </>
                        )}
                      </button>

                      <div className="text-[10px] text-slate-400 leading-normal flex items-start space-x-1">
                        <span className="text-emerald-500 font-bold">●</span>
                        <span>
                          看護每在手機填寫一次 Google 表單，該資料就會自動進入上述對應試算表中，本 App 亦會自動同步最新數據與發送異常警示！
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <ConfigCard config={notificationConfig} onSaveConfig={handleSaveConfig} />
                </div>

                {/* Right Column: Latest Dashboard metrics & Recharts plots */}
                <div className="lg:col-span-8 space-y-6">
                  <BPDashboard
                    records={records}
                    selectedParent={selectedParent}
                    onSelectParent={setSelectedParent}
                    parentsList={parentsList}
                  />

                  <AIAnalysisCard
                    records={records}
                    selectedParent={selectedParent}
                    onRunAnalysis={handleRunAIAnalysis}
                    aiAnalysis={aiAnalysis}
                    isAnalyzing={isAnalyzing}
                    parentAge={selectedParent === '父親' ? 70 : 68}
                    parentGender={selectedParent === '父親' ? 'M' : 'F'}
                  />
                </div>
              </div>

              {/* Historical Tables list with Tabulation of records vs alerts */}
              <RecordsList
                records={records}
                alerts={alerts}
                onDeleteRecord={handleDeleteBPRecord}
                isDeleting={isActionLoading}
                selectedParent={selectedParent}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Explicit User Confirmation Alert Modal for Sending Warnings */}
      {pendingRecord && (
        <AlertConfirmationModal
          isOpen={isAlertModalOpen}
          systolic={pendingRecord.systolic}
          diastolic={pendingRecord.diastolic}
          heartRate={pendingRecord.heartRate}
          parent={pendingRecord.parent}
          contactEmail={notificationConfig.contactEmail}
          onConfirm={(sendAlert) => saveRecordToDatabase(pendingRecord, sendAlert)}
          onCancel={() => {
            setIsAlertModalOpen(false);
            setPendingRecord(null);
          }}
        />
      )}

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-[11px] text-slate-400">
        父母血壓守護者 Applet © 2026. 內置 AI 引擎支援 Gemini 2.5. 所有血壓數據儲存於您的私有試算表。
      </footer>
    </div>
  );
}
