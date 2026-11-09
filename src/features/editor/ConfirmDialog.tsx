import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

interface ConfirmDialogProps {
  title: string
  description: string
  destructive: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({ title, description, destructive, onConfirm, onClose }: ConfirmDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const descriptionId = useId()
  const cancel = useRef<HTMLButtonElement>(null)
  return (
    <Dialog open role="alertdialog" onClose={onClose} aria-labelledby={titleId} aria-describedby={descriptionId} maxWidth="xs" fullWidth
      slotProps={{ transition: { onEntered: () => cancel.current?.focus() } }}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent><DialogContentText id={descriptionId}>{description}</DialogContentText></DialogContent>
      <DialogActions>
        <Button ref={cancel} autoFocus onClick={onClose}>{t('cancel')}</Button>
        <Button variant="contained" color={destructive ? 'error' : 'primary'} onClick={onConfirm}>{t(destructive ? 'delete' : 'confirm')}</Button>
      </DialogActions>
    </Dialog>
  )
}
