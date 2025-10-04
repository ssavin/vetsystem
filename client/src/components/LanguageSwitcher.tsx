import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { toast } = useToast();

  const changeLanguage = async (languageCode: string) => {
    try {
      // Change language in i18next
      await i18n.changeLanguage(languageCode);
      
      // Save to user profile
      await apiRequest('/api/user/locale', {
        method: 'PUT',
        body: JSON.stringify({ locale: languageCode }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Invalidate user cache to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: languageCode === 'ru' ? 'Язык изменён' : 'Language changed',
        description: languageCode === 'ru' 
          ? `Выбран русский язык` 
          : `English language selected`,
      });
    } catch (error) {
      console.error('Failed to change language:', error);
      // Still change language locally even if API fails
      await i18n.changeLanguage(languageCode);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          data-testid="button-language-switcher"
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className="flex items-center gap-2"
            data-testid={`language-option-${language.code}`}
          >
            <span>{language.flag}</span>
            <span>{language.name}</span>
            {currentLanguage.code === language.code && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
