import { useId, useState } from 'react'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import GitHubIcon from '@mui/icons-material/GitHub'
import HelpIcon from '@mui/icons-material/HelpOutlined'
import LanguageIcon from '@mui/icons-material/Language'
import LightModeIcon from '@mui/icons-material/LightMode'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
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
  const [helpOpen, setHelpOpen] = useState(false)
  const menuId = useId()
  const buttonId = useId()
  const helpTitleId = useId()
  const helpDescriptionId = useId()
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
    <Stack direction="row" spacing={{ xs: 0, sm: 0.5 }} sx={{ alignItems: 'center', flexShrink: 0, '& .MuiIconButton-root': { width: 32, height: 32 } }}>
      <IconButton
        size="small"
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
        size="small"
        aria-label={themeLabel}
        title={themeLabel}
        disabled={!resolvedMode}
        onClick={() => setMode(isDark ? 'light' : 'dark')}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
      <IconButton
        size="small"
        component="a"
        href="https://github.com/perqin/paper-stitch-web"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('viewOnGitHub')}
        title={t('viewOnGitHub')}
      >
        <GitHubIcon />
      </IconButton>
      <IconButton size="small" aria-label={t('help')} title={t('help')} onClick={() => setHelpOpen(true)}><HelpIcon /></IconButton>
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} aria-labelledby={helpTitleId} aria-describedby={helpDescriptionId} maxWidth="xs" fullWidth>
        <DialogTitle id={helpTitleId}>{t('aboutTitle', { name: t('productName') })}</DialogTitle>
        <DialogContent><DialogContentText id={helpDescriptionId}>{t('helpDescription')}</DialogContentText></DialogContent>
        <DialogActions><Button onClick={() => setHelpOpen(false)}>{t('close')}</Button></DialogActions>
      </Dialog>
    </Stack>
  )
}
