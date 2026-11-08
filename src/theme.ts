import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: { main: '#6750a4' },
    secondary: { main: '#625b71', light: '#e8def8' },
    text: { primary: '#1d1b20', secondary: '#49454f' },
    background: { default: '#ffffff', paper: '#ffffff' },
    divider: '#cac4d0',
  },
  typography: {
    button: { textTransform: 'none' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 24 } } },
    MuiToggleButton: { styleOverrides: { root: { textTransform: 'none' } } },
    MuiOutlinedInput: { styleOverrides: { notchedOutline: { borderColor: '#79747e' } } },
  },
})

export default theme
