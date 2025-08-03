import React, { useEffect, useReducer, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import { Helmet } from 'react-helmet-async';
import {
  Row,
  Col,
  Button,
  ListGroup,
  ButtonGroup,
  Card,
} from 'react-bootstrap';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { LinkContainer } from 'react-router-bootstrap';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        products: action.payload.products,
        page: action.payload.page,
        pages: action.payload.pages,
        countProducts: action.payload.countProducts,
        loading: false,
      };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

const prices = [
  { name: '₹1 to ₹50', value: '1-50' },
  { name: '₹51 to ₹200', value: '51-200' },
  { name: '₹201 to ₹1000', value: '201-1000' },
  { name: '₹1000 to ₹2000', value: '1000-2000' },
];

export const ratings = [
  { name: '4 stars & up', rating: 4 },
  { name: '3 stars & up', rating: 3 },
  { name: '2 stars & up', rating: 2 },
  { name: '1 star & up', rating: 1 },
];

export default function SearchScreen() {
  const { search } = useLocation();
  const location = useLocation();
  const sp = new URLSearchParams(search);
  const hasParams = location.search && location.search.length > 0;

  const category = hasParams ? sp.get('category') || 'all' : 'all';
  const query = hasParams ? sp.get('query') || 'all' : 'all';
  const price = hasParams ? sp.get('price') || 'all' : 'all';
  const rating = hasParams ? sp.get('rating') || 'all' : 'all';
  const order = hasParams ? sp.get('order') || 'newest' : 'newest';
  const page = hasParams ? sp.get('page') || 1 : 1;

  const navigate = useNavigate();

  const [{ loading, error, products, pages, countProducts }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: '',
    });

  const [categories, setCategories] = useState([]);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(
          `/api/products/search?page=${page}&query=${query}&category=${category}&price=${price}&rating=${rating}&order=${order}`
        );
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
        if (
          data.products.length === 0 &&
          (query !== 'all' ||
            category !== 'all' ||
            price !== 'all' ||
            rating !== 'all')
        ) {
          navigate('/search');
        }
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };
    fetchData();
  }, [category, error, order, page, price, query, rating]);

  const getFilterUrl = (filter, skipPathname) => {
    const filterPage = filter.page || page;
    const filterCategory = filter.category || category;
    const filterQuery = filter.query || query;
    const filterRating = filter.rating || rating;
    const filterPrice = filter.price || price;
    const sortOrder = filter.order || order;

    return `${
      skipPathname ? '' : '/search?'
    }category=${filterCategory}&query=${filterQuery}&price=${filterPrice}&rating=${filterRating}&order=${sortOrder}&page=${filterPage}`;
  };

  return (
    <div className="container">
      <Helmet>
        <title>Search Products</title>
      </Helmet>
      <Row>
        <Col md={3}>
          <h4>Categories</h4>
          <ListGroup>
            <ListGroup.Item
              action
              active={'all' === category}
              onClick={() => navigate(getFilterUrl({ category: 'all' }))}
            >
              Any
            </ListGroup.Item>
            {categories.map((c) => (
              <ListGroup.Item
                key={c}
                action
                active={c === category}
                onClick={() => navigate(getFilterUrl({ category: c }))}
              >
                {c}
              </ListGroup.Item>
            ))}
          </ListGroup>

          <h4 className="mt-4">Price</h4>
          <ListGroup>
            <ListGroup.Item
              action
              active={'all' === price}
              onClick={() => navigate(getFilterUrl({ price: 'all' }))}
            >
              Any
            </ListGroup.Item>
            {prices.map((p) => (
              <ListGroup.Item
                key={p.value}
                action
                active={p.value === price}
                onClick={() => navigate(getFilterUrl({ price: p.value }))}
              >
                {p.name}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>

        <Col md={9}>
          {loading ? (
            <LoadingBox />
          ) : error ? (
            <MessageBox variant="danger">{error}</MessageBox>
          ) : (
            <>
              <Row className="justify-content-between align-items-center mb-3">
                <Col md={6}>
                  <h5>
                    {countProducts} Results {query !== 'all' && `: ${query}`}{' '}
                    {category !== 'all' && `: ${category}`}{' '}
                    {price !== 'all' && `: Price ${price}`}{' '}
                    {rating !== 'all' && `: Rating ${rating} & up`}
                    {(query !== 'all' ||
                      category !== 'all' ||
                      rating !== 'all' ||
                      price !== 'all') && (
                      <Button
                        variant="light"
                        onClick={() => navigate('/search')}
                        className="ms-2"
                      >
                        <i className="fas fa-times-circle"></i>
                      </Button>
                    )}
                  </h5>
                </Col>
                <Col className="text-end">
                  Sort by:{' '}
                  <select
                    value={order}
                    onChange={(e) =>
                      navigate(getFilterUrl({ order: e.target.value }))
                    }
                    className="form-select d-inline-block w-auto ms-2"
                  >
                    <option value="lowest">Price: Low to High</option>
                    <option value="highest">Price: High to Low</option>
                  </select>
                </Col>
              </Row>

              <Row>
                {products.map((product) => (
                  <Col sm={6} lg={4} className="mb-4" key={product._id}>
                    <Card className="h-100 shadow-sm">
                      <Link to={`/product/${product._id}`}>
                        <Card.Img
                          variant="top"
                          src={product.image}
                          alt={product.name}
                          style={{ objectFit: 'cover', height: '200px' }}
                        />
                      </Link>
                      <Card.Body>
                        <Link
                          to={`/product/${product._id}`}
                          className="text-decoration-none"
                        >
                          <Card.Title as="h6" className="text-dark">
                            {product.name}
                          </Card.Title>
                        </Link>
                        <Card.Text>
                          ⭐ {product.rating} ({product.numReviews} reviews)
                        </Card.Text>
                        <Card.Text className="fw-bold">
                          ₹{product.price}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>

              <ButtonGroup className="mt-4">
                {[...Array(pages).keys()].map((x) => (
                  <LinkContainer
                    key={x + 1}
                    to={{
                      pathname: '/search',
                      search: getFilterUrl({ page: x + 1 }, true),
                    }}
                  >
                    <Button
                      variant={Number(page) === x + 1 ? 'dark' : 'outline-dark'}
                    >
                      {x + 1}
                    </Button>
                  </LinkContainer>
                ))}
              </ButtonGroup>
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}
