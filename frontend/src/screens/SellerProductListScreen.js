import React, { useContext, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Store } from '../Store';
import { getError } from '../utils';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { toast } from 'react-toastify';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, products: action.payload };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'DELETE_REQUEST':
      return { ...state, loadingDelete: true };
    case 'DELETE_SUCCESS':
      return { ...state, loadingDelete: false, successDelete: true };
    case 'DELETE_FAIL':
      return { ...state, loadingDelete: false };
    case 'DELETE_RESET':
      return { ...state, loadingDelete: false, successDelete: false };
    case 'CREATE_REQUEST':
      return { ...state, loadingCreate: true };
    case 'CREATE_SUCCESS':
      return { ...state, loadingCreate: false };
    case 'CREATE_FAIL':
      return { ...state, loadingCreate: false };
    default:
      return state;
  }
};

export default function SellerProductListScreen() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;

  const [{ loading, error, products, successDelete, loadingDelete }, dispatch] =
    useReducer(reducer, {
      loading: true,
      products: [],
      error: '',
    });

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get('/api/products/seller', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
          params: { t: Date.now() }, // Avoid caching
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };

    if (successDelete) {
      dispatch({ type: 'DELETE_RESET' });
    } else {
      fetchData();
    }
  }, [userInfo, successDelete]);

  // ✅ Create Product Handler
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

  // ✅ Updated Delete Handler with confirmAlert
  const deleteHandler = (product) => {
    confirmAlert({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${product.name}"?`,
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            try {
              dispatch({ type: 'DELETE_REQUEST' });
              await axios.delete(`/api/products/${product._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
              });
              toast.success('Product deleted successfully');
              dispatch({ type: 'DELETE_SUCCESS' });
            } catch (err) {
              toast.error(getError(err));
              dispatch({ type: 'DELETE_FAIL' });
            }
          },
        },
        {
          label: 'No',
          onClick: () => {
            toast.info('Product deletion cancelled');
          },
        },
      ],
    });
  };

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold">My Products</h2>
        <Button
          type="button"
          onClick={createHandler}
          variant="success"
          className="shadow-sm"
        >
          ➕ Create Product
        </Button>
      </div>

      {loadingDelete && <LoadingBox />}
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <Table striped bordered hover responsive className="table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Seller</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id}>
                <td>{product._id}</td>
                <td>{product.name}</td>
                <td>₹{product.price}</td>
                <td>{product.category}</td>
                <td>{product.countInStock}</td>
                <td>{product.seller || 'N/A'}</td>
                <td>
                  <Button
                    type="button"
                    variant="light"
                    size="sm"
                    onClick={() => navigate(`/admin/product/${product._id}`)}
                  >
                    ✏️ Edit
                  </Button>{' '}
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => deleteHandler(product)}
                  >
                    🗑️ Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
