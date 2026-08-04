import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from './ui';

export default function ProtectedRoute({ children, factoryOnly }: { children: ReactNode; factoryOnly?: boolean }) {
  const { profile, session, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner /></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (factoryOnly && !(profile?.role === 'factory_admin' || profile?.role === 'factory_manager')) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function FactoryRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute factoryOnly>{children}</ProtectedRoute>;
}
