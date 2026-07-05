import React from 'react';
import { User } from 'firebase/auth';
import { LogIn, LogOut, CheckCircle, Database, FileSpreadsheet, Loader2 } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  fatherSpreadsheetId: string | null;
  motherSpreadsheetId: string | null;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  fatherSpreadsheetId,
  motherSpreadsheetId,
  isSyncing,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-100">
            <svg
              className="w-6 h-6 animate-pulse-heart"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold font-display tracking-tight text-slate-800 flex items-center">
              父母血壓守護者 <span className="ml-1.5 text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-medium">雙試算表同步版</span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">關懷長輩血壓健康，異常自動警報通知</p>
          </div>
        </div>

        {/* Auth and Sync Controls */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              {/* Spreadsheet Sync Badge */}
              <div className="hidden md:flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                {isSyncing ? (
                  <div className="flex items-center px-2 py-1">
                    <Loader2 className="w-4 h-4 text-rose-500 animate-spin mr-1.5" />
                    <span className="text-[11px] text-slate-500 font-medium">同步中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    {fatherSpreadsheetId ? (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${fatherSpreadsheetId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-slate-600 flex items-center hover:text-rose-600 bg-white border border-slate-150 px-2 py-1 rounded-md shadow-2xs hover:border-rose-200"
                        title="開啟 父親試算表 (Grandfather’s health record)"
                      >
                        <FileSpreadsheet className="w-3 h-3 mr-1 text-blue-600" />
                        👨 父親試算表
                      </a>
                    ) : null}

                    {motherSpreadsheetId ? (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${motherSpreadsheetId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-slate-600 flex items-center hover:text-rose-600 bg-white border border-slate-150 px-2 py-1 rounded-md shadow-2xs hover:border-rose-200"
                        title="開啟 母親試算表 (Grandmother’s health record)"
                      >
                        <FileSpreadsheet className="w-3 h-3 mr-1 text-emerald-600" />
                        👩 母親試算表
                      </a>
                    ) : null}

                    {!fatherSpreadsheetId && !motherSpreadsheetId && (
                      <span className="text-xs text-slate-500 px-2">正在初始化試算表...</span>
                    )}
                  </div>
                )}
              </div>

              {/* User Avatar & Info */}
              <div className="flex items-center space-x-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-slate-700 leading-none">
                    {user.displayName || '使用者'}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
                title="登出帳號"
                id="logout-btn"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              id="google-signin-btn"
              className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-rose-500 to-orange-400 group-hover:from-rose-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-hidden focus:ring-rose-200 cursor-pointer transition-all duration-300"
            >
              <span className="relative px-4 py-2 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0 flex items-center space-x-2 text-slate-700 dark:text-white font-semibold">
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>登入中...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4.5 h-4.5" />
                    <span>登入 Google 儲存記錄</span>
                  </>
                )}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
