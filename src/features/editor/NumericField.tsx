import { useState } from 'react'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'

interface NumericFieldProps {
  label: string
  imageName: string
  value: number
  crop?: boolean
  disabled?: boolean
  commit: (value: number) => boolean
}

export default function NumericField({ label, imageName, value, crop = false, disabled = false, commit }: NumericFieldProps) {
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
      if (finished) setError(crop ? 'Enter a non-negative whole pixel value.' : 'Enter a whole pixel value.')
      return
    }
    if (number !== value && !commit(number)) {
      setError(crop ? 'Crop must leave at least one pixel on each axis.' : 'This offset is outside the supported range.')
      return
    }
    if (finished) setDraft(String(number))
  }

  return (
    <TextField
      fullWidth disabled={disabled} label={label} value={draft} type="number" error={Boolean(error)} helperText={error || undefined}
      onChange={event => apply(event.target.value)} onBlur={() => apply(draft, true)}
      onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.querySelector('input')?.blur() }}
      slotProps={{
        input: { endAdornment: <InputAdornment position="end">px</InputAdornment> },
        htmlInput: { 'aria-label': `${label}: ${imageName}`, step: 1, ...(crop ? { min: 0 } : {}) },
      }}
    />
  )
}
