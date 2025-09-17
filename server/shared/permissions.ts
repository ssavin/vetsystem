// Server-side role permissions for middleware validation
export const ROLE_PERMISSIONS = {
  'врач': ['owners', 'patients', 'doctors', 'appointments', 'medical_records', 'laboratory'],
  'администратор': ['owners', 'patients', 'doctors', 'appointments', 'medical_records', 'laboratory', 'finance', 'reports', 'settings', 'users'],
  'менеджер': ['owners', 'patients', 'appointments', 'finance'],
  'менеджер_склада': ['services', 'inventory'],
  'руководитель': ['owners', 'patients', 'doctors', 'appointments', 'medical_records', 'laboratory', 'finance', 'reports', 'settings', 'users']
} as const;