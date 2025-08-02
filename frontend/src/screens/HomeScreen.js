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

        <div className="products">
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
                <div className="product-card" key={product.slug}>
                  {product.badge && (
                    <span className="badge">{product.badge}</span>
                  )}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                  />
                  <div className="product-info">
                    <h3 className="product-name">
                      <Link to={`/product/${product._id}`}>{product.name}</Link>
                    </h3>
                    <p className="product-price">
                      <span className="original-price">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>{' '}
                      <span className="final-price">
                        ₹{finalPrice.toLocaleString('en-IN')}
                      </span>
                    </p>
                    <p className="product-discount">
                      You save ₹{discountAmount.toLocaleString('en-IN')}
                    </p>
                    <p className="product-rating">
                      ⭐ {product.rating}{' '}
                      <span>({product.numReviews} reviews)</span>
                    </p>
                    <button
                      className={`btn-cart ${
                        product.countInStock === 0
                          ? 'btn-out'
                          : currentQty >= product.countInStock
                          ? 'btn-limit'
                          : 'btn-add'
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
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

export default HomeScreen;
