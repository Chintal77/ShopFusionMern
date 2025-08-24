import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Store } from '../Store';

const SellerRoute = ({ children }) => {
  const { state } = useContext(Store);
  const { userInfo } = state;

  if (!userInfo) {
    return <Navigate to="/login" replace />;
  }

  if (!userInfo.isSeller) {
    return (
      <Navigate
        to={userInfo.isAdmin ? '/admin/dashboard' : '/seller/daashboard'}
        replace
      />
    );
  }

  return children;
};

export default SellerRoute;
