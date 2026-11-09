import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Download from '@mui/icons-material/Download'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import { editorStore, useEditorStore } from './store'
import { calculateComposition } from './composition'
import { exportImage } from './export'
import { localizeError } from './localizedErrors'
import type { ExportFormat } from './export'
import type { ImageResources } from './resources'
import type { RenderDocument } from './renderer'

export default function DownloadPanel({ resources }: { resources: ImageResources }) {
  const { t } = useTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [format, setFormat] = useState<ExportFormat>('PNG')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const images = useEditorStore(state => state.images)
  const mode = useEditorStore(state => state.mode)
  const result = useMemo(() => {
    try { return { size: calculateComposition(images, mode).outputSize, error: false } }
    catch { return { size: null, error: true } }
  }, [images, mode])

  async function download() {
    if (busy.current) return
    busy.current = true
    setExporting(true)
    setError('')
    let lease: ReturnType<ImageResources['acquire']> | undefined
    try {
      const state = editorStore.getState()
      const snapshot: RenderDocument = structuredClone({ images: state.images, mode: state.mode, backgroundColor: state.backgroundColor })
      lease = resources.acquire(snapshot.images.map(image => image.id))
      const blob = await exportImage(snapshot, lease.getSource, format)
      if (!mounted.current) return
      const url = URL.createObjectURL(blob)
      try {
        const link = document.createElement('a')
        link.href = url
        link.download = `paper-stitch.${format === 'PNG' ? 'png' : 'jpg'}`
        document.body.appendChild(link)
        try { link.click() } finally { link.remove() }
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'Unable to export image.')
    } finally {
      lease?.release()
      busy.current = false
      if (mounted.current) setExporting(false)
    }
  }

  return (
    <>
    <Box component="section" aria-label={t('download')} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2, pt: 2 }}>
      <Box>
        <Typography variant="body2" aria-label={t('outputDimensions')} aria-live="polite">{result.error ? t('outputOutOfRange') : result.size ? t('outputSize', result.size) : t('outputEmpty')}</Typography>
        <Typography variant="caption" color="text.secondary">{t('originalPixels')}</Typography>
      </Box>
      <ButtonGroup variant="contained" disableElevation aria-label={t('downloadOptions')} sx={{ flexShrink: 0, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
        <Button disabled={!result.size || result.error || exporting} onClick={() => { void download() }} startIcon={<Download />} sx={{ minHeight: 48 }}>{exporting ? t('exporting') : t('downloadFormat', { format })}</Button>
        <Button
          disabled={exporting}
          aria-label={t('chooseFormat')} aria-haspopup="menu"
          aria-expanded={Boolean(anchor)} aria-controls={anchor ? 'download-formats' : undefined}
          onClick={event => setAnchor(event.currentTarget)} sx={{ px: 1, minWidth: '40px !important' }}
        ><KeyboardArrowDown /></Button>
      </ButtonGroup>
      <Menu id="download-formats" anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {(['PNG', 'JPEG'] as const).map(option => (
          <MenuItem key={option} selected={option === format} onClick={() => { setFormat(option); setAnchor(null) }}>{option}</MenuItem>
        ))}
      </Menu>
    </Box>
    {error && <Alert severity="error" closeText={t('close')} onClose={() => setError('')} sx={{ mt: 1 }}>{localizeError(error, t)}</Alert>}
    </>
  )
}
