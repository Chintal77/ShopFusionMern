import axios from 'axios';
import React, { useContext, useEffect, useReducer } from 'react';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { Store } from '../Store';
import { getError } from '../utils';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, orders: action.payload, loading: false };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default function OrderListScreen() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;

  const [{ loading, error, orders }, dispatch] = useReducer(reducer, {
    loading: true,
    error: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get('/api/orders', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };
    fetchData();
  }, [userInfo]);

  return (
    <div className="container my-5">
      <Helmet>
        <title>🧾 Admin | Orders</title>
      </Helmet>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-primary fw-bold">📦 Order Management</h2>
      </div>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : orders.length === 0 ? (
        <MessageBox>No orders found.</MessageBox>
      ) : (
        <div className="table-responsive shadow-sm rounded-4 border">
          <table className="table table-hover align-middle text-center mb-0">
            <thead className="table-dark text-uppercase small">
              <tr>
                <th>Order ID</th>
                <th>User</th>
                <th>Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Delivered</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td className="text-muted small">{order._id}</td>
                  <td>{order.user ? order.user.name : '🛑 Deleted User'}</td>
                  <td>
                    📅 {new Date(order.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="text-success fw-semibold">
                    ₹{order.totalPrice.toFixed(2)}
                  </td>
                  <td className={order.isPaid ? 'text-success' : 'text-danger'}>
                    {order.isPaid ? 'Yes' : 'No'}
                  </td>
                  <td
                    className={
                      order.isDelivered ? 'text-success' : 'text-danger'
                    }
                  >
                    {order.isDelivered ? 'Yes' : 'No'}
                  </td>

                  <td>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="rounded-pill px-3"
                      onClick={() => navigate(`/order/${order._id}`)}
                    >
                      🔍 View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
