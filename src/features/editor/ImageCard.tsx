import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import Delete from '@mui/icons-material/Delete'
import RotateRight from '@mui/icons-material/RotateRight'
import type { DemoImage } from './demo'

const fields = [
  ['X offset', -10], ['Y offset', -200],
  ['Top crop', 50], ['Bottom crop', 0],
  ['Left crop', 0], ['Right crop', 0],
] as const

export default function ImageCard({ image }: { image: DemoImage }) {
  return (
    <Paper component="li" variant="outlined" aria-label={image.name} sx={{ listStyle: 'none', p: 1.5, borderRadius: 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <Box component="img" src={image.src} alt={`Thumbnail of ${image.name}`} sx={{ width: 48, height: 48, objectFit: 'cover', objectPosition: 'top', bgcolor: 'grey.200', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap title={image.name}>{image.name}</Typography>
          <Typography variant="caption" color="text.secondary">{image.width} × {image.height} px</Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {[
            { label: 'Move up', icon: <KeyboardArrowUp fontSize="small" /> },
            { label: 'Move down', icon: <KeyboardArrowDown fontSize="small" /> },
            { label: 'Remove image', icon: <Delete fontSize="small" /> },
          ].map(action => (
            <Tooltip key={action.label} title={`${action.label} (not available in UI preview)`}>
              <span><IconButton disabled size="small" aria-label={`${action.label}: ${image.name}`} sx={{ bgcolor: 'action.hover' }}>{action.icon}</IconButton></span>
            </Tooltip>
          ))}
        </Stack>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
        {fields.map(([label, value]) => (
          <Stack key={label} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              fullWidth label={label} value={value} type="number"
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: <InputAdornment position="end">px</InputAdornment>,
                },
                htmlInput: { 'aria-label': `${label}: ${image.name}` },
              }}
            />
          </Stack>
        ))}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            select fullWidth disabled label="Rotation" value={0}
            slotProps={{ select: { SelectDisplayProps: { 'aria-label': `Rotation: ${image.name}`, 'aria-labelledby': undefined } } }}
          >
            {[0, 90, 180, 270].map(angle => <MenuItem key={angle} value={angle}>{angle}°</MenuItem>)}
          </TextField>
          <Tooltip title="Rotate 90° (not available in UI preview)">
            <span><IconButton disabled aria-label={`Rotate 90°: ${image.name}`} size="small" sx={{ border: 1, borderColor: 'divider' }}><RotateRight fontSize="small" /></IconButton></span>
          </Tooltip>
        </Stack>
      </Box>
    </Paper>
  )
}
