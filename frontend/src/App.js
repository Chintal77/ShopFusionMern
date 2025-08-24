import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import 'react-confirm-alert/src/react-confirm-alert.css';

import HomeScreen from './screens/HomeScreen';
import ProductScreen from './screens/ProductScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import Header from './components/Header';
import OrderSuccessScreen from './screens/OrderSuccessScreen';
import PaymentMethodScreen from './screens/PaymentMethodScreen';
import OrderScreen from './screens/MyOrdersScreen';
import OrderHistoryScreen from './screens/OrderHistory';
import ProfileScreen from './screens/ProfileScreen';
import SearchScreen from './screens/SearchScreen';
import DashboardScreen from './screens/DashBoardScreen';
import ProductListScreen from './screens/ProductListScreen';
import ProductEditScreen from './screens/ProductEditScreen';
import OrderListScreen from './screens/OrderListScreen';
import UserListScreen from './screens/UserListScreen';
import UserEditScreen from './screens/UserEditScreen';
import AiChat from './components/AiChat';

import { Store } from './Store';
import AdminRoute from './components/AdminRoute';
import SellerRoute from './components/SellerRoute';
import ProtectedRoute from './components/ProtectedRoute'; // customer route

import { ToastContainer } from 'react-toastify';
import AuthenticatedRoute from './components/AuthenticatedRoute';

function App() {
  const { state } = useContext(Store);
  const { userInfo } = state;

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
            {/* Public Routes */}
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
            <Route path="/search" element={<SearchScreen />} />

            {/* Customer Routes */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CartScreen
                    cartItems={cartItems}
                    setCartItems={setCartItems}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutScreen
                    cartItems={cartItems}
                    setCartItems={setCartItems}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <ProtectedRoute>
                  <PaymentMethodScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order/:id"
              element={
                <ProtectedRoute>
                  <OrderScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order-success"
              element={
                <ProtectedRoute>
                  <OrderSuccessScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <AuthenticatedRoute>
                  <ProfileScreen />
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/orderhistory"
              element={
                <ProtectedRoute>
                  <OrderHistoryScreen />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <DashboardScreen />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminRoute>
                  <ProductListScreen />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <OrderListScreen />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/product/:id"
              element={
                <AdminRoute>
                  <ProductEditScreen />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <UserListScreen />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/user/:id"
              element={
                <AdminRoute>
                  <UserEditScreen />
                </AdminRoute>
              }
            />

            {/* Seller Routes */}
            <Route
              path="/seller/dashboard"
              element={
                <SellerRoute>
                  <div>Seller Dashboard</div>
                  {/* Replace with SellerDashboardScreen if exists */}
                </SellerRoute>
              }
            />
          </Routes>

          <AiChat />
        </main>

        <footer className="footer">
          &copy; {new Date().getFullYear()} ShopFusion. All rights reserved.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
