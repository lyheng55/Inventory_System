/**
 * Material-UI theme configuration with multilingual font support
 */
import { createTheme, Theme } from '@mui/material/styles';
import { getFontFamily } from './fonts';

/**
 * Create Material-UI theme with language-specific fonts
 * @param languageCode - Language code (e.g., 'en', 'km')
 * @returns Material-UI theme object
 */
export const createAppTheme = (languageCode: string = 'en'): Theme => {
  const fontFamily = getFontFamily(languageCode);
  
  return createTheme({
    typography: {
      fontFamily,
      // Additional typography settings for Khmer
      ...(languageCode === 'km' && {
        letterSpacing: '0.01em',
        // Adjust font sizes if needed for better Khmer rendering
        h1: {
          fontFamily,
          letterSpacing: '0.01em',
        },
        h2: {
          fontFamily,
          letterSpacing: '0.01em',
        },
        h3: {
          fontFamily,
          letterSpacing: '0.01em',
        },
        h4: {
          fontFamily,
          letterSpacing: '0.01em',
        },
        h5: {
          fontFamily,
          letterSpacing: '0.01em',
        },
        h6: {
          fontFamily,
          letterSpacing: '0.01em',
        },
        body1: {
          fontFamily,
          letterSpacing: '0.01em',
          lineHeight: 1.6,
        },
        body2: {
          fontFamily,
          letterSpacing: '0.01em',
          lineHeight: 1.6,
        },
        button: {
          fontFamily,
          letterSpacing: '0.01em',
        },
      }),
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily,
            ...(languageCode === 'km' && {
              letterSpacing: '0.01em',
              lineHeight: 1.6,
              textRendering: 'optimizeLegibility',
            }),
          },
        },
      },
      // Ensure all Typography components use the correct font
      MuiTypography: {
        styleOverrides: {
          root: {
            fontFamily,
            ...(languageCode === 'km' && {
              letterSpacing: '0.01em',
              textRendering: 'optimizeLegibility',
            }),
          },
        },
      },
      // Ensure TextField components use the correct font
      MuiTextField: {
        styleOverrides: {
          root: {
            fontFamily,
            ...(languageCode === 'km' && {
              '& .MuiInputBase-input': {
                letterSpacing: '0.01em',
                textRendering: 'optimizeLegibility',
              },
            }),
          },
        },
      },
      // Ensure Button components use the correct font
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily,
            ...(languageCode === 'km' && {
              letterSpacing: '0.01em',
              textRendering: 'optimizeLegibility',
            }),
          },
        },
      },
    },
  });
};

export default createAppTheme;

