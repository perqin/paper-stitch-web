import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
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
  const { t } = useTranslation()
  function commit(group: 'offset' | 'crop', key: string, value: number) {
    const current = editorStore.getState().images.find(item => item.id === image.id)
    if (!current) return false
    return editorStore.getState().updateImage(image.id, { [group]: { ...current[group], [key]: value } })
  }
  return (
    <Paper component="li" variant="outlined" aria-label={image.name} sx={{ listStyle: 'none', p: 1.5, borderRadius: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Box component="img" src={previewUrl} alt={t('thumbnail', { name: image.name })} sx={{ width: 48, height: 48, objectFit: 'cover', objectPosition: 'top', bgcolor: 'action.hover', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap title={image.name}>{image.name}</Typography>
          <Typography variant="caption" color="text.secondary">{t('pixelDimensions', image.originalSize)}</Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {[
            { label: t('moveUp'), icon: <KeyboardArrowUp fontSize="small" />, disabled: first, run: () => editorStore.getState().moveImage(image.id, 'up') },
            { label: t('moveDown'), icon: <KeyboardArrowDown fontSize="small" />, disabled: last, run: () => editorStore.getState().moveImage(image.id, 'down') },
            { label: t('removeImage'), icon: <Delete fontSize="small" />, disabled: false, run: () => onRemove(image.id) },
          ].map(action => (
            <Tooltip key={action.label} title={action.label}>
              <span><IconButton disabled={action.disabled} onClick={action.run} size="small" aria-label={t('fieldLabel', { label: action.label, name: image.name })} sx={{ bgcolor: 'action.hover' }}>{action.icon}</IconButton></span>
            </Tooltip>
          ))}
        </Stack>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', columnGap: 1, rowGap: 1.5 }}>
        {!first && (['x', 'y'] as const).map(axis => (
          <NumericField key={axis} label={t(`${axis}Offset`)} shortLabel={axis.toUpperCase()} imageName={image.name} imageId={image.id} value={image.offset[axis]}
            commit={value => commit('offset', axis, value)} />
        ))}
        <Stack role="group" aria-label={t('rotationControls', { name: image.name })} direction="row" spacing={1} sx={{ gridColumn: '3 / span 2', minWidth: 0, minHeight: 40, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Typography variant="body2" aria-label={t('fieldLabel', { label: t('rotation'), name: image.name })} aria-live="polite" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{t('rotationValue', { angle: image.rotationDeg })}</Typography>
          <Tooltip title={t('rotateClockwise')}>
            <IconButton onClick={() => editorStore.getState().updateImage(image.id, { rotationDeg: ((image.rotationDeg + 90) % 360) as Rotation })} aria-label={t('rotateAction', { name: image.name })} size="small" sx={{ border: 1, borderColor: 'divider' }}><RotateRight fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>
        {(['top', 'bottom', 'left', 'right'] as const).map(edge => (
          <NumericField key={edge} label={t(`${edge}Crop`)} shortLabel={t(edge)} imageName={image.name} imageId={image.id} value={image.crop[edge]} crop
            commit={value => commit('crop', edge, value)} />
        ))}
      </Box>
    </Paper>
  )
})
