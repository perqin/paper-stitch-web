import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import Add from '@mui/icons-material/Add'
import RestartAlt from '@mui/icons-material/RestartAlt'
import MoreVert from '@mui/icons-material/MoreVert'
import MoreHoriz from '@mui/icons-material/MoreHoriz'
import OpenWith from '@mui/icons-material/OpenWith'
import CanvasPreview from './CanvasPreview'
import DownloadPanel from './DownloadPanel'
import ImageCard from './ImageCard'
import { editorStore, useEditorStore } from './store'
import { createImageResources } from './resources'

const imageResources = createImageResources(() => editorStore.getState())

export default function EditorShell() {
  const mode = useEditorStore(state => state.mode)
  const backgroundColor = useEditorStore(state => state.backgroundColor)
  const images = useEditorStore(state => state.images)
  const [resetGeneration, setResetGeneration] = useState(0)
  const [importing, setImporting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
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
      <CanvasPreview resources={imageResources} />
      <Box component="aside" aria-label="Stitch controls" sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: { xs: 850, md: '100%' } }}>
        <Stack component="header" direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
          <Box component="img" src={`${import.meta.env.BASE_URL}paper-stitch.svg`} alt="Paper Stitch icon" width={40} height={40} sx={{ display: 'block', flexShrink: 0 }} />
          <Typography component="h1" variant="h6" sx={{ flex: 1 }}>Paper Stitch</Typography>
        </Stack>
        <ToggleButtonGroup
          exclusive fullWidth value={mode} aria-label="Stitch mode"
          onChange={(_, value: string | null) => changeMode(value)}
          sx={{ mb: 2.5, gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: 2, m: 0, '&:first-of-type': { borderRadius: '28px 8px 8px 28px' }, '&:last-of-type': { borderRadius: '8px 28px 28px 8px' } }, '& .MuiToggleButton-root': { py: 1.5, gap: 0.75, bgcolor: 'secondary.light' }, '& .MuiToggleButton-root.Mui-selected': { bgcolor: 'secondary.main', color: 'secondary.contrastText', '&:hover': { bgcolor: 'secondary.dark' } } }}
        >
          <ToggleButton value="vertical"><MoreVert fontSize="small" />Vertical</ToggleButton>
          <ToggleButton value="horizontal"><MoreHoriz fontSize="small" />Horizontal</ToggleButton>
          <ToggleButton value="freeform" disabled title="Freeform is not planned for the near term"><OpenWith fontSize="small" />Freeform</ToggleButton>
        </ToggleButtonGroup>
        <Stack component="section" aria-label="Canvas settings" direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2 }}>
          <Typography variant="body2">Canvas background</Typography>
          <Button component="label" variant="outlined" size="small" sx={{ position: 'relative' }} startIcon={<Box sx={{ width: 16, height: 16, bgcolor: backgroundColor, border: 1, borderColor: 'divider', borderRadius: 0.5 }} />}>
            {backgroundColor}
            <Box component="input" type="color" aria-label="Canvas background color" value={backgroundColor}
              onChange={event => editorStore.getState().setBackgroundColor(event.target.value)}
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </Button>
        </Stack>
        <Divider />
        <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>First image anchored at origin · crop and rotate before placement.</Typography>
        <Stack direction="row" spacing={1.5} sx={{ pb: 2 }}>
          <Button disabled={!images.length} onClick={reset} fullWidth variant="outlined" startIcon={<RestartAlt />} title="Reset all offsets, crops, and rotations">Reset</Button>
          <Button disabled={importing} onClick={() => picker.current?.click()} fullWidth variant="contained" startIcon={<Add />}>{importing ? 'Importing…' : 'Add images'}</Button>
        </Stack>
        <input ref={picker} hidden type="file" multiple accept="image/*" aria-label="Import images" onChange={event => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          void importFiles(files)
        }} />
        <Box component="section" aria-label="Imported images" tabIndex={0} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, pb: 2, scrollbarGutter: 'stable' }}>
          {errors.length > 0 && <Alert severity="error" onClose={() => setErrors([])} sx={{ mb: 2 }}>{errors.map((error, index) => <Typography key={index} variant="body2">{error}</Typography>)}</Alert>}
          {!images.length && <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Add receipt scans to start stitching.</Typography>}
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
