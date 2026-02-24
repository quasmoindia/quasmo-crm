import { Navigate } from 'react-router-dom';
import { getStoredToken } from '../api/auth';
import { Login } from './Login';

export function Home() {
  const token = getStoredToken();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login />;
}
