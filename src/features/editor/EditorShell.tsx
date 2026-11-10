import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Fab from '@mui/material/Fab'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import Add from '@mui/icons-material/Add'
import RestartAlt from '@mui/icons-material/RestartAlt'
import MoreVert from '@mui/icons-material/MoreVert'
import MoreHoriz from '@mui/icons-material/MoreHoriz'
import CanvasPreview from './CanvasPreview'
import ConfirmDialog from './ConfirmDialog'
import DownloadPanel from './DownloadPanel'
import HeaderActions from './HeaderActions'
import ImageCard from './ImageCard'
import ImageDropOverlay from './ImageDropOverlay'
import { localizeError } from './localizedErrors'
import { editorStore, useEditorStore } from './store'
import { createImageResources } from './resources'
import type { StitchMode } from './model'

const imageResources = createImageResources(() => editorStore.getState())

type PendingAction = { kind: 'reset' } | { kind: 'mode'; mode: StitchMode } | { kind: 'remove'; id: string; name: string }

export default function EditorShell() {
  const { t } = useTranslation()
  const mode = useEditorStore(state => state.mode)
  const backgroundColor = useEditorStore(state => state.backgroundColor)
  const images = useEditorStore(state => state.images)
  const [resetGeneration, setResetGeneration] = useState(0)
  const [pendingImports, setPendingImports] = useState(0)
  const pendingImportCount = useRef(0)
  const importing = pendingImports > 0
  const [errors, setErrors] = useState<string[]>([])
  const [alignmentEnabled, setAlignmentEnabled] = useState(true)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const picker = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  function reset() {
    editorStore.getState().resetPositions()
    setResetGeneration(value => value + 1)
  }

  function changeMode(value: string | null) {
    if ((value === 'vertical' || value === 'horizontal') && value !== mode) {
      setPendingAction({ kind: 'mode', mode: value })
    }
  }

  const requestRemoval = useCallback((id: string) => {
    const image = editorStore.getState().images.find(image => image.id === id)
    if (image) setPendingAction({ kind: 'remove', id, name: image.name })
  }, [])

  function confirmAction() {
    if (!pendingAction) return
    if (pendingAction.kind === 'reset') reset()
    else if (pendingAction.kind === 'remove') imageResources.removeImage(pendingAction.id)
    else if (editorStore.getState().setMode(pendingAction.mode)) setResetGeneration(generation => generation + 1)
    setPendingAction(null)
  }

  const importFiles = useCallback(async (files: File[]) => {
    if (!files.length) return
    if (pendingImportCount.current === 0) setErrors([])
    pendingImportCount.current++
    setPendingImports(count => count + 1)
    try {
      const failures = await imageResources.importFiles(files)
      if (mounted.current) setErrors(previous => [...previous, ...failures])
    } catch {
      if (mounted.current) setErrors(previous => [...previous, 'Images could not be imported. Please try again.'])
    } finally {
      pendingImportCount.current--
      if (mounted.current) setPendingImports(count => count - 1)
    }
  }, [])

  return (
    <Box component="main" sx={{
      display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 467px' },
      gap: 3, p: { xs: 2, md: 3 }, height: { md: '100dvh' }, minHeight: '100dvh',
    }}>
      <CanvasPreview resources={imageResources} alignmentEnabled={alignmentEnabled} />
      <ImageDropOverlay onFiles={importFiles} />
      <Box component="aside" aria-label={t('stitchControls')} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: { xs: 850, md: '100%' } }}>
        <Stack component="header" direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2.5 }}>
          <Box component="img" src={`${import.meta.env.BASE_URL}paper-stitch.svg`} alt={t('iconAlt')} width={40} height={40} sx={{ display: 'block', flexShrink: 0 }} />
          <Typography component="h1" variant="h6" sx={{ flex: 1, minWidth: 0, fontSize: { xs: 18, sm: 20 }, whiteSpace: 'nowrap' }}>{t('productName')}</Typography>
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
            <Typography variant="body2" sx={{ flex: 1 }}>{t('background')}</Typography>
            <Button component="label" variant="outlined" size="small" sx={{ position: 'relative', minHeight: 36 }} startIcon={<Box sx={{ width: 16, height: 16, bgcolor: backgroundColor, border: 1, borderColor: 'divider', borderRadius: 0.5 }} />}>
              {backgroundColor}
              <Box component="input" type="color" aria-label={t('backgroundColor')} value={backgroundColor}
                onChange={event => editorStore.getState().setBackgroundColor(event.target.value)}
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </Button>
            <Button disabled={!images.length} onClick={() => setPendingAction({ kind: 'reset' })} variant="outlined" size="small" startIcon={<RestartAlt fontSize="small" />} title={t('resetHint')} sx={{ minHeight: 36, borderRadius: 1 }}>{t('reset')}</Button>
          </Stack>
          <FormControlLabel
            control={<Switch size="small" slotProps={{ input: { role: 'switch' } }} checked={alignmentEnabled} onChange={event => setAlignmentEnabled(event.target.checked)} />}
            label={t('translucentOverlaps')} title={t('overlapHint')}
            sx={{ m: 0, gap: 0.5, '& .MuiFormControlLabel-label': { typography: 'body2' } }}
          />
        </Stack>
        <Divider />

        <input ref={picker} hidden type="file" multiple accept="image/*" aria-label={t('importImages')} onChange={event => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          void importFiles(files)
        }} />
        <Box component="section" aria-label={t('importedImages')} tabIndex={0} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', py: 2, display: 'flex', flexDirection: 'column', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {errors.length > 0 && <Alert severity="error" closeText={t('close')} onClose={() => setErrors([])} sx={{ mb: 2 }}>{errors.map((error, index) => <Typography key={index} variant="body2">{localizeError(error, t)}</Typography>)}</Alert>}
          {!images.length ? <Stack spacing={2} sx={{ flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center', py: 3 }}>
            <Fab size="large" color="primary" disabled={importing} onClick={() => picker.current?.click()} aria-label={importing ? t('importing') : t('addImages')}><Add fontSize="large" /></Fab>
            <Typography variant="body2" color="text.secondary">{t('emptyImages')}</Typography>
          </Stack> : <>
            <Stack component="ul" spacing={2.75} sx={{ m: 0, p: 0, flexShrink: 0 }}>
              {images.map((image, index) => <ImageCard key={`${image.id}:${resetGeneration}`} image={image} previewUrl={imageResources.getUrl(image.id)} first={index === 0} last={index === images.length - 1} onRemove={requestRemoval} />)}
            </Stack>
            <Button disabled={importing} onClick={() => picker.current?.click()} fullWidth variant="contained" startIcon={<Add />} sx={{ mt: 2.75, flexShrink: 0 }}>{importing ? t('importing') : t('addImages')}</Button>
          </>}
        </Box>
        <Divider />
        <DownloadPanel resources={imageResources} />
      </Box>
      {pendingAction && <ConfirmDialog
        title={t(pendingAction.kind === 'remove' ? 'removeTitle' : pendingAction.kind === 'mode' ? 'changeModeTitle' : 'resetTitle')}
        description={pendingAction.kind === 'remove' ? t('removeWarning', { name: pendingAction.name }) : t('clearPositioning')}
        destructive={pendingAction.kind === 'remove'} onConfirm={confirmAction} onClose={() => setPendingAction(null)}
      />}
    </Box>
  )
}
