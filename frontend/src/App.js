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
import SearchScreen from './screens/SearchScreen';
import AdminRoute from './components/AdminRoute';
import DashboardScreen from './screens/DashBoardScreen';
import ProductListScreen from './screens/ProductListScreen';
import 'react-confirm-alert/src/react-confirm-alert.css';
import ProductEditScreen from './screens/ProductEditScreen';
import OrderListScreen from './screens/OrderListScreen';
import UserListScreen from './screens/UserListScreen';
import UserEditScreen from './screens/UserEditScreen';
import AiChat from './components/AiChat';

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
            <Route path="/search" element={<SearchScreen />} />

            <Route
              path="/orderhistory"
              element={<OrderHistoryScreen />}
            ></Route>

            {}
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <DashboardScreen />
                </AdminRoute>
              }
            ></Route>

            <Route
              path="/admin/products"
              element={
                <AdminRoute>
                  <ProductListScreen />
                </AdminRoute>
              }
            ></Route>

            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <OrderListScreen />
                </AdminRoute>
              }
            ></Route>

            <Route
              path="/admin/product/:id"
              element={
                <AdminRoute>
                  <ProductEditScreen />
                </AdminRoute>
              }
            ></Route>

            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <UserListScreen />
                </AdminRoute>
              }
            ></Route>

            <Route
              path="/admin/user/:id"
              element={
                <AdminRoute>
                  <UserEditScreen />
                </AdminRoute>
              }
            ></Route>
          </Routes>

          <div>
            <AiChat />
          </div>
        </main>
        <footer className="footer">
          &copy; {new Date().getFullYear()} ShopFusion. All rights reserved.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
