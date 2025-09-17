// Centralized role permissions to avoid HMR cascades
export const ROLE_PERMISSIONS = {
  'врач': ['registry', 'schedule', 'medical-records'],
  'администратор': ['registry', 'schedule', 'medical-records', 'services-inventory', 'finance', 'reports', 'settings', 'users'],
  'менеджер': ['registry', 'schedule', 'services-inventory', 'finance'],
  'менеджер_склада': ['services-inventory'],
  'руководитель': ['registry', 'schedule', 'medical-records', 'services-inventory', 'finance', 'reports', 'settings', 'users']
} as const;