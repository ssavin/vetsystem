// Centralized role permissions to avoid HMR cascades
export const ROLE_PERMISSIONS = {
  'врач': ['owners', 'patients', 'doctors', 'appointments', 'medical_records', 'laboratory'],
  'администратор': ['owners', 'patients', 'doctors', 'appointments', 'medical_records', 'laboratory', 'services', 'finance', 'reports', 'settings', 'users', 'branches'],
  'менеджер': ['owners', 'patients', 'appointments', 'finance'],
  'менеджер_склада': ['services', 'inventory'],
  'руководитель': ['owners', 'patients', 'doctors', 'appointments', 'medical_records', 'laboratory', 'services', 'finance', 'reports', 'settings', 'users', 'branches']
} as const;