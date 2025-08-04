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
    <div className="container py-5">
      <div className="row g-5">
        {/* Product Image */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 position-relative">
            {product.badge && (
              <span className="position-absolute top-0 start-0 translate-middle-y bg-danger text-white px-3 py-1 rounded-end fs-6 mt-3 ms-2 shadow-sm">
                {typeof product.badge === 'string'
                  ? product.badge
                  : `${product.badge}% OFF`}
              </span>
            )}
            <img
              src={product.image}
              alt={product.name}
              className="img-fluid rounded"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/broken.png';
              }}
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="col-md-6">
          <div className="d-flex flex-column gap-3">
            <h1 className="fw-bold">{product.name}</h1>

            <div className="text-muted">
              ⭐ {product.rating} ({product.numReviews} reviews)
            </div>

            {/* Price with discount block */}
            <div className="bg-light p-3 rounded d-flex flex-column gap-1 shadow-sm">
              <h4 className="fw-bold text-success m-0">
                ₹{finalPrice.toLocaleString()}
              </h4>
              <div className="d-flex align-items-center gap-2">
                <del className="text-secondary">
                  ₹{product.price.toLocaleString()}
                </del>
                <span className="badge bg-danger">
                  {discountPercentage}% OFF
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted">{product.description}</p>

            {/* Highlights */}
            {product.highlights?.length > 0 && (
              <div>
                <h6 className="fw-semibold">🔍 Highlights</h6>
                <ul className="list-group list-group-flush border rounded shadow-sm">
                  {product.highlights.map((point, index) => (
                    <li key={index} className="list-group-item">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Size & Fit */}
            {product.sizeFit && (
              <p className="mb-1">
                <strong>📏 Size & Fit:</strong> {product.sizeFit}
              </p>
            )}

            {/* Specifications */}
            {product.specifications && (
              <div className="table-responsive">
                <h6 className="fw-semibold mb-2">📑 Specifications</h6>
                <table className="table table-bordered rounded shadow-sm overflow-hidden">
                  <tbody>
                    {Object.entries(product.specifications).map(
                      ([key, value]) => (
                        <tr key={key}>
                          <th className="bg-light text-uppercase">{key}</th>
                          <td>{value}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Extra Info */}
            <div className="text-muted">
              {product.brand && (
                <div>
                  🏷️ <strong>Brand:</strong> {product.brand}
                </div>
              )}
              {product.category && (
                <div>
                  📂 <strong>Category:</strong> {product.category}
                </div>
              )}
              {product.seller && (
                <div>
                  🛍️ <strong>Seller:</strong> {product.seller}
                </div>
              )}
              {product.delivery && (
                <div>
                  🚚 <strong>Delivery:</strong> {product.delivery}
                </div>
              )}
              {product.returnPolicy && (
                <div>
                  ↩️ <strong>Return:</strong> {product.returnPolicy}
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div
              className={`fw-semibold ${
                product.countInStock > 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {product.countInStock > 0 ? '✅ In Stock' : '❌ Out of Stock'}
            </div>

            {/* Add to Cart */}
            <button
              className={`btn btn-lg ${
                product.countInStock === 0
                  ? 'btn-secondary'
                  : existingQty >= product.countInStock
                  ? 'btn-warning'
                  : 'btn-primary'
              } d-flex align-items-center justify-content-center gap-2`}
              disabled={
                product.countInStock === 0 ||
                existingQty >= product.countInStock
              }
              onClick={handleAddToCart}
              title={
                product.countInStock === 0
                  ? 'Out of stock'
                  : existingQty >= product.countInStock
                  ? 'You have reached the max quantity available.'
                  : 'Add this item to your cart.'
              }
            >
              🛒
              {product.countInStock === 0
                ? 'Out of Stock'
                : existingQty >= product.countInStock
                ? 'Limit Reached'
                : 'Add to Cart'}
            </button>

            {/* Back link */}
            <Link to="/" className="text-decoration-none mt-2">
              ← Back to Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductScreen;
