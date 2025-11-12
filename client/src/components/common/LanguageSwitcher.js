import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEYS } from '../../constants';
import { applyGlobalFont } from '../../utils/fonts';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'km', name: 'Cambodian', nativeName: 'ខ្មែរ' },
];

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, languageCode);
    // Apply font when language changes
    applyGlobalFont(languageCode);
    // Update body data attribute for CSS targeting
    if (document.body) {
      document.body.setAttribute('data-lang', languageCode);
    }
    // Update html lang attribute
    if (document.documentElement) {
      document.documentElement.setAttribute('lang', languageCode);
    }
    handleClose();
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <>
      <Tooltip title={t('language.selectLanguage')}>
        <IconButton
          onClick={handleClick}
          color="inherit"
          aria-label="change language"
          sx={{ mr: 1 }}
        >
          <LanguageIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={i18n.language === language.code}
          >
            <ListItemText>
              {language.nativeName} {i18n.language === language.code && '✓'}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;

