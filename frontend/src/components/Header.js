import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

function Header() {
  const [userInfo, setUserInfo] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

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

  const logoutHandler = () => {
    localStorage.removeItem('userInfo');
    setUserInfo(null);
    navigate('/');
  };

  return (
    <header className="header bg-dark py-3 px-4 text-white d-flex justify-content-between align-items-center">
      <Link to="/" className="text-white fs-4 fw-bold text-decoration-none">
        <span style={{ fontSize: '1.2rem' }}>🛍️</span> ShopFusion
      </Link>

      <nav className="d-flex align-items-center gap-4">
        <Link
          to="/cart"
          className="text-white text-decoration-none position-relative"
        >
          <span style={{ fontSize: '1rem' }}>🛒</span>
          {cartCount > 0 && (
            <span
              className="badge bg-danger rounded-pill position-absolute"
              style={{
                top: '4px',
                right: '-10px',
                fontSize: '0.7rem',
                padding: '2px 6px',
              }}
            >
              {cartCount}
            </span>
          )}
        </Link>

        {userInfo ? (
          <div className="dropdown">
            <button
              className="btn btn-sm btn-secondary dropdown-toggle"
              type="button"
              id="userDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span style={{ fontSize: '1rem' }}>
                {userInfo.isAdmin ? '👑' : '👋'}
              </span>{' '}
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
                      <span style={{ fontSize: '0.9rem' }}>🧾</span> Admin
                      Dashboard
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => navigate('/admin/products')}
                    >
                      <span style={{ fontSize: '0.9rem' }}>📦</span> Manage
                      Products
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => navigate('/admin/reports')}
                    >
                      <span style={{ fontSize: '0.9rem' }}>📊</span> Reports
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => navigate('/profile')}
                    >
                      <span style={{ fontSize: '0.9rem' }}>⚙️</span> Profile
                      Settings
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
                      <span style={{ fontSize: '0.9rem' }}>📜</span> My Orders
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => navigate('/profile')}
                    >
                      <span style={{ fontSize: '0.9rem' }}>⚙️</span> Profile
                      Settings
                    </button>
                  </li>
                </>
              )}
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <button
                  className="dropdown-item text-danger"
                  onClick={logoutHandler}
                >
                  <span style={{ fontSize: '0.9rem' }}>🚪</span> Logout
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <Link to="/login" className="btn btn-sm btn-outline-light">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}

export default Header;
