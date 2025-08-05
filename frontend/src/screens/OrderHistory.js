import React, { useContext, useEffect, useReducer, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import MessageBox from '../components/MessageBox';
import { Store } from '../Store';
import { getError } from '../utils';
import Button from 'react-bootstrap/Button';
import Pagination from 'react-bootstrap/Pagination';
import { FaBoxOpen } from 'react-icons/fa';

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

export default function OrderHistoryScreen() {
  const { state } = useContext(Store);
  const { userInfo } = state;
  const navigate = useNavigate();

  const [{ loading, error, orders }, dispatch] = useReducer(reducer, {
    loading: true,
    error: '',
    orders: [],
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!userInfo) {
      navigate('/login'); // Redirect to login if not logged in
      return;
    }
    const fetchData = async () => {
      dispatch({ type: 'FETCH_REQUEST' });
      try {
        const { data } = await axios.get('/api/orders/mine', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (error) {
        dispatch({
          type: 'FETCH_FAIL',
          payload: getError(error),
        });
      }
    };
    fetchData();
  }, [userInfo]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = orders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(orders.length / itemsPerPage);

  const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);
  const handlePageClick = (num) => setCurrentPage(num);

  return (
    <div className="container my-5">
      <Helmet>
        <title>Order History</title>
      </Helmet>

      <div className="order-history-card shadow p-4 rounded">
        <div className="header mb-4 text-white p-3 rounded-top">
          <h3 className="d-flex align-items-center mb-0">
            <FaBoxOpen className="me-2" />
            Order History
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div
              className="spinner-border text-primary mb-3"
              role="status"
              style={{ width: '4rem', height: '4rem' }}
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="fw-semibold text-muted">
              Fetching your orders... Hang tight! 📦
            </p>
          </div>
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover table-borderless align-middle">
                <thead className="text-secondary border-bottom">
                  <tr>
                    <th>ID</th>
                    <th>DATE</th>
                    <th>TOTAL</th>
                    <th>PAID</th>
                    <th>DELIVERED</th>
                    <th>CANCELLED</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map((order) => (
                    <tr key={order._id} className="order-row">
                      <td>
                        <span title={order._id} style={{ cursor: 'help' }}>
                          {order._id.substring(0, 8)}...
                        </span>
                      </td>
                      <td>{order.createdAt.substring(0, 10)}</td>
                      <td>₹{order.totalPrice.toFixed(2)}</td>

                      <td>
                        {order.isCancelled ? (
                          <span className="text-muted">--</span>
                        ) : order.isPaid ? (
                          <span className="text-success fw-bold">
                            {new Date(order.paidAt).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-danger">No</span>
                        )}
                      </td>

                      <td>
                        {order.isCancelled ? (
                          <span className="text-muted">--</span>
                        ) : order.isDelivered ? (
                          <span className="text-success fw-bold">Yes</span>
                        ) : (
                          <span className="text-danger">No</span>
                        )}
                      </td>

                      <td>
                        {order.isCancelled ? (
                          <span className="text-danger fw-semibold">
                            {order.cancelledBy === 'admin' ? 'Admin' : 'System'}
                          </span>
                        ) : (
                          <span className="text-muted">--</span>
                        )}
                      </td>

                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => navigate(`/order/${order._id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination className="justify-content-center mt-4">
              <Pagination.Prev
                onClick={handlePrev}
                disabled={currentPage === 1}
              />
              {[...Array(totalPages).keys()].map((x) => (
                <Pagination.Item
                  key={x + 1}
                  active={x + 1 === currentPage}
                  onClick={() => handlePageClick(x + 1)}
                >
                  {x + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next
                onClick={handleNext}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          </>
        )}
      </div>

      {/* Optional small footer or summary */}
    </div>
  );
}
