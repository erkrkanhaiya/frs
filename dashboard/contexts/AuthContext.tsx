import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface AuthContextType {
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  loading: true,
  login: async () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for token in localStorage on mount
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!res.ok) throw new Error('Login failed');
      
      const data = await res.json();
      localStorage.setItem('authToken', data.access_token);
      setToken(data.access_token);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function AuthenticatedComponent(props: P) {
    const { token, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !token && router.pathname !== '/login') {
        router.push('/login');
      }
    }, [loading, token, router]);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!token && router.pathname !== '/login') {
      return null;
    }

    return <Component {...props} />;
  };
}