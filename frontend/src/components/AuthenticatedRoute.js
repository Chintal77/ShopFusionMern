// components/AuthenticatedRoute.js
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { Store } from '../Store';

export default function AuthenticatedRoute({ children }) {
  const { state } = useContext(Store);
  const { userInfo } = state;

  if (!userInfo) {
    // Not logged in → redirect to login
    return <Navigate to="/login" />;
  }

  // Logged in → allow access
  return children;
}
