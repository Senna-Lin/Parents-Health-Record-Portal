import React, { useState } from 'react';
import { Mail, Settings, Bell, Shield, Check } from 'lucide-react';
import { NotificationConfig } from '../types';

interface ConfigCardProps {
  config: NotificationConfig;
  onSaveConfig: (updated: NotificationConfig) => void;
}

export const ConfigCard: React.FC<ConfigCardProps> = ({ config, onSaveConfig }) => {
  const [email, setEmail] = useState(config.contactEmail);
  const [sysThreshold, setSysThreshold] = useState(config.alertThresholdSystolic.toString());
  const [diaThreshold, setDiaThreshold] = useState(config.alertThresholdDiastolic.toString());
  const [sysThresholdMin, setSysThresholdMin] = useState(config.alertThresholdSystolicMin.toString());
  const [diaThresholdMin, setDiaThresholdMin] = useState(config.alertThresholdDiastolicMin.toString());
  const [enableEmail, setEnableEmail] = useState(config.enableEmailAlert);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSaveConfig({
      contactEmail: email.trim(),
      alertThresholdSystolic: parseInt(sysThreshold) || 140,
      alertThresholdDiastolic: parseInt(diaThreshold) || 90,
      alertThresholdSystolicMin: parseInt(sysThresholdMin) || 90,
      alertThresholdDiastolicMin: parseInt(diaThresholdMin) || 60,
      enableEmailAlert: enableEmail,
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs" id="config-card">
      <h3 className="text-md font-bold text-slate-800 font-display flex items-center mb-4">
        <Settings className="w-5 h-5 text-slate-500 mr-2" />
        警報與通知設定
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Child Email Contact */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center">
            <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" /> 子女聯絡信箱 (接收血壓異常通知)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例如: child@example.com"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden transition-all text-slate-700 bg-slate-50 font-mono"
            required
          />
          <p className="text-[10px] text-slate-400 mt-1">
            當量測出的血壓超出設定警報高、低門檻時，系統將會向此信箱發送異常通知。
          </p>
        </div>

        {/* Warning Upper Thresholds */}
        <div className="border-t border-slate-100 pt-3">
          <h4 className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center">
            <Bell className="w-3.5 h-3.5 mr-1 text-rose-500" /> 高血壓警報門檻 (高於設定值觸發)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center">
                收縮壓警報 (≧)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={sysThreshold}
                  onChange={(e) => setSysThreshold(e.target.value)}
                  min="90"
                  max="200"
                  className="w-full pl-3 pr-12 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden transition-all text-slate-700"
                  required
                />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-400 font-mono">
                  mmHg
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center">
                舒張壓警報 (≧)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={diaThreshold}
                  onChange={(e) => setDiaThreshold(e.target.value)}
                  min="60"
                  max="130"
                  className="w-full pl-3 pr-12 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden transition-all text-slate-700"
                  required
                />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-400 font-mono">
                  mmHg
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Lower Thresholds */}
        <div className="border-t border-slate-100 pt-3">
          <h4 className="text-[11px] font-bold text-sky-600 uppercase tracking-wider mb-2 flex items-center">
            <Bell className="w-3.5 h-3.5 mr-1 text-sky-500" /> 低血壓警報門檻 (低於設定值觸發)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center">
                收縮壓下限 (≦)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={sysThresholdMin}
                  onChange={(e) => setSysThresholdMin(e.target.value)}
                  min="40"
                  max="100"
                  className="w-full pl-3 pr-12 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-hidden transition-all text-slate-700"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-400 font-mono">
                  mmHg
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 flex items-center">
                舒張壓下限 (≦)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={diaThresholdMin}
                  onChange={(e) => setDiaThresholdMin(e.target.value)}
                  min="30"
                  max="70"
                  className="w-full pl-3 pr-12 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-hidden transition-all text-slate-700"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-400 font-mono">
                  mmHg
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Channel Activation */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-start space-x-2">
            <Shield className="w-4 h-4 text-emerald-500 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-700">啟用模擬通知警報</h4>
              <p className="text-[10px] text-slate-500">血壓異常時彈出子女確認通知，並同步寫入試算表歷史</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableEmail}
              onChange={(e) => setEnableEmail(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          id="save-config-btn"
          className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
            showSuccess
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100'
              : 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs'
          }`}
        >
          {showSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>設定儲存成功！</span>
            </>
          ) : (
            <span>儲存通知設定</span>
          )}
        </button>
      </form>
    </div>
  );
};
