import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import Add from '@mui/icons-material/Add'
import RestartAlt from '@mui/icons-material/RestartAlt'
import MoreVert from '@mui/icons-material/MoreVert'
import MoreHoriz from '@mui/icons-material/MoreHoriz'
import CanvasPreview from './CanvasPreview'
import DownloadPanel from './DownloadPanel'
import HeaderActions from './HeaderActions'
import ImageCard from './ImageCard'
import { localizeError } from './localizedErrors'
import { editorStore, useEditorStore } from './store'
import { createImageResources } from './resources'

const imageResources = createImageResources(() => editorStore.getState())

export default function EditorShell() {
  const { t } = useTranslation()
  const mode = useEditorStore(state => state.mode)
  const backgroundColor = useEditorStore(state => state.backgroundColor)
  const images = useEditorStore(state => state.images)
  const [resetGeneration, setResetGeneration] = useState(0)
  const [importing, setImporting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [alignmentEnabled, setAlignmentEnabled] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  function reset() {
    editorStore.getState().resetPositions()
    setResetGeneration(value => value + 1)
  }

  function changeMode(value: string | null) {
    if ((value === 'vertical' || value === 'horizontal') && value !== mode) {
      editorStore.getState().setMode(value)
      setResetGeneration(generation => generation + 1)
    }
  }

  async function importFiles(files: File[]) {
    if (!files.length) return
    setImporting(true)
    setErrors([])
    try {
      const failures = await imageResources.importFiles(files)
      if (mounted.current) setErrors(failures)
    } catch {
      if (mounted.current) setErrors(['Images could not be imported. Please try again.'])
    } finally {
      if (mounted.current) setImporting(false)
    }
  }

  return (
    <Box component="main" sx={{
      display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 467px' },
      gap: 3, p: { xs: 2, md: 3 }, height: { md: '100dvh' }, minHeight: '100dvh',
    }}>
      <CanvasPreview resources={imageResources} alignmentEnabled={alignmentEnabled} />
      <Box component="aside" aria-label={t('stitchControls')} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: { xs: 850, md: '100%' } }}>
        <Stack component="header" direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
          <Box component="img" src={`${import.meta.env.BASE_URL}paper-stitch.svg`} alt={t('iconAlt')} width={40} height={40} sx={{ display: 'block', flexShrink: 0 }} />
          <Typography component="h1" variant="h6" sx={{ flex: 1, minWidth: 0 }}>Paper Stitch</Typography>
          <HeaderActions />
        </Stack>
        <ToggleButtonGroup
          exclusive fullWidth value={mode} aria-label={t('stitchMode')}
          onChange={(_, value: string | null) => changeMode(value)}
          sx={{ mb: 2.5, gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: 2, m: 0, '&:first-of-type': { borderRadius: '28px 8px 8px 28px' }, '&:last-of-type': { borderRadius: '8px 28px 28px 8px' } }, '& .MuiToggleButton-root': { py: 1.5, gap: 0.75, bgcolor: 'secondary.light' }, '& .MuiToggleButton-root.Mui-selected': { bgcolor: 'secondary.main', color: 'secondary.contrastText', '&:hover': { bgcolor: 'secondary.dark' } } }}
        >
          <ToggleButton value="vertical"><MoreVert fontSize="small" />{t('vertical')}</ToggleButton>
          <ToggleButton value="horizontal"><MoreHoriz fontSize="small" />{t('horizontal')}</ToggleButton>
        </ToggleButtonGroup>
        <Stack component="section" aria-label={t('generalControls')} spacing={1} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ flex: 1 }}>{t('canvasBackground')}</Typography>
            <Button component="label" variant="outlined" size="small" sx={{ position: 'relative', minHeight: 36 }} startIcon={<Box sx={{ width: 16, height: 16, bgcolor: backgroundColor, border: 1, borderColor: 'divider', borderRadius: 0.5 }} />}>
              {backgroundColor}
              <Box component="input" type="color" aria-label={t('backgroundColor')} value={backgroundColor}
                onChange={event => editorStore.getState().setBackgroundColor(event.target.value)}
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </Button>
            <Button disabled={!images.length} onClick={reset} variant="outlined" aria-label={t('reset')} title={t('resetHint')} sx={{ width: 36, height: 36, minWidth: 36, p: 0, borderRadius: 1 }}><RestartAlt fontSize="small" /></Button>
          </Stack>
          <FormControlLabel
            control={<Checkbox size="small" checked={alignmentEnabled} onChange={event => setAlignmentEnabled(event.target.checked)} />}
            label={t('translucentOverlaps')} title={t('overlapHint')}
            sx={{ m: 0, '& .MuiCheckbox-root': { p: 0.5, mr: 0.5 }, '& .MuiFormControlLabel-label': { typography: 'body2' } }}
          />
        </Stack>
        <Divider />
        <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>{t('placementHint')}</Typography>
        <Stack direction="row" spacing={1.5} sx={{ pb: 2 }}>
          <Button disabled={importing} onClick={() => picker.current?.click()} fullWidth variant="contained" startIcon={<Add />}>{importing ? t('importing') : t('addImages')}</Button>
        </Stack>
        <input ref={picker} hidden type="file" multiple accept="image/*" aria-label={t('importImages')} onChange={event => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          void importFiles(files)
        }} />
        <Box component="section" aria-label={t('importedImages')} tabIndex={0} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pb: 2, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {errors.length > 0 && <Alert severity="error" closeText={t('close')} onClose={() => setErrors([])} sx={{ mb: 2 }}>{errors.map((error, index) => <Typography key={index} variant="body2">{localizeError(error, t)}</Typography>)}</Alert>}
          {!images.length && <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>{t('emptyImages')}</Typography>}
          <Stack component="ul" spacing={2.75} sx={{ m: 0, p: 0 }}>
            {images.map((image, index) => <ImageCard key={`${image.id}:${resetGeneration}`} image={image} previewUrl={imageResources.getUrl(image.id)} first={index === 0} last={index === images.length - 1} onRemove={imageResources.removeImage} />)}
          </Stack>
        </Box>
        <Divider />
        <DownloadPanel resources={imageResources} />
      </Box>
    </Box>
  )
}
