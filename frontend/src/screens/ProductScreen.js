// ------------------ Imports ------------------
import { useEffect, useReducer, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../index.css';

// React Bootstrap
import { Button, Card, Col, ListGroup, Row, Tab, Tabs } from 'react-bootstrap';

// Custom Components
import MessageBox from '../components/MessageBox';
import LoadingBox from '../components/LoadingBox';
import Rating from '../components/Rating';

// Utils
import { getError } from '../utils';

// Bootstrap
import Form from 'react-bootstrap/Form';
import FloatingLabel from 'react-bootstrap/FloatingLabel';

// Notifications
import { toast } from 'react-toastify';

// ------------------ Reducer ------------------
const reducer = (state, action) => {
  switch (action.type) {
    case 'REFRESH_PRODUCT':
      return { ...state, product: action.payload };
    case 'CREATE_REQUEST':
      return { ...state, loadingCreateReview: true };
    case 'CREATE_SUCCESS':
      return { ...state, loadingCreateReview: false };
    case 'CREATE_FAIL':
      return { ...state, loadingCreateReview: false };
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

// ------------------ Component ------------------
function ProductScreen({ cartItems, setCartItems }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const reviewsRef = useRef();

  // Local state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedImage, setSelectedImage] = useState('');

  // Reducer state
  const [{ loading, error, product, loadingCreateReview }, dispatch] =
    useReducer(reducer, {
      product: [],
      loading: true,
      error: '',
    });

  // Fetch product
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

  // Update page title
  useEffect(() => {
    if (product && product.name) {
      document.title = `ShopFusion | ${product.name}`;
    }
  }, [product]);

  // ------------------ Handlers ------------------
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

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!comment || !rating) {
      toast.error('Please enter comment and rating');
      return;
    }
    try {
      const { data } = await axios.post(
        `/api/products/${product._id}/reviews`,
        { rating, comment, name: userInfo.name },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );

      dispatch({ type: 'CREATE_SUCCESS' });
      toast.success('Review submitted successfully');
      product.reviews.unshift(data.review);
      product.numReviews = data.numReviews;
      product.rating = data.rating;
      dispatch({ type: 'REFRESH_PRODUCT', payload: product });
      window.scrollTo({
        behavior: 'smooth',
        top: reviewsRef.current.offsetTop,
      });
    } catch (error) {
      toast.error(getError(error));
      dispatch({ type: 'CREATE_FAIL' });
    }
  };

  // ------------------ Derived Values ------------------
  const existingQty = Array.isArray(cartItems)
    ? cartItems.find((item) => item.slug === product.slug)?.quantity || 0
    : 0;

  const discountMatch = product.badge?.match(/(\d+)%/);
  const discountPercentage = discountMatch ? parseInt(discountMatch[1]) : 0;
  const discountAmount = Math.round((product.price * discountPercentage) / 100);
  const finalPrice = product.price - discountAmount;

  // ------------------ Render ------------------
  if (loading) {
    return <LoadingBox />;
  }

  if (error) {
    return (
      <div className="not-found text-center py-5">
        <h2 className="fw-bold">Oops! Product Not Found</h2>
        <p className="text-muted">
          The product you are looking for doesn’t exist or has been removed.
        </p>
        <Link to="/" className="btn btn-outline-primary mt-3">
          🔙 Go Back Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-5">
      {/* -------- Product Layout -------- */}
      <div className="row g-5">
        {/* Product Image */}
        <div className="col-md-6">
          <div className="card shadow-lg border-0 p-4 rounded-4 bg-light">
            {/* Main Image */}
            <div className="text-center position-relative">
              <img
                src={selectedImage || product.image}
                alt={product.name}
                className="img-fluid rounded-4 shadow-sm"
                style={{
                  maxHeight: '420px',
                  objectFit: 'contain',
                  transition: 'transform 0.4s ease, box-shadow 0.3s ease',
                  cursor: 'zoom-in',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.07)';
                  e.currentTarget.style.boxShadow =
                    '0 8px 25px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/images/broken.png';
                }}
              />

              {/* Overlay Zoom Icon */}
              <div
                className="position-absolute top-50 start-50 translate-middle bg-dark bg-opacity-50 text-white px-3 py-2 rounded-circle"
                style={{
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                  pointerEvents: 'none',
                }}
              >
                🔍
              </div>
            </div>

            {/* Thumbnail Gallery */}
            <div className="mt-4">
              <Row xs={4} className="g-3 justify-content-center">
                {[product.image, ...product.images].map((x) => (
                  <Col key={x}>
                    <Card
                      className={`border-3 shadow-sm ${
                        selectedImage === x ? 'border-primary' : 'border-light'
                      }`}
                      style={{
                        cursor: 'pointer',
                        transition:
                          'transform 0.25s ease, border-color 0.25s ease',
                        borderRadius: '12px',
                      }}
                      onClick={() => setSelectedImage(x)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = 'scale(1.08)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = 'scale(1)')
                      }
                    >
                      <Card.Img
                        variant="top"
                        src={x}
                        alt="product-thumbnail"
                        className="rounded"
                        style={{
                          height: '90px',
                          objectFit: 'cover',
                          borderRadius: '10px',
                        }}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="col-md-6">
          <div className="d-flex flex-column gap-3">
            <h1 className="fw-bold">{product.name}</h1>
            <div className="text-muted">
              ⭐ {product.rating} ({product.numReviews} reviews)
            </div>

            {/* Price */}
            <div className="bg-light p-3 rounded shadow-sm">
              <h4 className="fw-bold text-success m-0">
                ₹{finalPrice.toLocaleString()}
              </h4>
              <div className="d-flex align-items-center gap-2">
                <del className="text-secondary">
                  ₹{product.price.toLocaleString()}
                </del>
                <span className="text-danger fw-semibold">
                  {discountPercentage}% OFF
                </span>
              </div>
            </div>

            {/* Tabs for Details */}
            <Tabs defaultActiveKey="highlights" className="mb-3">
              {product.highlights?.length > 0 && (
                <Tab eventKey="highlights" title="Highlights">
                  <ul className="list-group list-group-flush">
                    {product.highlights.map((point, index) => (
                      <li key={index} className="list-group-item">
                        {point}
                      </li>
                    ))}
                  </ul>
                </Tab>
              )}
              {product.specifications && (
                <Tab eventKey="specs" title="Specifications">
                  <table className="table table-striped">
                    <tbody>
                      {Object.entries(product.specifications).map(
                        ([key, value]) => (
                          <tr key={key}>
                            <th className="text-capitalize">{key}</th>
                            <td>{value}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </Tab>
              )}
              <Tab eventKey="info" title="More Info">
                <p>
                  🏷️ <strong>Brand:</strong> {product.brand}
                </p>
                <p>
                  📂 <strong>Category:</strong> {product.category}
                </p>
                <p>
                  🚚 <strong>Delivery:</strong>{' '}
                  {(() => {
                    const today = new Date();
                    const formatDate = (date) =>
                      date.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      });

                    // start after 2 days
                    const startDateObj = new Date(today);
                    startDateObj.setDate(today.getDate() + 2);
                    const startDate = formatDate(startDateObj);

                    // end after 7 days
                    const endDateObj = new Date(today);
                    endDateObj.setDate(today.getDate() + 7);
                    const endDate = formatDate(endDateObj);

                    return `${startDate} - ${endDate}`;
                  })()}
                </p>
                <p>
                  ↩️ <strong>Return:</strong> {product.returnPolicy}
                </p>
              </Tab>
            </Tabs>

            {/* Stock Status */}
            <div
              className={`fw-semibold ${
                product.countInStock > 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {product.countInStock > 0 ? '✅ In Stock' : '❌ Out of Stock'}
            </div>
          </div>
        </div>
      </div>

      {/* -------- Sticky Add to Cart -------- */}
      <div className="sticky-bottom bg-white p-3 mt-4 shadow d-flex justify-content-between align-items-center">
        <span className="fw-bold fs-5 text-success">
          ₹{finalPrice.toLocaleString()}
        </span>
        <Button
          variant={product.countInStock > 0 ? 'primary' : 'secondary'}
          size="lg"
          disabled={
            product.countInStock === 0 || existingQty >= product.countInStock
          }
          onClick={handleAddToCart}
        >
          🛒 {product.countInStock > 0 ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </div>

      {/* -------- Reviews Section -------- */}
      <div className="my-5">
        <h2
          ref={reviewsRef}
          className="mb-4 text-center fw-bold border-bottom pb-2"
        >
          Customer Reviews
        </h2>

        {/* If no review */}
        {product.reviews.length === 0 && (
          <MessageBox variant="info">
            No reviews yet. Be the first to review!
          </MessageBox>
        )}

        {/* Reviews List */}
        <ListGroup variant="flush" className="mb-4">
          {product.reviews.map((review) => (
            <ListGroup.Item key={review._id} className="shadow-sm rounded mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-bold text-primary">{review.name}</h6>
                <small className="text-muted">
                  {review.createdAt.substring(0, 10)}
                </small>
              </div>
              <div className="mb-2 text-warning">
                {'★'.repeat(review.rating)}
                {'☆'.repeat(5 - review.rating)}
              </div>
              <p className="mb-0">{review.comment}</p>
            </ListGroup.Item>
          ))}
        </ListGroup>

        {/* Review Form */}
        <div className="p-4 rounded shadow-sm bg-light">
          {userInfo ? (
            <form onSubmit={submitHandler}>
              <h3 className="mb-3 fw-semibold">Write a Review</h3>

              <Form.Group className="mb-3" controlId="rating">
                <Form.Label className="fw-semibold">Rating</Form.Label>
                <Form.Select
                  aria-label="Rating"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="1">1 - Poor</option>
                  <option value="2">2 - Fair</option>
                  <option value="3">3 - Good</option>
                  <option value="4">4 - Very Good</option>
                  <option value="5">5 - Excellent</option>
                </Form.Select>
              </Form.Group>

              <FloatingLabel
                controlId="floatingTextarea"
                label="Your Comments"
                className="mb-3"
              >
                <Form.Control
                  as="textarea"
                  placeholder="Write your feedback..."
                  style={{ minHeight: '100px' }}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </FloatingLabel>

              <div className="d-flex justify-content-end">
                <Button
                  variant="primary"
                  disabled={loadingCreateReview}
                  type="submit"
                  className="px-4"
                >
                  Submit
                </Button>
              </div>
              {loadingCreateReview && <LoadingBox />}
            </form>
          ) : (
            <MessageBox>
              Please{' '}
              <Link to={`/signin?redirect=/product/${product.slug}`}>
                Sign In
              </Link>{' '}
              to write a review
            </MessageBox>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductScreen;
