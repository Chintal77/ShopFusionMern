import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import data from '../data'; // Ensure correct relative path

function Header() {
  const [userInfo, setUserInfo] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const uniqueCategories = [
    ...new Set(data.products.map((product) => product.category)),
  ];

  return (
    <>
      {/* Sidebar */}
      <div
        className={`position-fixed top-0 start-0 bg-light shadow-lg h-100 p-3 transition ${
          showSidebar ? 'd-block' : 'd-none'
        }`}
        style={{ width: '250px', zIndex: 1040 }}
      >
        <h5 className="mb-3">Categories</h5>
        <button
          className="btn btn-sm btn-outline-secondary mb-3"
          onClick={() => setShowSidebar(false)}
        >
          Close ✖
        </button>
        <ul className="list-group">
          {uniqueCategories.map((category) => (
            <li
              key={category}
              className="list-group-item list-group-item-action"
              onClick={() => {
                navigate(`/category/${encodeURIComponent(category)}`);
                setShowSidebar(false);
              }}
              style={{ cursor: 'pointer' }}
            >
              {category}
            </li>
          ))}
        </ul>
      </div>

      {/* Header */}
      <header className="header bg-dark py-3 px-4 text-white d-flex justify-content-between align-items-center">
        {/* Sidebar toggle */}
        <button
          className="btn btn-outline-light me-3"
          onClick={() => setShowSidebar(true)}
        >
          ☰
        </button>

        <Link
          to="/"
          className="text-white fs-4 fw-bold text-decoration-none me-4"
        >
          🛍️ ShopFusion
        </Link>

        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="d-flex flex-grow-1 mx-4"
          style={{ maxWidth: '500px' }}
        >
          <input
            type="text"
            placeholder="Search products..."
            className="form-control me-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn btn-outline-light" type="submit">
            🔍
          </button>
        </form>

        {/* Right Nav */}
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
                {userInfo.isAdmin ? '👑' : '👋'} <small>{userInfo.name}</small>
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
                        onClick={() => navigate('/admin/reports')}
                      >
                        📊 Reports
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate('/profile')}
                      >
                        ⚙️ Profile Settings
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
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => navigate('/profile')}
                      >
                        ⚙️ Profile Settings
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
        </nav>
      </header>
    </>
  );
}

export default Header;
