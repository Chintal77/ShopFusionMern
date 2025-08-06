import axios from 'axios';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ListGroup from 'react-bootstrap/ListGroup';
import Card from 'react-bootstrap/Card';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { toast } from 'react-toastify';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { Store } from '../Store';
import { getError } from '../utils';
import '../orders.css';

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, order: action.payload, error: '' };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'PAY_REQUEST':
      return { ...state, loadingPay: true };
    case 'PAY_SUCCESS':
      return { ...state, loadingPay: false, successPay: true };
    case 'PAY_FAIL':
      return { ...state, loadingPay: false };
    case 'PAY_RESET':
      return { ...state, loadingPay: false, successPay: false };
    default:
      return state;
  }
}

function calculateReturnTimeLeft(deliveredAt, returnDays) {
  const returnEndDate = new Date(
    new Date(deliveredAt).getTime() + returnDays * 24 * 60 * 60 * 1000
  );
  const now = new Date();
  const diff = returnEndDate - now;

  if (diff <= 0) return 'expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default function OrderScreen() {
  const { state } = useContext(Store);
  const { userInfo } = state;

  const params = useParams();
  const { id: orderId } = params;
  const navigate = useNavigate();

  const [{ loading, error, order, successPay, loadingPay }, dispatch] =
    useReducer(reducer, {
      loading: true,
      order: {},
      error: '',
      successPay: false,
      loadingPay: false,
    });

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const [returnTimers, setReturnTimers] = useState({});

  const paymentOptions = [
    { id: 'PhonePe', label: 'PhonePe', icon: '/icons/phonepe.png' },
    { id: 'GPay', label: 'GPay', icon: '/icons/gpay.png' },
    { id: 'Paytm', label: 'Paytm', icon: '/icons/paytm.png' },
    { id: 'PayPal', label: 'PayPal', icon: '/icons/paypal.png' },
    { id: 'Card', label: 'Credit/Debit Card', icon: '/icons/card.png' },
  ];

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/orders/${orderId}`, {
          headers: { authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
        setSelectedPaymentMethod(data.paymentMethod || '');
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };

    if (!userInfo) {
      return navigate('/login');
    }

    if (!order._id || successPay || (order._id && order._id !== orderId)) {
      fetchOrder();
      if (successPay) {
        dispatch({ type: 'PAY_RESET' });
      }
    } else {
      const loadPaypalScript = async () => {
        const { data: clientId } = await axios.get('/api/keys/paypal', {
          headers: { authorization: `Bearer ${userInfo.token}` },
        });
        paypalDispatch({
          type: 'resetOptions',
          value: {
            'client-id': clientId,
            currency: 'USD',
          },
        });
        paypalDispatch({ type: 'setLoadingStatus', value: 'pending' });
      };
      loadPaypalScript();
    }
  }, [order, userInfo, orderId, navigate, paypalDispatch, successPay]);

  useEffect(() => {
    if (!order.orderItems || !order.isDelivered) return;

    const interval = setInterval(() => {
      const updatedTimers = {};
      order.orderItems.forEach((item) => {
        const policyMatch = item?.product?.returnPolicy?.match(/^(\d+)-day/i);
        const returnDays = policyMatch ? parseInt(policyMatch[1], 10) : 0;

        if (returnDays && order.updatedAt) {
          const timeLeft = calculateReturnTimeLeft(order.updatedAt, returnDays);
          updatedTimers[item._id] = timeLeft;
        }
      });
      setReturnTimers(updatedTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [order]);

  const handleReturn = async (item) => {
    try {
      await axios.post(
        `/api/orders/${orderId}/return`,
        { itemId: item._id },
        {
          headers: { authorization: `Bearer ${userInfo.token}` },
        }
      );
      toast.success('Return request submitted');
      const { data: updatedOrder } = await axios.get(`/api/orders/${orderId}`, {
        headers: { authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: 'FETCH_SUCCESS', payload: updatedOrder });
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const createOrder = (data, actions) =>
    actions.order
      .create({
        purchase_units: [{ amount: { value: order.totalPrice } }],
      })
      .then((orderID) => orderID);

  const onApprove = (data, actions) =>
    actions.order.capture().then(async (details) => {
      try {
        dispatch({ type: 'PAY_REQUEST' });
        const { data } = await axios.put(
          `/api/orders/${order._id}/pay`,
          details,
          {
            headers: { authorization: `Bearer ${userInfo.token}` },
          }
        );
        dispatch({ type: 'PAY_SUCCESS', payload: data });
        toast.success('Order is paid');
      } catch (err) {
        dispatch({ type: 'PAY_FAIL', payload: getError(err) });
        toast.error(getError(err));
      }
    });

  const onError = (err) => toast.error(getError(err));

  const savePaymentMethod = async () => {
    try {
      await axios.put(
        `/api/orders/${orderId}/payment-method`,
        { paymentMethod: selectedPaymentMethod },
        {
          headers: { authorization: `Bearer ${userInfo.token}` },
        }
      );
      toast.success('Payment method updated successfully');
      const { data: updatedOrder } = await axios.get(`/api/orders/${orderId}`, {
        headers: { authorization: `Bearer ${userInfo.token}` },
      });
      dispatch({ type: 'FETCH_SUCCESS', payload: updatedOrder });
      setShowCardModal(false);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const renderOrderProgress = () => {
    const steps = [
      { label: 'Order Placed', completed: true },
      { label: 'Packing', completed: order.isPacking },
      { label: 'Dispatched', completed: order.isDispatched },
      { label: 'Out for Delivery', completed: order.outForDelivery },
      { label: 'Delivered', completed: order.isDelivered },
    ];

    return (
      <div className="order-progress">
        {steps.map((step, index) => {
          const isCurrent = step.isCurrent;
          const isCompleted = step.completed;
          const icon =
            index === 0 && !order.isPaid && !order.isDelivered
              ? '❗'
              : isCompleted
              ? '✓'
              : isCurrent
              ? '🕒'
              : index + 1;

          return (
            <div
              key={index}
              className={`step ${isCompleted ? 'completed' : ''} ${
                isCurrent ? 'current' : ''
              }`}
            >
              <div className="circle">{icon}</div>
              <div className="label">{step.label}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return loading ? (
    <LoadingBox />
  ) : error ? (
    <MessageBox variant="danger">{error}</MessageBox>
  ) : (
    <div className="container">
      <Helmet>
        <title>Order {orderId}</title>
      </Helmet>
      <h1 className="my-3">Order {orderId}</h1>

      {order.isCancelled && (
        <Card className="mb-4 border-danger border-2 shadow-lg bg-light bg-gradient">
          <Card.Body>
            <div className="d-flex align-items-center mb-2">
              <i className="bi bi-x-octagon-fill text-danger fs-3 me-3"></i>
              <Card.Title className="text-danger fw-bold mb-0 fs-4">
                Order Cancelled
              </Card.Title>
            </div>
            <Card.Text className="text-dark">
              <div className="text-secondary mb-2">
                This order was cancelled on{' '}
                <strong>
                  {new Date(
                    order.cancelledAt || order.updatedAt
                  ).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </strong>
              </div>
              <div
                className="px-3 py-2 mt-2 rounded fw-semibold text-white"
                style={{
                  backgroundColor: '#dc3545', // Bootstrap danger color
                  display: 'inline-block',
                  fontSize: '0.95rem',
                }}
              >
                {order.cancelledBy === 'admin'
                  ? 'Cancelled by Admin'
                  : 'Automatically cancelled due to non-payment'}
              </div>
            </Card.Text>
          </Card.Body>
        </Card>
      )}

      {renderOrderProgress()}
      <Row>
        <Col md={8}>
          {/* Shipping Info */}
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Shipping</Card.Title>
              <Card.Text>
                <strong>Name:</strong> {order.shippingAddress.name} <br />
                <strong>Address:</strong> {order.shippingAddress.address},{' '}
                {order.shippingAddress.city}, {order.shippingAddress.pin},{' '}
                {order.shippingAddress.country}
              </Card.Text>
              {order.isCancelled ? null : order.isDelivered ? (
                <MessageBox variant="success">
                  Delivered to <strong>{order.shippingAddress.name}</strong>
                  <br />
                  at{' '}
                  {new Date(order.updatedAt).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </MessageBox>
              ) : (
                <MessageBox variant="danger" style={{ color: 'red' }}>
                  Not Delivered
                </MessageBox>
              )}
            </Card.Body>
          </Card>

          {/* Payment Status */}
          {!order.isCancelled && (
            <Card className="mb-3">
              <Card.Body>
                <Card.Title>Payment</Card.Title>
                {order.isPaid ? (
                  <MessageBox variant="success">
                    Paid at{' '}
                    {new Date(order.updatedAt).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </MessageBox>
                ) : (
                  <MessageBox variant="danger">Not Paid</MessageBox>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Items */}
          <div className="bg-white shadow rounded-3 p-4 mb-5">
            <h2 className="fs-4 fw-semibold mb-4 text-dark">Order Items</h2>

            <div className="d-flex flex-column gap-3">
              {order.orderItems.map((item) => {
                const policyMatch =
                  item.product?.returnPolicy?.match(/^(\d+)-day/i);
                const returnDays = policyMatch
                  ? parseInt(policyMatch[1], 10)
                  : 0;
                const timeLeft = returnTimers[item._id];

                return (
                  <div
                    key={item._id}
                    className="d-flex align-items-start gap-3 border rounded-3 p-3 hover-shadow transition"
                    style={{ borderColor: '#dee2e6' }}
                  >
                    {/* Image */}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="rounded border"
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                      }}
                    />

                    {/* Details Grid */}
                    <div className="flex-grow-1 row small text-secondary">
                      <div className="col-sm-6 mb-2">
                        <div className="fw-medium text-dark">{item.name}</div>
                        <div>
                          Quantity: <strong>{item.quantity}</strong>
                        </div>
                        <div>Price: ₹{item.price.toLocaleString('en-IN')}</div>
                      </div>

                      {order.isDelivered &&
                        item.product?.returnPolicy &&
                        returnDays > 0 &&
                        order.updatedAt && (
                          <div className="col-sm-6 mt-2 mt-sm-0">
                            {timeLeft && timeLeft !== 'expired' ? (
                              <>
                                <button
                                  className="btn btn-sm btn-danger mb-1"
                                  onClick={() => handleReturn(item)}
                                >
                                  Return Item
                                </button>
                                <div className="text-muted small">
                                  Time left: <strong>{timeLeft}</strong>
                                </div>
                              </>
                            ) : (
                              <div className="text-muted small">
                                Return window ({returnDays} days) closed.
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Col>

        {/* Order Summary & Payment Method */}
        <Col md={4}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Order Summary</Card.Title>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>Items</Col>
                    <Col>₹{order.itemsPrice.toFixed(2)}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Shipping</Col>
                    <Col>₹{order.shippingPrice.toFixed(2)}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>Tax</Col>
                    <Col>₹{order.taxPrice.toFixed(2)}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>
                      <strong>Order Total</strong>
                    </Col>
                    <Col>
                      <strong>₹{order.totalPrice.toFixed(2)}</strong>
                    </Col>
                  </Row>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>

          {/* Display Payment Method or Cancel Button for Admin */}
          {/* Display Payment Method or Cancel Button for Admin */}
          {!order.isPaid &&
            (userInfo.isAdmin ? (
              order.isCancelled ? (
                <Button variant="secondary" className="w-100" disabled>
                  Order Cancelled
                </Button>
              ) : (
                <Button
                  variant="danger"
                  className="w-100"
                  onClick={async () => {
                    try {
                      await axios.put(
                        `/api/orders/${orderId}/cancel`,
                        {},
                        {
                          headers: {
                            authorization: `Bearer ${userInfo.token}`,
                          },
                        }
                      );
                      toast.success('Order cancelled successfully');
                      const { data: updatedOrder } = await axios.get(
                        `/api/orders/${orderId}`,
                        {
                          headers: {
                            authorization: `Bearer ${userInfo.token}`,
                          },
                        }
                      );
                      dispatch({
                        type: 'FETCH_SUCCESS',
                        payload: updatedOrder,
                      });
                    } catch (err) {
                      toast.error(getError(err));
                    }
                  }}
                >
                  Cancel Order
                </Button>
              )
            ) : order.isCancelled ? (
              <MessageBox variant="danger">
                {order.cancelledBy === 'admin'
                  ? 'Order was cancelled by admin.'
                  : 'Order was automatically cancelled due to non-payment within the expected time window.'}
              </MessageBox>
            ) : (
              <Form>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {paymentOptions.map((method) => (
                    <div
                      key={method.id}
                      className={`d-flex align-items-center border rounded px-3 py-2 ${
                        selectedPaymentMethod === method.id
                          ? 'border-primary bg-light'
                          : ''
                      }`}
                      style={{ cursor: 'pointer', minWidth: '200px' }}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    >
                      <Form.Check
                        inline
                        name="paymentMethod"
                        type="radio"
                        id={method.id}
                        value={method.id}
                        checked={selectedPaymentMethod === method.id}
                        onChange={(e) =>
                          setSelectedPaymentMethod(e.target.value)
                        }
                        className="me-2"
                      />
                      <img
                        src={method.icon}
                        alt={method.label}
                        className="me-2"
                        style={{
                          width: '22px',
                          height: '22px',
                          objectFit: 'contain',
                        }}
                      />
                      <label htmlFor={method.id} className="mb-0 small">
                        {method.label}
                      </label>
                    </div>
                  ))}
                </div>

                {/* PayPal Buttons */}
                {selectedPaymentMethod === 'PayPal' && (
                  <div className="mt-3">
                    {isPending ? (
                      <LoadingBox />
                    ) : (
                      <PayPalButtons
                        createOrder={createOrder}
                        onApprove={onApprove}
                        onError={onError}
                      />
                    )}
                    {loadingPay && <LoadingBox />}
                  </div>
                )}
              </Form>
            ))}
        </Col>
      </Row>

      {/* Card Modal */}
      <Modal
        show={showCardModal}
        onHide={() => setShowCardModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Enter Card Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="cardNumber">
              <Form.Label>Card Number</Form.Label>
              <Form.Control
                type="text"
                value={cardDetails.cardNumber}
                onChange={(e) =>
                  setCardDetails({ ...cardDetails, cardNumber: e.target.value })
                }
                placeholder="XXXX XXXX XXXX XXXX"
              />
            </Form.Group>
            <Form.Group controlId="expiry" className="mt-2">
              <Form.Label>Expiry Date</Form.Label>
              <Form.Control
                type="text"
                value={cardDetails.expiry}
                onChange={(e) =>
                  setCardDetails({ ...cardDetails, expiry: e.target.value })
                }
                placeholder="MM/YY"
              />
            </Form.Group>
            <Form.Group controlId="cvv" className="mt-2">
              <Form.Label>CVV</Form.Label>
              <Form.Control
                type="password"
                value={cardDetails.cvv}
                onChange={(e) =>
                  setCardDetails({ ...cardDetails, cvv: e.target.value })
                }
                placeholder="***"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCardModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={savePaymentMethod}>
            Save & Proceed
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
