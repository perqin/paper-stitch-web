import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Download from '@mui/icons-material/Download'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import { useEditorStore } from './store'
import { calculateComposition } from './composition'

export default function DownloadPanel() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [format, setFormat] = useState('PNG')
  const images = useEditorStore(state => state.images)
  const mode = useEditorStore(state => state.mode)
  const result = useMemo(() => {
    try { return { size: calculateComposition(images, mode).outputSize, error: false } }
    catch { return { size: null, error: true } }
  }, [images, mode])

  return (
    <Box component="section" aria-label="Download" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2, pt: 2 }}>
      <Box>
        <Typography variant="body2" aria-label="Output dimensions" aria-live="polite">{result.error ? 'Output: out of range' : result.size ? `Output: ${result.size.width} × ${result.size.height} px` : 'Output: —'}</Typography>
        <Typography variant="caption" color="text.secondary">Download coming later</Typography>
      </Box>
      <ButtonGroup variant="contained" disableElevation aria-label="Download options" sx={{ flexShrink: 0, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
        <Button disabled startIcon={<Download />} sx={{ minHeight: 48 }}>Download {format}</Button>
        <Button
          aria-label="Choose download format" aria-haspopup="menu"
          aria-expanded={Boolean(anchor)} aria-controls={anchor ? 'download-formats' : undefined}
          onClick={event => setAnchor(event.currentTarget)} sx={{ px: 1, minWidth: '40px !important' }}
        ><KeyboardArrowDown /></Button>
      </ButtonGroup>
      <Menu id="download-formats" anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {['PNG', 'JPEG'].map(option => (
          <MenuItem key={option} selected={option === format} onClick={() => { setFormat(option); setAnchor(null) }}>{option}</MenuItem>
        ))}
      </Menu>
    </Box>
  )
}
