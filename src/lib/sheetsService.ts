import { BloodPressureRecord, AlertHistory } from '../types';
import { evaluateBPStatus } from './bpHelper';

// Helper to handle API fetch requests with authorization
async function sheetsFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets API Error (${res.status}): ${errText}`);
  }
  return res.json();
}

export const sheetsService = {
  /**
   * Load a configured spreadsheet by ID and ensure its required tabs exist.
   * This intentionally does not search Google Drive or create spreadsheet files.
   */
  async loadSpreadsheet(accessToken: string, spreadsheetId: string): Promise<{ spreadsheetId: string; sheetsInfo: { title: string; sheetId: number }[]; recordsSheetName: string }> {
    try {
      const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties(sheetId,title)`;
      const meta = await sheetsFetch(metaUrl, accessToken);
      const sheetsInfo = meta.sheets.map((s: any) => ({
        title: s.properties.title,
        sheetId: s.properties.sheetId,
      }));

      let recordsSheetName = '血壓記錄';
      const formResponseSheet = sheetsInfo.find((s: any) =>
        s.title.includes('表單回應') ||
        s.title.includes('Form Responses') ||
        s.title.includes('Responses') ||
        s.title === '血壓記錄' ||
        s.title === '血壓紀錄'
      );
      if (formResponseSheet) {
        recordsSheetName = formResponseSheet.title;
      } else if (sheetsInfo.length > 0) {
        recordsSheetName = sheetsInfo[0].title;
      }

      const hasRecordsTab = sheetsInfo.some((s: any) =>
        s.title === '血壓記錄' ||
        s.title.includes('表單回應') ||
        s.title.includes('Form Responses') ||
        s.title.includes('Responses') ||
        s.title === '血壓紀錄'
      );
      const hasAlertsTab = sheetsInfo.some((s: any) => s.title === '異常通知歷史');

      if (!hasRecordsTab || !hasAlertsTab) {
        const requests: any[] = [];
        if (!hasRecordsTab) {
          requests.push({ addSheet: { properties: { title: '血壓記錄' } } });
          recordsSheetName = '血壓記錄';
        }
        if (!hasAlertsTab) {
          requests.push({ addSheet: { properties: { title: '異常通知歷史' } } });
        }
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`;
        await sheetsFetch(updateUrl, accessToken, {
          method: 'POST',
          body: JSON.stringify({ requests }),
        });
        const updatedMeta = await sheetsFetch(metaUrl, accessToken);
        const updatedSheetsInfo = updatedMeta.sheets.map((s: any) => ({
          title: s.properties.title,
          sheetId: s.properties.sheetId,
        }));
        await this.initializeSheetHeaders(accessToken, spreadsheetId, !hasRecordsTab, !hasAlertsTab);
        return { spreadsheetId, sheetsInfo: updatedSheetsInfo, recordsSheetName };
      }
      return { spreadsheetId, sheetsInfo, recordsSheetName };
    } catch (err: any) {
      console.error('loadSpreadsheet error:', err);
      if (/Google Sheets API Error \((403|404)\)/.test(err?.message || '')) {
        throw new Error('目前 Google 帳號無法存取指定的健康紀錄試算表，請確認試算表已分享給此帳號。');
      }
      throw err;
    }
  },
  /**
   * Write column headers to sheets
   */
  async initializeSheetHeaders(accessToken: string, spreadsheetId: string, initRecords: boolean, initAlerts: boolean) {
    const data: any[] = [];

    if (initRecords) {
      data.push({
        range: '血壓記錄!A1:H1',
        values: [['記錄ID', '對象', '測量時間', '收縮壓(mmHg)', '舒張壓(mmHg)', '心率(bpm)', '健康狀態', '備註']],
      });
    }

    if (initAlerts) {
      data.push({
        range: '異常通知歷史!A1:I1',
        values: [['警報ID', '對象', '發送時間', '收縮壓(mmHg)', '舒張壓(mmHg)', '心率(bpm)', '子女聯絡信箱', '發送狀態', '異常描述']],
      });
    }

    if (data.length > 0) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
      await sheetsFetch(url, accessToken, {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data,
        }),
      });
    }
  },

  /**
   * Fetch blood pressure records from specified sheet with dynamic column mapping
   */
  async fetchBPRecords(accessToken: string, spreadsheetId: string, sheetName: string = '血壓記錄', defaultParent: string = ''): Promise<BloodPressureRecord[]> {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z`;
      const result = await sheetsFetch(url, accessToken);

      if (!result.values || result.values.length === 0) {
        return [];
      }

      const headers = result.values[0] || [];
      
      // Helper to find column index matching keywords
      const findColumnIndex = (keywords: string[]) => {
        return headers.findIndex((h: any) => {
          if (typeof h !== 'string') return false;
          const hLower = h.toLowerCase();
          return keywords.some(kw => hLower.includes(kw.toLowerCase()));
        });
      };

      const dateIndex = findColumnIndex(['時間', 'timestamp', '日期', 'date', '時段', 'moment']);
      const systolicIndex = findColumnIndex(['收縮壓', '收縮', 'sys', '高壓', 'systolic']);
      const diastolicIndex = findColumnIndex(['舒張壓', '舒張', 'dia', '低壓', 'diastolic']);
      const heartRateIndex = findColumnIndex(['心率', '心跳', '脈搏', 'heart', 'bpm', 'pulse']);
      const noteIndex = findColumnIndex(['備註', '說明', 'note', '備忘', '狀態', '評語']);
      const parentIndex = findColumnIndex(['對象', '姓名', 'name', 'parent', '人員', '量測者']);
      const statusIndex = findColumnIndex(['狀態', '分級', 'status', 'level']);
      const idIndex = findColumnIndex(['id', '記錄id', '記錄ID']);

      const rows = result.values.slice(1); // Exclude header row
      return rows.map((row: any[], index: number) => {
        const rowNum = index + 2; // Row number in sheet is 1-indexed plus header row
        
        // Extract values using indices (fallbacks if index is -1)
        const dateRaw = dateIndex !== -1 ? row[dateIndex] : (row[0] || '');
        const systolicRaw = systolicIndex !== -1 ? row[systolicIndex] : (row[3] || row[2] || '');
        const diastolicRaw = diastolicIndex !== -1 ? row[diastolicIndex] : (row[4] || row[3] || '');
        const heartRateRaw = heartRateIndex !== -1 ? row[heartRateIndex] : (row[5] || row[4] || '');
        const noteRaw = noteIndex !== -1 ? row[noteIndex] : (row[7] || row[5] || '');
        const parentRaw = parentIndex !== -1 ? row[parentIndex] : (row[1] || defaultParent);
        const idRaw = idIndex !== -1 ? row[idIndex] : `row_${rowNum}`;

        const systolic = Number(systolicRaw) || 0;
        const diastolic = Number(diastolicRaw) || 0;
        const heartRate = Number(heartRateRaw) || 0;
        
        // Skip empty rows (e.g. if systolic and diastolic are both empty or 0)
        if (!systolic && !diastolic) {
          return null;
        }

        const dateStr = dateRaw ? String(dateRaw).trim() : '';
        const parentVal = parentRaw ? String(parentRaw).trim() : defaultParent;

        // Evaluate WHO BP Status
        let statusVal: any = 'Normal';
        if (statusIndex !== -1 && row[statusIndex]) {
          const rawStatus = String(row[statusIndex]).trim();
          if (['Normal', 'Elevated', 'Stage 1', 'Stage 2', 'Crisis', 'Low'].includes(rawStatus)) {
            statusVal = rawStatus;
          } else {
            statusVal = evaluateBPStatus(systolic, diastolic).status;
          }
        } else {
          statusVal = evaluateBPStatus(systolic, diastolic).status;
        }

        return {
          id: `${parentVal}_${String(idRaw).trim() || `row_${rowNum}`}`,
          parent: parentVal,
          date: dateStr,
          systolic,
          diastolic,
          heartRate,
          status: statusVal,
          note: noteRaw ? String(noteRaw).trim() : '',
        };
      }).filter((record): record is BloodPressureRecord => record !== null);
    } catch (err) {
      console.error('fetchBPRecords error:', err);
      return [];
    }
  },

  /**
   * Add a blood pressure record to the sheet
   */
  async addBPRecord(accessToken: string, spreadsheetId: string, record: Omit<BloodPressureRecord, 'id'>, sheetName: string = '血壓記錄'): Promise<BloodPressureRecord> {
    const id = `BP_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const fullRecord: BloodPressureRecord = { ...record, id };

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:append?valueInputOption=USER_ENTERED`;
    await sheetsFetch(url, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        values: [[
          fullRecord.id, // Write the raw ID (unprefixed) to the spreadsheet
          fullRecord.parent,
          fullRecord.date,
          fullRecord.systolic,
          fullRecord.diastolic,
          fullRecord.heartRate,
          fullRecord.status,
          fullRecord.note,
        ]],
      }),
    });

    // Return with the prefix to keep local client-side state unique
    return { ...fullRecord, id: `${record.parent}_${id}` };
  },

  /**
   * Delete a blood pressure record by searching for its ID and calling deleteDimension
   */
  async deleteBPRecord(accessToken: string, spreadsheetId: string, sheetId: number, recordId: string, sheetName: string = '血壓記錄'): Promise<void> {
    // Strip parent prefixes like '父親_' or '母親_' from recordId
    const cleanRecordId = recordId.replace(/^(父親_|母親_)/, '');

    // 1. Fetch records to find row index
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:A`;
    const result = await sheetsFetch(url, accessToken);

    if (!result.values) return;

    // Find row index (0-indexed)
    const rowIndex = result.values.findIndex((row: any[]) => row[0] === cleanRecordId);
    if (rowIndex === -1) {
      throw new Error('找不到該筆血壓記錄，無法刪除。');
    }

    // 2. Perform deleteDimension batchUpdate
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    await sheetsFetch(updateUrl, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      }),
    });
  },

  /**
   * Fetch alert history from "異常通知歷史" sheet
   */
  async fetchAlertHistory(accessToken: string, spreadsheetId: string): Promise<AlertHistory[]> {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/異常通知歷史!A1:I`;
      const result = await sheetsFetch(url, accessToken);

      if (!result.values || result.values.length <= 1) {
        return [];
      }

      const rows = result.values.slice(1);
      return rows.map((row: any[]) => {
        const parentVal = row[1] || '';
        const rawId = row[0] || '';
        return {
          id: rawId ? `${parentVal}_${rawId}` : '',
          parent: parentVal,
          dateTime: row[2] || '',
          systolic: Number(row[3]) || 0,
          diastolic: Number(row[4]) || 0,
          heartRate: Number(row[5]) || 0,
          contactEmail: row[6] || '',
          alertStatus: row[7] || '',
          alertNote: row[8] || '',
        };
      }).filter(alert => alert.id);
    } catch (err) {
      console.error('fetchAlertHistory error:', err);
      return [];
    }
  },

  /**
   * Add an alert log to "異常通知歷史" sheet
   */
  async addAlertHistory(accessToken: string, spreadsheetId: string, alert: Omit<AlertHistory, 'id'>): Promise<AlertHistory> {
    const id = `ALT_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const fullAlert: AlertHistory = { ...alert, id };

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/異常通知歷史!A2:append?valueInputOption=USER_ENTERED`;
    await sheetsFetch(url, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        values: [[
          fullAlert.id,
          fullAlert.parent,
          fullAlert.dateTime,
          fullAlert.systolic,
          fullAlert.diastolic,
          fullAlert.heartRate,
          fullAlert.contactEmail,
          fullAlert.alertStatus,
          fullAlert.alertNote,
        ]],
      }),
    });

    return { ...fullAlert, id: `${alert.parent}_${id}` };
  }
};
