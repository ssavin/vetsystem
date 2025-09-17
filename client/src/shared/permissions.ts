// Centralized role permissions to avoid HMR cascades
export const ROLE_PERMISSIONS = {
  'врач': ['owners', 'patients', 'doctors', 'appointments', 'medical_records'],
  'администратор': ['owners', 'patients', 'doctors', 'appointments', 'medical_records', 'finance', 'reports', 'settings', 'users'],
  'менеджер': ['owners', 'patients', 'appointments', 'finance'],
  'менеджер_склада': ['services', 'inventory'],
  'руководитель': ['owners', 'patients', 'doctors', 'appointments', 'medical_records', 'finance', 'reports', 'settings', 'users']
} as const;