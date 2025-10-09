// Visit type translations and constants

export const VISIT_TYPES = {
  consultation: 'Консультация',
  emergency: 'Экстренный прием',
  'follow-up': 'Повторный прием',
  'follow_up': 'Повторный прием',
  vaccination: 'Вакцинация',
  surgery: 'Операция',
  checkup: 'Осмотр',
  'planned_examination': 'Плановый осмотр',
  'Приём': 'Приём', // Already in Russian from migration
  'Плановый осмотр': 'Плановый осмотр', // Already in Russian
} as const;

export function translateVisitType(visitType: string | null | undefined): string {
  if (!visitType) return 'Не указан';
  
  // Check if translation exists
  const translated = VISIT_TYPES[visitType as keyof typeof VISIT_TYPES];
  if (translated) return translated;
  
  // Return as-is if already in Russian or unknown
  return visitType;
}

// List of visit types for select options
export const VISIT_TYPE_OPTIONS = [
  { value: 'consultation', label: 'Консультация' },
  { value: 'emergency', label: 'Экстренный прием' },
  { value: 'follow-up', label: 'Повторный прием' },
  { value: 'vaccination', label: 'Вакцинация' },
  { value: 'surgery', label: 'Операция' },
  { value: 'checkup', label: 'Осмотр' },
  { value: 'planned_examination', label: 'Плановый осмотр' },
] as const;
