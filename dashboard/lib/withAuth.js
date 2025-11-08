import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export function withAuth(WrappedComponent) {
  return function ProtectedRoute(props) {
    const { token, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !token) {
        router.replace('/login');
      }
    }, [token, loading, router]);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!token) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}