import React, { useContext, useEffect, useReducer, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Store } from '../Store';
import { getError } from '../utils';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';
import { Col, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'UPDATE_REQUEST':
      return { ...state, loadingUpdate: true };
    case 'UPDATE_SUCCESS':
      return { ...state, loadingUpdate: false };
    case 'UPDATE_FAIL':
      return { ...state, loadingUpdate: false };
    case 'UPLOAD_REQUEST':
      return { ...state, loadingUpload: true, errorUpload: '' };
    case 'UPLOAD_SUCCESS':
      return {
        ...state,
        loadingUpload: false,
        errorUpload: '',
      };
    case 'UPLOAD_FAIL':
      return { ...state, loadingUpload: false, errorUpload: action.payload };
    default:
      return state;
  }
};
export default function ProductEditScreen() {
  const params = useParams();
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;
  const { id: productId } = params;

  const [{ loading, error, loadingUpdate, loadingUpload }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: '',
    });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState('');
  const [images, setImages] = useState([]);
  const [price, setPrice] = useState('');
  const [countInStock, setCountInStock] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState('');
  const [numReviews, setNumReviews] = useState('');

  // Optional fields
  const [badge, setBadge] = useState('');
  const [seller, setSeller] = useState('');
  const [delivery, setDelivery] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [highlights, setHighlights] = useState([]); // array of strings
  const [sizeFit, setSizeFit] = useState('');

  // Nested object: specifications
  const [specifications, setSpecifications] = useState({
    fabric: '',
    pattern: '',
    sleeve: '',
    collar: '',
    fit: '',
    occasion: '',
    washCare: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/products/${productId}`);

        // Required fields
        setName(data.name || '');
        setSlug(data.slug || '');
        setPrice(data.price || '');
        setImage(data.image || '');
        setImages(data.images || '');
        setCategory(data.category || '');
        setCountInStock(data.countInStock || '');
        setBrand(data.brand || '');
        setDescription(data.description || '');
        setRating(data.rating || '');
        setNumReviews(data.numReviews || '');

        // Optional fields
        setBadge(data.badge || '');
        setSeller(data.seller || '');
        setDelivery(data.delivery || '');
        setReturnPolicy(data.returnPolicy || '');
        setHighlights(data.highlights || []);
        setSizeFit(data.sizeFit || '');

        // Specifications (nested object)
        setSpecifications({
          fabric: data.specifications?.fabric || '',
          pattern: data.specifications?.pattern || '',
          sleeve: data.specifications?.sleeve || '',
          collar: data.specifications?.collar || '',
          fit: data.specifications?.fit || '',
          occasion: data.specifications?.occasion || '',
          washCare: data.specifications?.washCare || '',
        });

        dispatch({ type: 'FETCH_SUCCESS' });
      } catch (err) {
        dispatch({
          type: 'FETCH_FAIL',
          payload: getError(err),
        });
      }
    };
    fetchData();
  }, [productId]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'UPDATE_REQUEST' });
      await axios.put(
        `/api/products/${productId}`,
        {
          _id: productId,
          name,
          slug,
          price,
          image,
          images,
          category,
          brand,
          countInStock,
          description,
          rating,
          numReviews,
          badge,
          seller,
          delivery,
          returnPolicy,
          highlights,
          sizeFit,
          specifications,
        },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );
      dispatch({ type: 'UPDATE_SUCCESS' });
      toast.success('Product updated successfully');
      navigate('/admin/products');
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'UPDATE_FAIL' });
    }
  };

  const uploadFileHandler = async (e, forImages) => {
    const file = e.target.files[0];
    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
    try {
      dispatch({ type: 'UPLOAD_REQUEST' });
      const { data } = await axios.post('/api/upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          authorization: `Bearer ${userInfo.token}`,
        },
      });
      dispatch({ type: 'UPLOAD_SUCCESS' });

      if (forImages) {
        setImages([...images, data.secure_url]);
      } else {
        setImage(data.secure_url);
      }
      toast.success('Image uploaded successfully. click Update to apply it');
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'UPLOAD_FAIL', payload: getError(err) });
    }
  };
  const deleteFileHandler = async (fileName, f) => {
    console.log(fileName, f);
    console.log(images);
    console.log(images.filter((x) => x !== fileName));
    setImages(images.filter((x) => x !== fileName));
    toast.success('Image removed successfully. click Update to apply it');
  };
  return (
    <Container className="my-4">
      <Helmet>
        <title>ShopFusion | Edit Product</title>
      </Helmet>
      <h2 className="mb-4 text-center fw-bold">Edit Product</h2>

      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <Form className="needs-validation" onSubmit={submitHandler}>
          <div className="card shadow-sm border-0 rounded-4 mb-4 p-4">
            <h4 className="mb-3">📝 Basic Information</h4>
            <Row className="gy-3">
              <Col md={6}>
                <Form.Group controlId="name">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="form-control"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="slug">
                  <Form.Label>Slug</Form.Label>
                  <Form.Control
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="gy-3 mt-3">
              <Col md={6}>
                <Form.Group controlId="price">
                  <Form.Label>Price</Form.Label>
                  <Form.Control
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="image">
                  <Form.Label>Image URL</Form.Label>
                  <Form.Control
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3" controlId="imageFile">
              <Form.Label>Upload Image</Form.Label>

              <Form.Control type="file" onChange={uploadFileHandler} />
              {loadingUpload && <LoadingBox></LoadingBox>}
            </Form.Group>

            <Form.Group className="mb-3" controlId="additionalImage">
              <Form.Label>Additional Images</Form.Label>
              {images.length === 0 && <MessageBox>No image</MessageBox>}
              <ListGroup variant="flush">
                {images.map((x) => (
                  <ListGroup.Item key={x}>
                    {x}
                    <Button
                      variant="light"
                      onClick={() => deleteFileHandler(x)}
                    >
                      <i className="fa fa-times-circle"></i>
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Form.Group>
            <Form.Group className="mb-3" controlId="additionalImageFile">
              <Form.Label>Upload Aditional Image</Form.Label>
              <Form.Control
                type="file"
                onChange={(e) => uploadFileHandler(e, true)}
              />
              {loadingUpload && <LoadingBox></LoadingBox>}
            </Form.Group>

            <Row className="gy-3 mt-3">
              <Col md={4}>
                <Form.Group controlId="category">
                  <Form.Label>Category</Form.Label>
                  <Form.Control
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="brand">
                  <Form.Label>Brand</Form.Label>
                  <Form.Control
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="countInStock">
                  <Form.Label>Stock</Form.Label>
                  <Form.Control
                    type="number"
                    value={countInStock}
                    onChange={(e) => setCountInStock(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="card shadow-sm border-0 rounded-4 mb-4 p-4">
            <h4 className="mb-3">📌 Specifications</h4>
            <Row className="gy-3">
              {Object.entries(specifications).map(([key, value]) => (
                <Col md={6} key={key}>
                  <Form.Group controlId={key}>
                    <Form.Label className="text-capitalize">{key}</Form.Label>
                    <Form.Control
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setSpecifications({
                          ...specifications,
                          [key]: e.target.value,
                        })
                      }
                    />
                  </Form.Group>
                </Col>
              ))}
            </Row>
          </div>

          <div className="card shadow-sm border-0 rounded-4 mb-4 p-4">
            <h4 className="mb-3">🔧 Additional Details</h4>

            <Row className="gy-3">
              <Col md={6}>
                <Form.Group controlId="rating">
                  <Form.Label>Rating (0 - 5)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="numReviews">
                  <Form.Label>Number of Reviews</Form.Label>
                  <Form.Control
                    type="number"
                    value={numReviews}
                    onChange={(e) => setNumReviews(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="gy-3 mt-2">
              <Col md={6}>
                <Form.Group controlId="badge">
                  <Form.Label>Badge</Form.Label>
                  <Form.Control
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="seller">
                  <Form.Label>Seller</Form.Label>
                  <Form.Control
                    type="text"
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="gy-3 mt-2">
              <Col md={6}>
                <Form.Group controlId="delivery">
                  <Form.Label>Delivery Info</Form.Label>
                  <Form.Control
                    type="text"
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="returnPolicy">
                  <Form.Label>Return Policy</Form.Label>
                  <Form.Control
                    type="text"
                    value={returnPolicy}
                    onChange={(e) => setReturnPolicy(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mt-3" controlId="sizeFit">
              <Form.Label>Size & Fit</Form.Label>
              <Form.Control
                type="text"
                value={sizeFit}
                onChange={(e) => setSizeFit(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mt-3" controlId="sizeFit">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mt-3" controlId="highlights">
              <Form.Label>Highlights (comma separated)</Form.Label>
              <Form.Control
                type="text"
                value={highlights.join(', ')}
                onChange={(e) =>
                  setHighlights(
                    e.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean)
                  )
                }
              />
            </Form.Group>
          </div>

          <div className="d-grid mt-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="rounded-pill"
              disabled={loadingUpdate}
            >
              {loadingUpdate ? '⏳ Updating...' : '💾 Update Product'}
            </Button>
          </div>

          {loadingUpdate && <LoadingBox />}
        </Form>
      )}
    </Container>
  );
}
