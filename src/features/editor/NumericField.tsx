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

export default function NumericField(props: NumericFieldProps) {
  return <NumericInput key={props.value} {...props} />
}

function NumericInput({ label, imageName, value, crop = false, disabled = false, commit }: NumericFieldProps) {
  const [draft, setDraft] = useState(String(value))
  const [error, setError] = useState('')


  function finish() {
    const number = Number(draft)
    if (!draft.trim() || !Number.isSafeInteger(number) || (crop && number < 0)) {
      setError(crop ? 'Enter a non-negative whole pixel value.' : 'Enter a whole pixel value.')
      return
    }
    if (number !== value && !commit(number)) {
      setError(crop ? 'Crop must leave at least one pixel on each axis.' : 'This offset is outside the supported range.')
      return
    }
    setDraft(String(number))
    setError('')
  }

  return (
    <TextField
      fullWidth disabled={disabled} label={label} value={draft} type="number" error={Boolean(error)} helperText={error || undefined}
      onChange={event => { setDraft(event.target.value); setError('') }} onBlur={finish}
      onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.querySelector('input')?.blur() }}
      slotProps={{
        input: { endAdornment: <InputAdornment position="end">px</InputAdornment> },
        htmlInput: { 'aria-label': `${label}: ${imageName}`, step: 1, ...(crop ? { min: 0 } : {}) },
      }}
    />
  )
}
