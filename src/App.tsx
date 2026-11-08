import { useState } from 'react'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Container component="main" maxWidth="sm" sx={{ py: { xs: 4, sm: 8 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
          <Typography variant="h4" component="h1">
            Paper Stitch
          </Typography>
          <Typography color="text.secondary">
            React + TypeScript, built with Material UI.
          </Typography>
          <Button variant="contained" onClick={() => setCount((count) => count + 1)}>
            Count is {count}
          </Button>
          <Link href="https://mui.com/material-ui/getting-started/">
            Material UI documentation
          </Link>
        </Stack>
      </Paper>
    </Container>
  )
}

export default App
