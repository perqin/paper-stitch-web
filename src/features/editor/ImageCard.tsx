import { memo } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
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
import NumericField from './NumericField'
import { editorStore } from './store'
import type { ImageRecord, Rotation } from './model'

interface ImageCardProps {
  image: ImageRecord
  previewUrl: string | undefined
  first: boolean
  last: boolean
  onRemove: (id: string) => void
}

export default memo(function ImageCard({ image, previewUrl, first, last, onRemove }: ImageCardProps) {
  function commit(group: 'offset' | 'crop', key: string, value: number) {
    const current = editorStore.getState().images.find(item => item.id === image.id)
    if (!current) return false
    return editorStore.getState().updateImage(image.id, { [group]: { ...current[group], [key]: value } })
  }
  return (
    <Paper component="li" variant="outlined" aria-label={image.name} sx={{ listStyle: 'none', p: 1.5, borderRadius: 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <Box component="img" src={previewUrl} alt={`Thumbnail of ${image.name}`} sx={{ width: 48, height: 48, objectFit: 'cover', objectPosition: 'top', bgcolor: 'grey.200', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap title={image.name}>{image.name}</Typography>
          <Typography variant="caption" color="text.secondary">{image.originalSize.width} × {image.originalSize.height} px</Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {[
            { label: 'Move up', icon: <KeyboardArrowUp fontSize="small" />, disabled: first, run: () => editorStore.getState().moveImage(image.id, 'up') },
            { label: 'Move down', icon: <KeyboardArrowDown fontSize="small" />, disabled: last, run: () => editorStore.getState().moveImage(image.id, 'down') },
            { label: 'Remove image', icon: <Delete fontSize="small" />, disabled: false, run: () => onRemove(image.id) },
          ].map(action => (
            <Tooltip key={action.label} title={action.label}>
              <span><IconButton disabled={action.disabled} onClick={action.run} size="small" aria-label={`${action.label}: ${image.name}`} sx={{ bgcolor: 'action.hover' }}>{action.icon}</IconButton></span>
            </Tooltip>
          ))}
        </Stack>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
        {(['x', 'y'] as const).map(axis => (
          <NumericField key={axis} label={`${axis.toUpperCase()} offset`} imageName={image.name} value={image.offset[axis]}
            commit={value => commit('offset', axis, value)} />
        ))}
        {(['top', 'bottom', 'left', 'right'] as const).map(edge => (
          <NumericField key={edge} label={`${edge[0].toUpperCase()}${edge.slice(1)} crop`} imageName={image.name} value={image.crop[edge]} crop
            commit={value => commit('crop', edge, value)} />
        ))}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            select fullWidth label="Rotation" value={image.rotationDeg}
            onChange={event => editorStore.getState().updateImage(image.id, { rotationDeg: Number(event.target.value) as Rotation })}
            slotProps={{ select: { SelectDisplayProps: { 'aria-label': `Rotation: ${image.name}`, 'aria-labelledby': undefined } } }}
          >
            {[0, 90, 180, 270].map(angle => <MenuItem key={angle} value={angle}>{angle}°</MenuItem>)}
          </TextField>
          <Tooltip title="Rotate 90° clockwise">
            <IconButton onClick={() => editorStore.getState().updateImage(image.id, { rotationDeg: ((image.rotationDeg + 90) % 360) as Rotation })} aria-label={`Rotate 90°: ${image.name}`} size="small" sx={{ border: 1, borderColor: 'divider' }}><RotateRight fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Paper>
  )
})
