import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import { demoImages } from './demo'

export default function CanvasPreview() {
  return (
    <Box component="section" aria-label="Stitch preview" sx={{
      position: 'relative', overflow: 'hidden', bgcolor: '#b5b5b5',
      minWidth: 0, minHeight: { xs: 420, md: 0 }, height: '100%',
    }}>
      <Chip label="Sample preview" size="small" sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1, bgcolor: 'background.paper' }} />
      <Box aria-label="Static sample receipt composition" sx={{
        position: 'absolute', width: 377, height: '100%', left: '50%', transform: 'translateX(-50%)',
      }}>
        <Box component="img" src={demoImages[0].src} alt="First sample receipt scan" sx={{
          position: 'absolute', width: 377, height: 1891, maxWidth: 'none', left: 8, top: -1540,
        }} />
        <Box sx={{ position: 'absolute', left: 0, top: 133, width: 377, height: 1824, overflow: 'hidden' }}>
          <Box component="img" src={demoImages[1].src} alt="Second sample receipt scan" sx={{
            position: 'absolute', width: 377, height: 'auto', maxWidth: 'none', top: -23,
          }} />
        </Box>
      </Box>
    </Box>
  )
}
