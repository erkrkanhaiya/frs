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

      if (!res.ok) throw new Error('Login failed')
      
      const data = await res.json()
      localStorage.setItem('authToken', data.access_token)
      setToken(data.access_token)
      return true
    } catch (error) {
      console.error('Login error:', error)
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