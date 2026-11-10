import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Portal from '@mui/material/Portal'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Add from '@mui/icons-material/Add'

export default function ImageDropOverlay({ onFiles }: { onFiles: (files: File[]) => void }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(false)

  useEffect(() => {
    let depth = 0
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files')
    const reset = () => { depth = 0; setActive(false) }
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth++
      setActive(true)
    }
    const over = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      event.dataTransfer!.dropEffect = 'copy'
      depth = Math.max(1, depth)
      setActive(true)
    }
    const leave = () => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setActive(false)
    }
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      reset()
      // Read the protected drag data synchronously, before the event returns.
      onFiles(Array.from(event.dataTransfer!.files))
    }
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') reset() }
    window.addEventListener('dragenter', enter, true)
    window.addEventListener('dragover', over, true)
    window.addEventListener('dragleave', leave, true)
    window.addEventListener('drop', drop, true)
    window.addEventListener('dragend', reset)
    window.addEventListener('blur', reset)
    window.addEventListener('keydown', keydown)
    return () => {
      window.removeEventListener('dragenter', enter, true)
      window.removeEventListener('dragover', over, true)
      window.removeEventListener('dragleave', leave, true)
      window.removeEventListener('drop', drop, true)
      window.removeEventListener('dragend', reset)
      window.removeEventListener('blur', reset)
      window.removeEventListener('keydown', keydown)
    }
  }, [onFiles])

  return active && <Portal>
    <Box role="status" sx={{
      position: 'fixed', inset: 0, zIndex: theme => theme.zIndex.tooltip + 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
      bgcolor: 'rgba(0, 0, 0, 0.55)', color: 'common.white', pointerEvents: 'none',
    }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', border: '2px dashed', borderColor: 'currentColor', borderRadius: 3, p: { xs: 3, sm: 6 } }}>
        <Add sx={{ fontSize: 48 }} />
        <Typography variant="h6">{t('dropImages')}</Typography>
      </Stack>
    </Box>
  </Portal>
}
