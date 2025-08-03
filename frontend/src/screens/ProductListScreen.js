import React, { useContext, useEffect, useReducer } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { toast } from 'react-toastify';
import { Store } from '../Store';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { getError } from '../utils';
import { confirmAlert } from 'react-confirm-alert';
import 'bootstrap/dist/css/bootstrap.min.css';

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
        loading: false,
      };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'CREATE_REQUEST':
      return { ...state, loadingCreate: true };
    case 'CREATE_SUCCESS':
      return {
        ...state,
        loadingCreate: false,
      };
    case 'CREATE_FAIL':
      return { ...state, loadingCreate: false };
    default:
      return state;
  }
};

export default function ProductListScreen() {
  const [{ loading, error, products, pages, loadingCreate }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: '',
    });

  const navigate = useNavigate();
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const page = sp.get('page') || 1;

  const { state } = useContext(Store);
  const { userInfo } = state;

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/products/admin?page=${page}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: err.message });
      }
    };
    fetchData();
  }, [page, userInfo]);

  useEffect(() => {
    document.title = 'ShopFusion | Admin | ProductList';
  }, []);

  const createHandler = () => {
    confirmAlert({
      title: 'Confirm to proceed',
      message: 'Are you sure you want to create this product?',
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            try {
              dispatch({ type: 'CREATE_REQUEST' });
              const { data } = await axios.post(
                '/api/products',
                {},
                {
                  headers: { Authorization: `Bearer ${userInfo.token}` },
                }
              );
              toast.success('Product created successfully');
              dispatch({ type: 'CREATE_SUCCESS' });
              navigate(`/admin/product/${data.product._id}`);
            } catch (err) {
              toast.error(getError(err));
              dispatch({ type: 'CREATE_FAIL' });
            }
          },
        },
        {
          label: 'No',
          onClick: () => {
            toast.info('Product creation cancelled');
          },
        },
      ],
    });
  };

  return (
    <div className="container my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary">📦 Manage Products</h2>
        <Button
          type="button"
          onClick={createHandler}
          variant="success"
          className="shadow-sm"
        >
          ➕ Create Product
        </Button>
      </div>

      {loadingCreate && <LoadingBox />}
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <>
          <div className="table-responsive shadow-sm rounded">
            <table className="table table-hover align-middle text-center">
              <thead className="table-primary">
                <tr>
                  <th scope="col">🆔 ID</th>
                  <th scope="col">📛 Name</th>
                  <th scope="col">💰 Price</th>
                  <th scope="col">📂 Category</th>
                  <th scope="col">🏷️ Brand</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr key={product._id} className="align-middle">
                    <td className="text-muted small">{product._id}</td>
                    <td className="fw-semibold">{product.name}</td>
                    <td className="text-success">₹{product.price}</td>
                    <td>{product.category}</td>
                    <td>{product.brand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-center my-4 flex-wrap gap-2">
            {[...Array(pages).keys()].map((x) => (
              <Link
                key={x + 1}
                to={`/admin/products?page=${x + 1}`}
                className={`btn ${
                  Number(page) === x + 1
                    ? 'btn-primary fw-bold'
                    : 'btn-outline-secondary'
                } shadow-sm`}
              >
                {x + 1}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
