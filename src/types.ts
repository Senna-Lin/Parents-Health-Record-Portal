export interface BloodPressureRecord {
  id: string;
  parent: string;
  date: string; // ISO format or YYYY-MM-DD HH:mm
  systolic: number;
  diastolic: number;
  heartRate: number;
  status: 'Normal' | 'Elevated' | 'Stage 1' | 'Stage 2' | 'Crisis' | 'Low';
  note: string;
}

export interface AlertHistory {
  id: string;
  parent: string;
  dateTime: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  contactEmail: string;
  alertStatus: string; // e.g., 'Sent (Simulated)', 'In-App Only'
  alertNote: string;
}

export interface NotificationConfig {
  contactEmail: string;
  alertThresholdSystolic: number;
  alertThresholdDiastolic: number;
  alertThresholdSystolicMin: number;
  alertThresholdDiastolicMin: number;
  enableEmailAlert: boolean;
}

export interface ParentProfile {
  id: string;
  name: string;
  gender: 'M' | 'F' | 'Other';
  age: number;
}
