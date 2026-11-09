import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#6750a4' },
        secondary: { main: '#625b71', light: '#e8def8' },
        text: { primary: '#1d1b20', secondary: '#49454f' },
        background: { default: '#ffffff', paper: '#ffffff' },
        divider: '#cac4d0',
      },
    },
    dark: {
      palette: {
        primary: { main: '#d0bcff', contrastText: '#381e72' },
        secondary: { main: '#ccc2dc', light: '#4a4458', contrastText: '#332d41' },
        text: { primary: '#e6e0e9', secondary: '#cac4d0' },
        background: { default: '#141218', paper: '#1d1b20' },
        divider: '#49454f',
      },
    },
  },
  typography: {
    button: { textTransform: 'none' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 24 } } },
    MuiToggleButton: { styleOverrides: { root: { textTransform: 'none' } } },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: ({ theme }) => ({
          borderColor: '#79747e',
          ...theme.applyStyles('dark', { borderColor: '#938f99' }),
        }),
      },
    },
  },
})

export default theme
