import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import Add from '@mui/icons-material/Add'
import MoreVert from '@mui/icons-material/MoreVert'
import MoreHoriz from '@mui/icons-material/MoreHoriz'
import OpenWith from '@mui/icons-material/OpenWith'
import ReceiptLong from '@mui/icons-material/ReceiptLong'
import CanvasPreview from './CanvasPreview'
import DownloadPanel from './DownloadPanel'
import ImageCard from './ImageCard'
import { demoImages } from './demo'

export default function EditorShell() {
  const [mode, setMode] = useState('vertical')

  return (
    <Box component="main" sx={{
      display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 467px' },
      gap: 3, p: { xs: 2, md: 3 }, height: { md: '100dvh' }, minHeight: '100dvh',
    }}>
      <CanvasPreview />
      <Box component="aside" aria-label="Stitch controls" sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: { xs: 850, md: '100%' } }}>
        <Stack component="header" direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
          <Box sx={{ display: 'flex', p: 1, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}><ReceiptLong aria-hidden="true" /></Box>
          <Typography component="h1" variant="h6" sx={{ flex: 1 }}>Paper Stitch</Typography>
          <Chip size="small" label="UI preview" variant="outlined" />
        </Stack>
        <ToggleButtonGroup
          exclusive fullWidth value={mode} aria-label="Stitch mode"
          onChange={(_, value: string | null) => { if (value) setMode(value) }}
          sx={{ mb: 2.5, gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: 2, m: 0, '&:first-of-type': { borderRadius: '28px 8px 8px 28px' }, '&:last-of-type': { borderRadius: '8px 28px 28px 8px' } }, '& .MuiToggleButton-root': { py: 1.5, gap: 0.75, bgcolor: 'secondary.light' }, '& .MuiToggleButton-root.Mui-selected': { bgcolor: 'secondary.main', color: 'secondary.contrastText', '&:hover': { bgcolor: 'secondary.dark' } } }}
        >
          <ToggleButton value="vertical"><MoreVert fontSize="small" />Vertical</ToggleButton>
          <ToggleButton value="horizontal"><MoreHoriz fontSize="small" />Horizontal</ToggleButton>
          <ToggleButton value="freeform" disabled title="Freeform is not planned for the near term"><OpenWith fontSize="small" />Freeform</ToggleButton>
        </ToggleButtonGroup>
        <Stack component="section" aria-label="Canvas settings" direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2 }}>
          <Typography variant="body2">Canvas background</Typography>
          <Button disabled variant="outlined" size="small" startIcon={<Box sx={{ width: 16, height: 16, bgcolor: '#fff', border: 1, borderColor: 'divider', borderRadius: 0.5 }} />}>#FFFFFF</Button>
        </Stack>
        <Divider />
        <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>Sample images · editing and export are not connected.</Typography>
        <Box component="section" aria-label="Imported images" tabIndex={0} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, pb: 2, scrollbarGutter: 'stable' }}>
          <Stack component="ul" spacing={2.75} sx={{ m: 0, p: 0 }}>
            {demoImages.map(image => <ImageCard key={image.id} image={image} />)}
          </Stack>
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 3 }}>
            <Button disabled variant="contained" startIcon={<Add />} sx={{ bgcolor: 'secondary.light', color: 'secondary.main' }}>Add images</Button>
          </Box>
        </Box>
        <Divider />
        <DownloadPanel />
      </Box>
    </Box>
  )
}
