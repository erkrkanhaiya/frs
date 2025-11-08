import '../styles/globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../lib/theme'

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </AuthProvider>
  )
}
