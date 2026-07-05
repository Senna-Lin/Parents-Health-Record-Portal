import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware to diagnose API routes vs Vite fallbacks
app.use((req, res, next) => {
  console.log(`[Express Server] ${req.method} ${req.path}`);
  next();
});

// Initialize Gemini SDK with lazy check to prevent startup crash if API key is missing
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: GEMINI_API_KEY environment variable is not set. AI features will be disabled.');
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API endpoint: Analyze blood pressure records with Gemini
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { records, parentInfo } = req.body;
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '請提供有效的血壓記錄進行分析。' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({ 
        error: 'AI 服務尚未配置。請在後台設定中填寫 GEMINI_API_KEY。' 
      });
    }

    // Prepare history data string for Gemini prompt
    const recordsSummary = records
      .map(
        (r) =>
          `時間: ${r.date}, 收縮壓: ${r.systolic} mmHg, 舒張壓: ${r.diastolic} mmHg, 心率: ${r.heartRate} bpm, 狀態: ${r.status}, 備註: ${r.note || '無'}`
      )
      .join('\n');

    const prompt = `
您是一位專業、溫和、具備豐富心血管醫學與老年醫護知識的家庭醫生AI助手。
請為使用者的父母（${parentInfo?.name || '長輩'}，性別: ${parentInfo?.gender === 'M' ? '男' : '女'}，年齡: ${parentInfo?.age || '未指定'}）進行血壓趨勢與健康風險評估。

以下是長輩近期在 Google Sheets 試算表中記錄的血壓與心率數據：
${recordsSummary}

請依據上述實際數據，撰寫一份專屬的「血壓健康與異常通知分析報告」。
報告必須符合以下格式（請使用繁體中文，語氣親切、專業、客觀且具備關懷感，並使用標準 Markdown 語法）：

## 📊 1. 血壓狀態總覽
- 說明這段期間的平均收縮壓與舒張壓，並指出數據中最常出現的血壓分類（如正常、舒張壓偏高、高血壓第一/二期等）。
- 提及脈壓差（收縮壓與舒張壓的差值）是否處於正常範圍（正常為 30-40 mmHg，若過大或過小應給予相應提醒）。

## ⚠️ 2. 潛在風險與趨勢發現
- 分析血壓在不同時間點（例如早晨 vs. 晚上，或前後日期）的波動規律。
- 如果有收縮壓大於等於 140 或舒張壓大於等於 90 的異常偏高記錄，請特別列出，並說明這些異常點出現時的可能原因或危險性。
- 分析心率（Heart Rate）與血壓的協同狀態（心率是否過快、過慢或伴隨血壓異常而波動）。

## 🍎 3. 量身定制的飲食與生活建議
- 提供具體的飲食改善指南（例如：低鈉飲食、DASH 得舒飲食、補充足夠水分等）。
- 提出安全且適合該年齡層的生活習慣調整（例如：溫和運動、避免起床過猛、規律作息等）。

## 🩺 4. 異常警報與子女照護指引
- 當血壓超過設定閾值（收縮壓 >= 140 / 舒張壓 >= 90，尤其是收縮壓 >= 180 或舒張壓 >= 120 的危急狀態）時，指導子女應該如何冷靜應對、發送異常通知，並在何種情況下應立即就醫。

*免責聲明：本報告僅由 AI 進行數據分析與健康建議，不代表正式醫療診斷。若血壓持續異常或身體不適，請立即尋求專業醫師協助。*
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (err: any) {
    console.error('Gemini analysis error:', err);
    res.status(500).json({ error: 'AI 分析失敗，請稍後再試。', details: err.message });
  }
});

// Serve compiled build or mount Vite dev middleware
async function startServer() {
  const isProduction = 
    process.env.NODE_ENV === 'production' || 
    (typeof __filename !== 'undefined' && (__filename.endsWith('server.cjs') || __filename.includes('dist'))) ||
    (typeof __dirname !== 'undefined' && __dirname.endsWith('dist'));
  
  if (!isProduction) {
    console.log('[BP Notifications] Starting Vite development server...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[BP Notifications] Running in production mode, serving static files...');
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`[BP Notifications] Serving assets from directory: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BP Notifications] Server running on http://0.0.0.0:${PORT} in ${isProduction ? 'production' : 'development'} mode`);
  });
}

startServer();
