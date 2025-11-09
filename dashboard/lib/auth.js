import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export function useAuth() {
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken')
    if (storedToken) {
      setToken(storedToken)
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      const res = await fetch('/api/login', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let data
        try { data = JSON.parse(text) } catch { data = { raw: text } }
        const reason = data?.error || 'Login failed'
        const detail = data?.detail || data?.upstream?.detail || data?.raw || ''
        const apiBase = data?.apiBase || ''
        const message = [reason, apiBase ? `(API: ${apiBase})` : '', detail ? `- ${detail}` : '']
          .filter(Boolean).join(' ')
        throw new Error(message)
      }
      
      const data = await res.json()
      localStorage.setItem('authToken', data.access_token)
      setToken(data.access_token)
      return true
    } catch (error) {
      console.error('Login error:', error)
      // Surface a user-friendly message; keep return boolean for caller
      alert(`Login error: ${error?.message || error}`)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    setToken(null)
    router.push('/login')
  }

  return { token, loading, login, logout }
}

export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { token, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !token && router.pathname !== '/login') {
        router.push('/login')
      }
    }, [loading, token, router])

    if (loading) {
      return <div>Loading...</div>
    }

    if (!token && router.pathname !== '/login') {
      return null
    }

    return <Component {...props} />
  }
}