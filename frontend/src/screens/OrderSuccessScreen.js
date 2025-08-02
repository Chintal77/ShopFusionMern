// src/screens/OrderSuccessScreen.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../OrderSuccessScreen.css';

function OrderSuccessScreen() {
  return (
    <div className="success-container">
      <h1 className="success-title">🎉 Order Placed Successfully!</h1>
      <p className="success-message">Thank you for shopping with ShopFusion.</p>
      <Link to="/" className="go-home-btn">
        🏠 Go to Home
      </Link>
    </div>
  );
}

export default OrderSuccessScreen;
