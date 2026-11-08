import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Download from '@mui/icons-material/Download'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'

export default function DownloadPanel() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [format, setFormat] = useState('PNG')

  return (
    <Box component="section" aria-label="Download" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2, pt: 2 }}>
      <Box>
        <Typography variant="body2">Output: 300 × 3000 px</Typography>
        <Typography variant="caption" color="text.secondary">Sample dimensions</Typography>
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
