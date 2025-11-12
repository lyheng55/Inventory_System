/**
 * React hook for accessing font utilities based on current language
 */
import { useTranslation } from 'react-i18next';
import { getFontFamily, getFontStyles, getMonospaceFontFamily } from '../utils/fonts';

interface UseFontReturn {
  fontFamily: string;
  monospaceFontFamily: string;
  fontStyles: React.CSSProperties;
  languageCode: string;
}

/**
 * Hook to get font utilities based on current language
 * @returns Font utilities object
 */
export const useFont = (): UseFontReturn => {
  const { i18n } = useTranslation();
  const languageCode = i18n.language || 'en';

  return {
    fontFamily: getFontFamily(languageCode),
    monospaceFontFamily: getMonospaceFontFamily(languageCode),
    fontStyles: getFontStyles(languageCode),
    languageCode,
  };
};

export default useFont;

