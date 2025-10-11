import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Species translation from English to Russian
export function translateSpecies(species: string | null | undefined): string {
  if (!species) return 'Не указан'
  
  const translations: Record<string, string> = {
    'dog': 'Собака',
    'cat': 'Кошка',
    'horse': 'Лошадь',
    'bird': 'Птица',
    'rodent': 'Грызун',
    'rabbit': 'Кролик',
    'reptile': 'Рептилия',
    'exotic': 'Экзотическое',
    'other': 'Другое'
  }
  
  return translations[species.toLowerCase()] || species
}
