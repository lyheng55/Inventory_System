/**
 * Global font utility functions for multilingual support
 * Provides clean, professional fonts for English and Khmer (Cambodian)
 */

// Font families
export const FONTS = {
  ENGLISH: {
    PRIMARY: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    MONOSPACE: "source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace"
  },
  KHMER: {
    PRIMARY: "'Noto Sans Khmer', 'Khmer OS', 'Leelawadee UI', 'Khmer Sangam MN', sans-serif",
    MONOSPACE: "source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace"
  }
} as const;

/**
 * Get the appropriate font family based on language code
 * @param languageCode - Language code (e.g., 'en', 'km')
 * @returns Font family string
 */
export const getFontFamily = (languageCode: string = 'en'): string => {
  return languageCode === 'km' ? FONTS.KHMER.PRIMARY : FONTS.ENGLISH.PRIMARY;
};

/**
 * Get the appropriate monospace font family based on language code
 * @param languageCode - Language code (e.g., 'en', 'km')
 * @returns Font family string
 */
export const getMonospaceFontFamily = (languageCode: string = 'en'): string => {
  return languageCode === 'km' ? FONTS.KHMER.MONOSPACE : FONTS.ENGLISH.MONOSPACE;
};

/**
 * Get font styles object for Material-UI components
 * @param languageCode - Language code (e.g., 'en', 'km')
 * @returns Font styles object
 */
export const getFontStyles = (languageCode: string = 'en'): React.CSSProperties => {
  const fontFamily = getFontFamily(languageCode);
  
  return {
    fontFamily,
    // Additional styles for better Khmer rendering
    ...(languageCode === 'km' && {
      letterSpacing: '0.01em',
      lineHeight: 1.6,
      // Ensure proper text rendering for Khmer
      textRendering: 'optimizeLegibility',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    })
  };
};

/**
 * Apply global font styles to document body
 * @param languageCode - Language code (e.g., 'en', 'km')
 */
export const applyGlobalFont = (languageCode: string = 'en'): void => {
  const fontFamily = getFontFamily(languageCode);
  const monospaceFontFamily = getMonospaceFontFamily(languageCode);
  const root = document.documentElement;
  
  // Update CSS variables for dynamic font switching
  root.style.setProperty('--font-family-primary', fontFamily);
  root.style.setProperty('--font-family-monospace', monospaceFontFamily);
  
  // Apply font to body
  if (document.body) {
    // Additional styles for Khmer
    if (languageCode === 'km') {
      // Khmer font is applied via CSS data attribute selector
      // This ensures all elements inherit the font properly
      document.body.setAttribute('data-lang', 'km');
    } else {
      document.body.setAttribute('data-lang', 'en');
      document.body.style.fontFamily = fontFamily;
    }
  }
};

/**
 * Get CSS variables for font families
 * @param languageCode - Language code (e.g., 'en', 'km')
 * @returns CSS variables object
 */
export const getFontCSSVariables = (languageCode: string = 'en'): Record<string, string> => {
  return {
    '--font-family-primary': getFontFamily(languageCode),
    '--font-family-monospace': getMonospaceFontFamily(languageCode),
  };
};

export default {
  FONTS,
  getFontFamily,
  getMonospaceFontFamily,
  getFontStyles,
  applyGlobalFont,
  getFontCSSVariables
};

