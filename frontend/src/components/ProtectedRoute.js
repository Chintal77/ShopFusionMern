// components/ProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { Store } from '../Store';

export default function ProtectedRoute({ children }) {
  const { state } = useContext(Store);
  const { userInfo } = state;

  if (!userInfo) {
    return <Navigate to="/login" />;
  }

  if (userInfo.isAdmin || userInfo.isSeller) {
    // Prevent admin/seller from accessing customer pages
    return <Navigate to="/" />;
  }

  return children;
}
