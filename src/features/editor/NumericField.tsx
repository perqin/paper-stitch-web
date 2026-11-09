import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TextField from '@mui/material/TextField'

interface NumericFieldProps {
  label: string
  shortLabel?: string
  imageName: string
  imageId: string
  value: number
  crop?: boolean
  disabled?: boolean
  commit: (value: number) => boolean
}

export default function NumericField({ label, shortLabel = label, imageName, imageId, value, crop = false, disabled = false, commit }: NumericFieldProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(String(value))
  const [error, setError] = useState('')
  const [previousValue, setPreviousValue] = useState(value)

  // Synchronize external edits without remounting the focused input on every step.
  if (previousValue !== value) {
    setPreviousValue(value)
    setDraft(String(value))
    setError('')
  }

  function apply(text: string, finished = false) {
    setDraft(text)
    setError('')
    const number = Number(text)
    if (!text.trim() || !Number.isSafeInteger(number) || (crop && number < 0)) {
      if (finished) setError(crop ? 'nonNegativeInteger' : 'integer')
      return
    }
    if (number !== value && !commit(number)) {
      setError(crop ? 'cropLeavesPixel' : 'offsetOutOfRange')
      return
    }
    if (finished) setDraft(String(number))
  }

  return (
    <TextField
      fullWidth size="small" disabled={disabled} label={shortLabel} value={draft} type="number" error={Boolean(error)} helperText={error ? t(error) : undefined}
      sx={{ minWidth: 0, '& .MuiInputBase-input': { px: 0.75, fontSize: 14, fontVariantNumeric: 'tabular-nums' }, '& .MuiInputLabel-root': { fontSize: 14 }, '& .MuiFormHelperText-root': { mx: 0 } }}
      onChange={event => apply(event.target.value)} onBlur={() => apply(draft, true)}
      onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.querySelector('input')?.blur() }}
      slotProps={{
        htmlInput: { 'aria-label': t('fieldLabel', { label, name: imageName }), 'data-image-id': imageId, step: 1, ...(crop ? { min: 0 } : {}) },
      }}
    />
  )
}
