import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../index.css';
import { useEffect, useReducer } from 'react';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { ...state, product: action.payload, loading: false };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const getLogger = () => {
  if (process.env.NODE_ENV === 'development') {
    return require('use-reducer-logger').default;
  }
  return (r) => r;
};

function ProductScreen({ cartItems, setCartItems }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  const logger = getLogger();
  const [{ product, loading, error }, dispatch] = useReducer(logger(reducer), {
    product: {},
    loading: true,
    error: '',
  });

  useEffect(() => {
    const fetchProduct = async () => {
      dispatch({ type: 'FETCH_REQUEST' });
      try {
        const result = await axios.get(`/api/products/${slug}`);
        dispatch({ type: 'FETCH_SUCCESS', payload: result.data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: err.message });
      }
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (product && product.name) {
      document.title = `ShopFusion | ${product.name}`;
    }
  }, [product]);

  const handleAddToCart = () => {
    if (!userInfo) {
      navigate(`/login?redirect=/product/${slug}`);
      return;
    }

    const existingItem = Array.isArray(cartItems)
      ? cartItems.find((item) => item.slug === product.slug)
      : null;

    const updatedCart = existingItem
      ? cartItems.map((item) =>
          item.slug === product.slug
            ? {
                ...item,
                quantity:
                  item.quantity < product.countInStock
                    ? item.quantity + 1
                    : item.quantity,
              }
            : item
        )
      : [
          ...(Array.isArray(cartItems) ? cartItems : []),
          {
            name: product.name,
            slug: product.slug,
            image: product.image,
            price: product.price,
            quantity: 1,
            countInStock: product.countInStock,
            product: product._id,
          },
        ];

    setCartItems(updatedCart);
    localStorage.setItem(
      `cartItems_${userInfo.email}`,
      JSON.stringify(updatedCart)
    );
    window.dispatchEvent(new Event('storage'));
  };

  const existingQty = Array.isArray(cartItems)
    ? cartItems.find((item) => item.slug === product.slug)?.quantity || 0
    : 0;

  if (loading) {
    return <div className="message">Loading product details...</div>;
  }

  if (error) {
    return (
      <div className="not-found">
        <h2>Oops! Product Not Found</h2>
        <p>
          The product you are looking for doesn’t exist or has been removed.
        </p>
        <Link to="/" className="back-home-btn">
          🔙 Go Back Home
        </Link>
      </div>
    );
  }

  const discountMatch = product.badge?.match(/(\d+)%/);
  const discountPercentage = discountMatch ? parseInt(discountMatch[1]) : 0;
  const discountAmount = Math.round((product.price * discountPercentage) / 100);
  const finalPrice = product.price - discountAmount;

  return (
    <section className="product-screen-container">
      <div className="product-image-container">
        <img
          src={product.image}
          alt={product.name}
          className="product-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/images/broken.png';
          }}
        />
        {product.badge && <span className="badge">{product.badge}</span>}
      </div>

      <div className="product-detail-info">
        <div className="product-header">
          <h1 className="product-name">{product.name}</h1>
        </div>

        <div className="product-rating">
          ⭐ {product.rating} ({product.numReviews} reviews)
        </div>

        <div className="product-price">
          <span className="price-final">₹{finalPrice.toLocaleString()}</span>{' '}
          <span className="price-original">
            ₹{product.price.toLocaleString()}
          </span>{' '}
          <span className="price-discount">({discountPercentage}% OFF)</span>
        </div>

        <p className="product-description">{product.description}</p>

        {product.highlights && (
          <ul className="product-highlights">
            {product.highlights.map((point, index) => (
              <li key={index}>🧵 {point}</li>
            ))}
          </ul>
        )}

        {product.sizeFit && (
          <div className="size-fit">
            <p>
              <strong>Size & Fit:</strong> {product.sizeFit}
            </p>
          </div>
        )}

        {product.specifications && (
          <table className="spec-table">
            <tbody>
              {Object.entries(product.specifications).map(([key, value]) => (
                <tr key={key}>
                  <td className="spec-key">{key.toUpperCase()}</td>
                  <td className="spec-value">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="extra-info">
          {product.brand && (
            <p>
              <strong>Brand:</strong> {product.brand}
            </p>
          )}
          {product.category && (
            <p>
              <strong>Category:</strong> {product.category}
            </p>
          )}
          {product.seller && (
            <p>
              <strong>Seller:</strong> {product.seller}
            </p>
          )}
          {product.delivery && (
            <p>
              <strong>Delivery:</strong> {product.delivery}
            </p>
          )}
          {product.returnPolicy && (
            <p>
              <strong>Return Policy:</strong> {product.returnPolicy}
            </p>
          )}
        </div>

        <p
          className={`stock ${
            product.countInStock > 0 ? 'in-stock' : 'out-of-stock'
          }`}
        >
          {product.countInStock > 0 ? '✅ In Stock' : '❌ Out of Stock'}
        </p>

        <button
          className={`btn-cart ${
            product.countInStock === 0
              ? 'btn-out'
              : existingQty >= product.countInStock
              ? 'btn-limit'
              : 'btn-add'
          }`}
          disabled={
            product.countInStock === 0 || existingQty >= product.countInStock
          }
          onClick={handleAddToCart}
          title={
            product.countInStock === 0
              ? 'Out of stock'
              : existingQty >= product.countInStock
              ? 'You have reached the max quantity available.'
              : ''
          }
        >
          {product.countInStock === 0
            ? 'Out of Stock'
            : existingQty >= product.countInStock
            ? 'Limit Reached'
            : 'Add to Cart'}
        </button>

        <Link to="/" className="back-home-link">
          🔙 Back to Products
        </Link>
      </div>
    </section>
  );
}

export default ProductScreen;
