import { useId, useState } from 'react'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import LightModeIcon from '@mui/icons-material/LightMode'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { useColorScheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_STORAGE_KEY } from '../../i18n.ts'
import type { Language } from '../../language.ts'

export default function HeaderActions() {
  const { t, i18n } = useTranslation()
  const { mode, systemMode, setMode } = useColorScheme()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuId = useId()
  const buttonId = useId()
  const resolvedMode = mode === 'system' ? systemMode : mode
  const isDark = resolvedMode === 'dark'
  const themeLabel = t(isDark ? 'switchToLight' : 'switchToDark')

  function selectLanguage(language: Language) {
    void i18n.changeLanguage(language)
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // The session still switches when persistent storage is blocked.
    }
    setAnchorEl(null)
  }

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <IconButton
        id={buttonId}
        aria-label={t('language')}
        title={t('language')}
        aria-haspopup="menu"
        aria-controls={anchorEl ? menuId : undefined}
        aria-expanded={anchorEl ? true : undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        <LanguageIcon />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ list: { 'aria-labelledby': buttonId } }}
      >
        <MenuItem selected={i18n.resolvedLanguage === 'en'} onClick={() => selectLanguage('en')}>
          English
        </MenuItem>
        <MenuItem selected={i18n.resolvedLanguage === 'zh'} onClick={() => selectLanguage('zh')}>
          中文
        </MenuItem>
      </Menu>
      <IconButton
        aria-label={themeLabel}
        title={themeLabel}
        disabled={!resolvedMode}
        onClick={() => setMode(isDark ? 'light' : 'dark')}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
      <IconButton
        component="a"
        href="https://github.com/perqin/paper-stitch-web"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('viewOnGitHub')}
        title={t('viewOnGitHub')}
      >
        <GitHubIcon />
      </IconButton>
    </Stack>
  )
}
