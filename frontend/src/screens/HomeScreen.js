import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useEffect, useReducer, useState, useCallback } from 'react';
import logger from 'use-reducer-logger';
import { toast } from 'react-toastify';
import '../HomeScreen.css';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { ...state, products: action.payload, loading: false, error: '' };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

function HomeScreen({ cartItems, setCartItems }) {
  const [{ loading, error, products }, dispatch] = useReducer(logger(reducer), {
    products: [],
    loading: true,
    error: '',
  });

  const [, setShowCart] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    dispatch({ type: 'FETCH_REQUEST' });
    try {
      const result = await axios.get('/api/products');
      dispatch({ type: 'FETCH_SUCCESS', payload: result.data });

      if (error) {
        setShowRecovery(true);
        setTimeout(() => setShowRecovery(false), 3000);
      }
    } catch (err) {
      dispatch({ type: 'FETCH_FAIL', payload: err.message });
    }
  }, [error]);

  useEffect(() => {
    document.title = 'ShopFusion';
    fetchData();
    const storedUser = localStorage.getItem('userInfo');
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    setUserInfo(parsedUser);

    // Load user-specific cart items safely
    if (parsedUser?.email) {
      const storedCart = localStorage.getItem(`cartItems_${parsedUser.email}`);
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart);
          setCartItems(Array.isArray(parsedCart) ? parsedCart : []);
        } catch {
          setCartItems([]);
        }
      }
    }
  }, [fetchData, setCartItems]);

  useEffect(() => {
    if (error) {
      const retryInterval = setInterval(() => {
        fetchData();
      }, 5000);
      return () => clearInterval(retryInterval);
    }
  }, [error, fetchData]);

  const handleAddToCart = async (product) => {
    if (!userInfo) {
      toast.warn('⚠️ Please login to add items to your cart.', {
        position: 'top-center',
        theme: 'colored',
      });
      navigate('/login?redirect=/');
      return;
    }

    try {
      const { data } = await axios.get(`/api/products/${product._id}`);

      const existingCart = Array.isArray(cartItems) ? cartItems : [];
      const existingIndex = existingCart.findIndex(
        (item) => item.slug === product.slug
      );

      let updatedCart;

      if (existingIndex !== -1) {
        const existingItem = existingCart[existingIndex];
        if (existingItem.quantity >= data.countInStock) {
          alert('❌ Cannot add more. Stock limit reached!');
          return;
        }

        updatedCart = [...existingCart];
        updatedCart[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + 1,
        };
      } else {
        const newItem = {
          name: product.name,
          slug: product.slug,
          image: product.image,
          price: product.price,
          quantity: 1,
          countInStock: product.countInStock,
          product: product._id, // ✅ critical field
        };

        updatedCart = [...existingCart, newItem];
      }

      setCartItems(updatedCart);
      localStorage.setItem(
        `cartItems_${userInfo.email}`,
        JSON.stringify(updatedCart)
      );

      window.dispatchEvent(new Event('storage'));
      setShowCart(true);
    } catch (err) {
      alert('⚠️ Error checking stock. Please try again later.');
      console.error(err);
    }
  };

  return (
    <div className="container">
      <main>
        <h1 className="heading">Featured Products</h1>

        {showRecovery && (
          <div className="recovery-message">
            ✅ We're back online! Products loaded successfully.
          </div>
        )}

        <div className="row">
          {loading ? (
            <p className="message">
              Products are loading from backend, please wait...
            </p>
          ) : error ? (
            <div className="error-box">
              <h2>😓 Oops! Something went wrong</h2>
              <p>
                Our servers are currently unreachable or experiencing issues.
              </p>
              <p>Please hang tight while we retry...</p>
            </div>
          ) : (
            products.map((product) => {
              const discountMatch = product.badge?.match(/(\d+)%/);
              const discountPercentage = discountMatch
                ? parseInt(discountMatch[1])
                : 0;
              const discountAmount = Math.round(
                (product.price * discountPercentage) / 100
              );
              const finalPrice = product.price - discountAmount;

              const currentQty = Array.isArray(cartItems)
                ? cartItems.find((item) => item.slug === product.slug)
                    ?.quantity || 0
                : 0;

              return (
                <div
                  className="col-sm-6 col-md-4 col-lg-3 mb-4"
                  key={product.slug}
                >
                  <div className="card h-100 shadow-sm position-relative border-0 hover-shadow transition">
                    {product.badge && (
                      <span className="badge bg-danger position-absolute top-0 start-0 m-2 rounded-pill shadow">
                        {typeof product.badge === 'string'
                          ? product.badge
                          : `${product.badge}% OFF`}
                      </span>
                    )}

                    <img
                      src={product.image}
                      alt={product.name}
                      className="card-img-top img-fluid rounded-top"
                      style={{ height: '400px', objectFit: 'cover' }}
                    />

                    <div className="card-body d-flex flex-column bg-light rounded-bottom">
                      <h5 className="card-title text-truncate mb-2">
                        <Link
                          to={`/product/${product._id}`}
                          className="text-decoration-none text-dark fw-semibold"
                        >
                          {product.name}
                        </Link>
                      </h5>

                      <p className="mb-1">
                        <span className="text-muted text-decoration-line-through me-2">
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                        <span className="fw-bold text-success">
                          ₹{finalPrice.toLocaleString('en-IN')}
                        </span>
                      </p>

                      <p className="text-danger small mb-1">
                        You save ₹{discountAmount.toLocaleString('en-IN')}
                      </p>

                      <p className="mb-2">
                        ⭐ {product.rating}{' '}
                        <span className="text-muted small">
                          ({product.numReviews} reviews)
                        </span>
                      </p>

                      <button
                        className={`btn mt-auto fw-semibold ${
                          product.countInStock === 0
                            ? 'btn-outline-secondary'
                            : currentQty >= product.countInStock
                            ? 'btn-outline-warning'
                            : 'btn-outline-primary'
                        }`}
                        disabled={
                          product.countInStock === 0 ||
                          currentQty >= product.countInStock
                        }
                        onClick={() => handleAddToCart(product)}
                        title={
                          product.countInStock === 0
                            ? 'Out of stock'
                            : currentQty >= product.countInStock
                            ? 'You have reached the max quantity available.'
                            : ''
                        }
                      >
                        {product.countInStock === 0
                          ? 'Out of Stock'
                          : currentQty >= product.countInStock
                          ? 'Limit Reached'
                          : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

export default HomeScreen;
