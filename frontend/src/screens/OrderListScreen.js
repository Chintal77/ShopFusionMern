import axios from 'axios';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Pagination from 'react-bootstrap/Pagination';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { Store } from '../Store';
import { getError } from '../utils';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';

// Reducer
const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, orders: action.payload, loading: false };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'DELETE_REQUEST':
      return { ...state, loadingDelete: true, successDelete: false };
    case 'DELETE_SUCCESS':
      return { ...state, loadingDelete: false, successDelete: true };
    case 'DELETE_FAIL':
      return { ...state, loadingDelete: false };
    case 'DELETE_RESET':
      return { ...state, loadingDelete: false, successDelete: false };
    default:
      return state;
  }
};

export default function OrderListScreen() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;

  const [{ loading, error, orders, loadingDelete, successDelete }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: '',
      orders: [],
      loadingDelete: false,
      successDelete: false,
    });

  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;
  const [searchTerm, setSearchTerm] = useState('');
  const [refundCount, setRefundCount] = useState(0);

  // Fetch Orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get('/api/orders', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });

        const count = data.filter((order) => order.returnedAt).length;
        setRefundCount(count);

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

  // Delete Single Order
  const deleteHandler = (order) => {
    confirmAlert({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete order ID: "${order._id}"?`,
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            try {
              dispatch({ type: 'DELETE_REQUEST' });
              await axios.delete(`/api/orders/${order._id}`, {
                headers: { Authorization: `Bearer ${userInfo.token}` },
              });
              toast.success('Order deleted successfully');
              dispatch({ type: 'DELETE_SUCCESS' });
            } catch (err) {
              toast.error(getError(err));
              dispatch({ type: 'DELETE_FAIL' });
            }
          },
        },
        { label: 'No', onClick: () => toast.info('Order deletion cancelled') },
      ],
    });
  };

  // Delete All Orders
  const deleteAllHandler = () => {
    confirmAlert({
      title: 'Confirm Delete All',
      message: 'Are you sure you want to delete all orders?',
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            try {
              dispatch({ type: 'DELETE_REQUEST' });
              await axios.delete('/api/orders/all', {
                headers: { Authorization: `Bearer ${userInfo.token}` },
              });
              toast.success('All orders deleted successfully');
              dispatch({ type: 'DELETE_SUCCESS' });
            } catch (err) {
              toast.error(getError(err));
              dispatch({ type: 'DELETE_FAIL' });
            }
          },
        },
        { label: 'No', onClick: () => toast.info('Deletion cancelled') },
      ],
    });
  };

  // Update Status
  const updateStatus = async (orderId, field, value) => {
    try {
      await axios.put(
        `/api/orders/${orderId}/statusmessage`,
        { field, value },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      const { data } = await axios.get('/api/orders', {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (err) {
      alert(getError(err));
    }
  };

  // Update Return Status
  const retStatus = async (orderId, field, value) => {
    try {
      await axios.put(
        `/api/orders/${orderId}/returnStatus`,
        { field, value },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      const { data } = await axios.get('/api/orders', {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (err) {
      alert(getError(err));
    }
  };

  // Cancel Order Handler
  const cancelOrderHandler = (order) => {
    confirmAlert({
      title: 'Confirm Cancel',
      message: `Are you sure you want to cancel order ID: "${order._id}"?`,
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            try {
              await axios.put(
                `/api/orders/${order._id}/cancel`,
                { isCancelled: true },
                { headers: { Authorization: `Bearer ${userInfo.token}` } }
              );
              toast.success('Order cancelled successfully');
              const { data } = await axios.get('/api/orders', {
                headers: { Authorization: `Bearer ${userInfo.token}` },
              });
              dispatch({ type: 'FETCH_SUCCESS', payload: data });
            } catch (err) {
              toast.error(getError(err));
            }
          },
        },
        {
          label: 'No',
          onClick: () => toast.info('Order cancellation cancelled'),
        },
      ],
    });
  };

  // Pagination Setup
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const filteredOrders = orders.filter((order) =>
    order._id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const currentOrders = filteredOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder
  );
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="container my-5">
      <Helmet>
        <title>🧾 Admin | Orders</title>
      </Helmet>

      {loadingDelete && <LoadingBox />}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-primary fw-bold">📦 Order Management</h2>
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="🔎 Search by Order ID..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : orders.length === 0 ? (
        <MessageBox>No orders found.</MessageBox>
      ) : (
        <>
          <div className="table-responsive shadow-sm rounded-4 border">
            <table className="table table-hover align-middle text-center mb-0">
              <thead className="table-dark text-uppercase small">
                <tr>
                  <th>Order ID</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Packing</th>
                  <th>Dispatched</th>
                  <th>Out for Delivery</th>
                  <th>Delivered</th>
                  <th>Return Status</th>
                  <th>Refund</th>
                  <th>Change Return Status</th>
                  <th>Cancel</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.map((order) => (
                  <tr key={order._id}>
                    <td className="text-muted small">{order._id}</td>
                    <td>{order.user ? order.user.name : '🛑 Deleted User'}</td>
                    <td>
                      📅 {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="text-success fw-semibold">
                      ₹{order.totalPrice.toFixed(2)}
                    </td>
                    <td>
                      {order.isCancelled ? (
                        ''
                      ) : order.isPaid ? (
                        <span style={{ color: 'green', fontWeight: 'bold' }}>
                          Paid
                        </span>
                      ) : (
                        <span style={{ color: 'red', fontWeight: 'bold' }}>
                          Not Paid
                        </span>
                      )}
                    </td>
                    <td>
                      {order.isCancelled ? (
                        <span style={{ color: 'red', fontWeight: 'bold' }}>
                          ❌ Cancelled
                        </span>
                      ) : order.isDelivered ? (
                        <span style={{ color: 'green', fontWeight: 'bold' }}>
                          ✅ Delivered
                        </span>
                      ) : order.outForDelivery ? (
                        <span style={{ color: 'orange', fontWeight: 'bold' }}>
                          📤 Out for Delivery
                        </span>
                      ) : order.isDispatched ? (
                        <span style={{ color: 'blue', fontWeight: 'bold' }}>
                          🚚 Dispatched
                        </span>
                      ) : order.isPacking ? (
                        <span style={{ color: 'teal', fontWeight: 'bold' }}>
                          📦 Packing
                        </span>
                      ) : (
                        <span style={{ color: 'gray' }}>⌛ Pending</span>
                      )}
                    </td>

                    {order.isPaid && !order.isDelivered ? (
                      <>
                        <td>
                          <Button
                            size="sm"
                            variant={order.isPacking ? 'success' : 'danger'}
                            onClick={() =>
                              updateStatus(
                                order._id,
                                'isPacking',
                                !order.isPacking
                              )
                            }
                          >
                            {order.isPacking ? 'Yes' : 'No'}
                          </Button>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant={order.isDispatched ? 'success' : 'danger'}
                            onClick={() =>
                              updateStatus(
                                order._id,
                                'isDispatched',
                                !order.isDispatched
                              )
                            }
                          >
                            {order.isDispatched ? 'Yes' : 'No'}
                          </Button>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant={
                              order.outForDelivery ? 'success' : 'danger'
                            }
                            onClick={() =>
                              updateStatus(
                                order._id,
                                'outForDelivery',
                                !order.outForDelivery
                              )
                            }
                          >
                            {order.outForDelivery ? 'Yes' : 'No'}
                          </Button>
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant={order.isDelivered ? 'success' : 'danger'}
                            onClick={() =>
                              updateStatus(
                                order._id,
                                'isDelivered',
                                !order.isDelivered
                              )
                            }
                          >
                            {order.isDelivered ? 'Yes' : 'No'}
                          </Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                      </>
                    )}

                    <td>{order.returnStatus || 'N/A'}</td>
                    <td
                      style={{
                        fontWeight: 'bold',
                        color: order.returnedAt ? 'green' : 'red',
                      }}
                    >
                      {order.returnedAt ? 'Yes' : 'No'}
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={order.returnStatus || 'Pending'}
                        onChange={(e) =>
                          retStatus(order._id, 'returnStatus', e.target.value)
                        }
                      >
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>

                    {/* Cancel Button */}
                    <td>
                      {order.isCancelled ? (
                        <span className="badge bg-danger">Cancelled</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="warning"
                          onClick={() => cancelOrderHandler(order)}
                        >
                          ❌ Cancel
                        </Button>
                      )}
                    </td>

                    <td>
                      <Button
                        size="sm"
                        variant="outline-dark"
                        className="rounded-pill px-3"
                        onClick={() => deleteHandler(order)}
                      >
                        🗑️ Delete
                      </Button>
                    </td>
                  </tr>
                ))}

                {/* Delete All Button Row */}
                {orders.length > 0 && (
                  <tr>
                    <td colSpan="16" className="text-end py-2">
                      <div className="d-flex justify-content-end align-items-center">
                        <h5 className="text-success me-3 mb-0">
                          Total Refunds: {refundCount}
                        </h5>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={deleteAllHandler}
                        >
                          🗑️ Delete All
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-center mt-4">
            <Pagination>
              <Pagination.First
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              />
              <Pagination.Prev
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              />
              {[...Array(totalPages).keys()].map((x) => (
                <Pagination.Item
                  key={x + 1}
                  active={x + 1 === currentPage}
                  onClick={() => handlePageChange(x + 1)}
                >
                  {x + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              />
              <Pagination.Last
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          </div>
        </>
      )}
    </div>
  );
}
