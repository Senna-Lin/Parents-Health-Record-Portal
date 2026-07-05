export interface BPStatusDetail {
  status: 'Normal' | 'Elevated' | 'Stage 1' | 'Stage 2' | 'Crisis' | 'Low';
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconBgColor: string;
  progressColor: string;
  desc: string;
}

export function evaluateBPStatus(systolic: number, diastolic: number): BPStatusDetail {
  if (systolic < 90 || diastolic < 60) {
    return {
      status: 'Low',
      label: '低血壓 (Hypotension)',
      color: 'text-sky-700',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      textColor: 'text-sky-800',
      iconBgColor: 'bg-sky-100',
      progressColor: 'bg-sky-500',
      desc: '血壓低於正常標準（收縮壓 < 90 或 舒張壓 < 60 mmHg）。可能伴隨頭暈、乏力。建議長輩適當補充水分、緩慢起立，若不適加劇請立即安排就醫諮詢。',
    };
  }
  if (systolic >= 180 || diastolic >= 120) {
    return {
      status: 'Crisis',
      label: '高血壓危急期 (Crisis)',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      textColor: 'text-red-800',
      iconBgColor: 'bg-red-100',
      progressColor: 'bg-red-600',
      desc: '血壓極度危險！可能伴隨頭痛、胸痛、呼吸困難。請立即就醫或撥打緊急救護電話！',
    };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return {
      status: 'Stage 2',
      label: '第二期高血壓 (Stage 2)',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-800',
      iconBgColor: 'bg-rose-100',
      progressColor: 'bg-rose-500',
      desc: '血壓顯著異常偏高！子女將收到即時通知，請安排長輩諮詢專業心臟血管科醫師。',
    };
  }
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
    return {
      status: 'Stage 1',
      label: '第一期高血壓 (Stage 1)',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      iconBgColor: 'bg-amber-100',
      progressColor: 'bg-amber-500',
      desc: '血壓輕度偏高。建議開始調整飲食（DASH 得舒飲食、少鹽）並建立運動習慣。',
    };
  }
  if ((systolic >= 120 && systolic <= 129) && diastolic < 80) {
    return {
      status: 'Elevated',
      label: '血壓偏高 (Elevated)',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconBgColor: 'bg-yellow-100',
      progressColor: 'bg-yellow-400',
      desc: '收縮壓已超出健康理想標準，需注意自主調適，規律監測血壓。',
    };
  }
  return {
    status: 'Normal',
    label: '血壓正常 (Normal)',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-800',
    iconBgColor: 'bg-emerald-100',
    progressColor: 'bg-emerald-500',
    desc: '非常健康！血壓處於理想的安全標準內，請長輩繼續保持良好的生活作息。',
  };
}

/**
 * Parses Taiwan Google Sheets AM/PM localized datetime string, serial numbers, or standard ISO formats
 */
export function parseSpreadsheetDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  const str = String(dateStr).trim();
  if (!str) return new Date();

  // 1. Check if the string is numeric (could be a Google Sheets serial number or a Unix timestamp)
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (num > 100000000000) {
      // Milliseconds timestamp (e.g. 1778544000000)
      const d = new Date(num);
      if (!isNaN(d.getTime())) return d;
    } else if (num > 1000000000) {
      // Seconds timestamp (e.g. 1778544000)
      const d = new Date(num * 1000);
      if (!isNaN(d.getTime())) return d;
    } else if (num > 0 && num < 100000) {
      // Google Sheets / Excel serial number (base 1899-12-30)
      // 25569 is Jan 1, 1970 UTC.
      const utcMS = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(utcMS);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }

  try {
    let cleaned = str;
    const isPM = cleaned.includes('下午') || cleaned.toLowerCase().includes('pm');
    const isAM = cleaned.includes('上午') || cleaned.toLowerCase().includes('am');
    
    cleaned = cleaned
      .replace(/上午/g, '')
      .replace(/下午/g, '')
      .replace(/am/gi, '')
      .replace(/pm/gi, '')
      .replace(/年/g, '-')
      .replace(/月/g, '-')
      .replace(/日/g, ' ')
      .replace(/時/g, ':')
      .replace(/分/g, ':')
      .replace(/秒/g, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    // Replace all slashes, dots with hyphens
    cleaned = cleaned.replace(/[\/\.]/g, '-');
    
    const parts = cleaned.split(' ');
    const dateParts = parts[0].split('-');
    
    if (dateParts.length === 3) {
      let year = 0;
      let month = 0;
      let day = 0;
      
      const p0 = Number(dateParts[0]);
      const p1 = Number(dateParts[1]);
      const p2 = Number(dateParts[2]);
      
      if (dateParts[0].length === 4) {
        // YYYY-MM-DD
        year = p0;
        month = p1 - 1;
        day = p2;
      } else if (dateParts[2].length === 4) {
        // MM-DD-YYYY or DD-MM-YYYY
        year = p2;
        if (p0 > 12) {
          // DD-MM-YYYY
          day = p0;
          month = p1 - 1;
        } else if (p1 > 12) {
          // MM-DD-YYYY
          month = p0 - 1;
          day = p1;
        } else {
          // Default to US format: MM-DD-YYYY (e.g., 5/12/2026 -> May 12)
          month = p0 - 1;
          day = p1;
        }
      } else {
        // Fallback for 2-digit years or other formats
        if (p0 < 100 && p0 > 5) {
          year = 2000 + p0;
          month = p1 - 1;
          day = p2;
        } else {
          year = p2 < 100 ? 2000 + p2 : p2;
          month = p0 - 1;
          day = p1;
        }
      }
      
      // Ensure the values are within reasonable ranges to avoid Year 1911 offset bugs
      if (year < 100) {
        year += 2000;
      }
      
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
      
      if (parts[1]) {
        const timeParts = parts[1].split(':');
        hours = Number(timeParts[0]) || 0;
        minutes = Number(timeParts[1]) || 0;
        seconds = Number(timeParts[2]) || 0;
        
        if (isPM && hours < 12) {
          hours += 12;
        }
        if (isAM && hours === 12) {
          hours = 0;
        }
      }
      
      const parsedDate = new Date(year, month, day, hours, minutes, seconds);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
  } catch (e) {
    console.error('parseSpreadsheetDate error:', e);
  }
  
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}
