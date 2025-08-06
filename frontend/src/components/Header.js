import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import SearchBox from './SearchBox';

function Header() {
  const [userInfo, setUserInfo] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [sidebarIsOpen, setSidebarIsOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const updateCartCount = () => {
    const storedUser = localStorage.getItem('userInfo');
    const user = storedUser ? JSON.parse(storedUser) : null;
    setUserInfo(user);

    if (user) {
      const cartKey = `cartItems_${user.email}`;
      const storedCart = JSON.parse(localStorage.getItem(cartKey)) || {};
      const count = Object.values(storedCart).reduce((sum, item) => {
        if (typeof item === 'number') return sum + item;
        if (typeof item === 'object' && item.quantity)
          return sum + item.quantity;
        return sum;
      }, 0);
      setCartCount(count);
    } else {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    return () => window.removeEventListener('storage', updateCartCount);
  }, [location]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get(`/api/products/categories`);
        setCategories(data);
      } catch (err) {
        toast.error(getError(err));
      }
    };
    fetchCategories();
  }, []);

  const logoutHandler = () => {
    localStorage.removeItem('userInfo');
    setUserInfo(null);
    navigate('/');
    window.location.reload();
  };

  return (
    <>
      {/* Sidebar (Only for non-admin and not on login page) */}
      {!isLoginPage && !userInfo?.isAdmin && (
        <div
          className={`position-fixed top-0 start-0 bg-light shadow-lg h-100 p-3 transition ${
            sidebarIsOpen ? 'd-block' : 'd-none'
          }`}
          style={{ width: '250px', zIndex: 1040 }}
        >
          <h5 className="mb-3">Categories</h5>
          <button
            className="btn btn-sm btn-outline-secondary mb-3"
            onClick={() => setSidebarIsOpen(false)}
          >
            Close ✖
          </button>
          <ul className="list-group">
            {categories.map((category) => (
              <li
                key={category}
                className="list-group-item list-group-item-action"
                onClick={() => {
                  navigate(`/search?category=${encodeURIComponent(category)}`);
                  setSidebarIsOpen(false);
                }}
                style={{ cursor: 'pointer' }}
              >
                {category}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Header */}
      <header className="bg-dark py-3 px-4 text-white">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          {/* Left: Sidebar Toggle + Logo */}
          <div className="d-flex align-items-center gap-3">
            {!isLoginPage && !userInfo?.isAdmin && (
              <button
                className="btn btn-outline-light"
                onClick={() => setSidebarIsOpen(true)}
              >
                ☰
              </button>
            )}
            {userInfo?.isAdmin ? (
              <span className="text-white fs-4 fw-bold">🛍️ ShopFusion</span>
            ) : (
              <Link
                to="/"
                className="text-white fs-4 fw-bold text-decoration-none"
              >
                🛍️ ShopFusion
              </Link>
            )}
          </div>

          {/* Middle: SearchBox */}
          <div className="mx-auto">
            {!isLoginPage && !userInfo?.isAdmin && <SearchBox />}
          </div>

          {/* Right: Cart + User */}
          <div className="d-flex align-items-center gap-4">
            {userInfo && !userInfo?.isAdmin && (
              <Link
                to="/cart"
                className="text-white text-decoration-none position-relative"
              >
                🛒
                {cartCount > 0 && (
                  <span
                    className="badge bg-danger rounded-pill position-absolute"
                    style={{
                      top: '-8px',
                      right: '-10px',
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                    }}
                  >
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {userInfo ? (
              <div className="dropdown">
                <button
                  className="btn btn-sm btn-secondary dropdown-toggle"
                  type="button"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {userInfo.isAdmin ? '👑' : '👋'}{' '}
                  <small>{userInfo.name}</small>
                </button>
                <ul
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userDropdown"
                >
                  {userInfo.isAdmin ? (
                    <>
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={() => navigate('/admin/dashboard')}
                        >
                          🧾 Admin Dashboard
                        </button>
                      </li>
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={() => navigate('/admin/products')}
                        >
                          📦 Manage Products
                        </button>
                      </li>
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={() => navigate('/admin/orders')}
                        >
                          📜 Manage Orders
                        </button>
                      </li>
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={() => navigate('/admin/users')}
                        >
                          📜 Users
                        </button>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={() => navigate('/orderhistory')}
                        >
                          📜 My Orders
                        </button>
                      </li>
                    </>
                  )}
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => navigate('/profile')}
                    >
                      ⚙️ Profile Settings
                    </button>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <button
                      className="dropdown-item text-danger"
                      onClick={logoutHandler}
                    >
                      🚪 Logout
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <Link to="/login" className="btn btn-sm btn-outline-light">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
