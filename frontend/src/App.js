import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HomeScreen from './screens/HomeScreen';
import 'bootstrap/dist/css/bootstrap.min.css';
import ProductScreen from './screens/ProductScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import Header from './components/Header'; // ✅ import Header

import OrderSuccessScreen from './screens/OrderSuccessScreen';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PaymentMethodScreen from './screens/PaymentMethodScreen';
import OrderScreen from './screens/MyOrdersScreen';
import OrderHistoryScreen from './screens/OrderHistory';
import ProfileScreen from './screens/ProfileScreen';

function App() {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('cartItems');
    return saved ? JSON.parse(saved) : {};
  });

  const [, setClientId] = useState(null);

  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const response = await fetch('/api/keys/paypal');
        const data = await response.text();
        setClientId(data);
      } catch (error) {
        console.error('Failed to fetch PayPal client ID:', error);
      }
    };
    fetchClientId();
  }, []);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  return (
    <BrowserRouter>
      <div className="app-container">
        <ToastContainer position="top-center" autoClose={3000} limit={1} />
        <Header cartItems={cartItems} />
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <HomeScreen cartItems={cartItems} setCartItems={setCartItems} />
              }
            />
            <Route
              path="/product/:slug"
              element={
                <ProductScreen
                  cartItems={cartItems}
                  setCartItems={setCartItems}
                />
              }
            />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="/payment" element={<PaymentMethodScreen />} />
            <Route
              path="/cart"
              element={
                <CartScreen cartItems={cartItems} setCartItems={setCartItems} />
              }
            />
            <Route
              path="/checkout"
              element={
                <CheckoutScreen
                  cartItems={cartItems}
                  setCartItems={setCartItems}
                />
              }
            />
            <Route path="/order/:id" element={<OrderScreen />}></Route>
            <Route path="/order-success" element={<OrderSuccessScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />

            <Route
              path="/orderhistory"
              element={<OrderHistoryScreen />}
            ></Route>
          </Routes>
        </main>
        <footer className="footer">
          &copy; {new Date().getFullYear()} ShopFusion. All rights reserved.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
