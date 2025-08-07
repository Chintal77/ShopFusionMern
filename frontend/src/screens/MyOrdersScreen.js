import axios from 'axios';
import React, {
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
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

  const [showStepModal, setShowStepModal] = useState(false);
  const [hoveredStep, setHoveredStep] = useState('');
  const [gifExists, setGifExists] = useState(false);

  useEffect(() => {
    if (!hoveredStep) return;

    const gifPath = `/animations/${hoveredStep
      .toLowerCase()
      .replace(/\s/g, '_')}.gif`;
    const img = new Image();

    img.onload = () => {
      setGifExists(true);
      setShowStepModal(true);
    };
    img.onerror = () => {
      setGifExists(false);
      setShowStepModal(false); // Don't show modal if GIF is missing
    };

    img.src = gifPath;
  }, [hoveredStep]);

  const timeoutRef = useRef(null);

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

  const {
    isPaid = false,
    isPacking = false,
    isDispatched = false,
    outForDelivery = false,
    isDelivered = false,
  } = order;

  const [refundCredited, setRefundCredited] = useState(false);

  const steps = [];

  if (order.returnStatus === 'Approved') {
    if (refundCredited) {
      steps.push({ label: 'Refund Credited', icon: '✅' });
    } else {
      steps.push({ label: 'Refund Initiated', icon: '💸' });
    }
  } else {
    if (isPaid) steps.push({ label: 'Order Placed', icon: '📝' });
    if (isPacking) steps.push({ label: 'Packing', icon: '📦' });
    if (isDispatched) steps.push({ label: 'Dispatched', icon: '🚚' });
    if (outForDelivery) steps.push({ label: 'Out for Delivery', icon: '🛵' });
    if (isDelivered) steps.push({ label: 'Delivered', icon: '✅' });
  }

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [returnedItemId, setReturnedItemId] = useState(null);

  const [, setReturnTimers] = useState({});

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

  useEffect(() => {
    if (order.returnStatus === 'Approved' && order.returnedAt) {
      const returnedTime = new Date(order.returnedAt).getTime();
      const now = new Date().getTime();
      const diffMs = now - returnedTime;

      if (diffMs >= 2 * 60 * 1000) {
        setRefundCredited(true); // Already passed 5 min
      } else {
        const remainingTime = 5 * 60 * 1000 - diffMs;
        const timer = setTimeout(() => {
          setRefundCredited(true);
        }, remainingTime);
        return () => clearTimeout(timer); // cleanup
      }
    }
  }, [order.returnStatus, order.returnedAt]);

  const handleReturn = async (item) => {
    try {
      const reason = prompt(
        'Enter reason for return:',
        'Product was defective'
      );
      if (!reason) {
        toast.info('Return cancelled. Reason required.');
        return;
      }

      const { data } = await axios.put(
        `/api/orders/${orderId}/return`,
        {
          itemId: item._id, // ✅ send itemId here
          returnReason: reason, // ✅ send reason
        },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );

      toast.success(`Return successful: ${data.message}`);
      setReturnedItemId(item._id); // ✅ update UI for returned item

      // Re-fetch updated order
      const { data: updatedOrder } = await axios.get(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
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

  const renderOrderProgress = () => (
    <div className="order-progress d-flex justify-content-between flex-wrap">
      {steps.map((step, index) => (
        <div
          key={index}
          className="step text-center m-2"
          onMouseEnter={() => {
            clearTimeout(timeoutRef.current);
            setHoveredStep(step.label);
            setShowStepModal(true);
          }}
        >
          <div className="icon fs-3">{step.icon}</div>
          <div className="label fw-bold">{step.label}</div>
        </div>
      ))}
    </div>
  );

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
                  {new Intl.DateTimeFormat('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  }).format(new Date(order.updatedAt))}
                </MessageBox>
              ) : (
                <MessageBox variant="danger" style={{ color: 'red' }}>
                  Not Delivered
                </MessageBox>
              )}
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Payment</Card.Title>

              {order.returnStatus !== 'Approved' &&
                (order.isPaid ? (
                  <MessageBox variant="success">
                    <p>Method: {order.paymentMethod}</p>
                    Paid at{' '}
                    {new Intl.DateTimeFormat('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    }).format(new Date(order.paidAt))}
                  </MessageBox>
                ) : (
                  <MessageBox variant="danger">Not Paid</MessageBox>
                ))}

              {/* ✅ Refund message */}
              {order.returnStatus === 'Approved' && (
                <MessageBox variant="info">
                  {refundCredited
                    ? 'Refunded amount credited in your account.'
                    : 'Refund is initiated in your original mode of payment.'}
                </MessageBox>
              )}
            </Card.Body>
          </Card>

          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Order Items</Card.Title>
              <ListGroup variant="flush">
                {order.orderItems.map((item) => {
                  const product = item.product || {};
                  const returnPolicy = product.returnPolicy || '0-day';
                  const match = returnPolicy.match(/^(\d+)-day/);
                  const returnDays = match ? parseInt(match[1]) : 0;

                  const deliveredAt = new Date(order.updatedAt);
                  const now = new Date();
                  const returnEnd = new Date(
                    deliveredAt.getTime() + returnDays * 24 * 60 * 60 * 1000
                  );
                  const returnExpired = now > returnEnd;

                  // Calculate time left
                  let timeLeft = '';
                  if (!returnExpired) {
                    const diff = returnEnd - now;
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                    const minutes = Math.floor((diff / (1000 * 60)) % 60);
                    timeLeft = `${days}d ${hours}h ${minutes}m`;
                  }

                  return (
                    <ListGroup.Item key={item._id} className="py-3">
                      <Row className="align-items-center small">
                        <Col md={6} className="d-flex align-items-center">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="img-fluid rounded img-thumbnail me-3"
                            style={{ maxWidth: '80px' }}
                          />
                          <div>
                            <div className="fw-semibold text-dark">
                              {item.name}
                            </div>
                            <div>
                              Quantity: <strong>{item.quantity}</strong>
                            </div>
                            <div>
                              Price: ₹{item.price.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </Col>

                        <Col md={6} className="text-end">
                          {order.isDelivered && returnDays > 0 && (
                            <>
                              {!order.returnRequested ? (
                                <>
                                  <button
                                    className="btn btn-sm btn-outline-danger mb-1"
                                    onClick={handleReturn}
                                  >
                                    Return Item
                                  </button>
                                  <div className="text-muted small">
                                    Time left: <strong>{timeLeft}</strong>
                                  </div>
                                </>
                              ) : (
                                <span className="text-warning fw-bold">
                                  Return Status: {order.returnStatus}
                                </span>
                              )}
                            </>
                          )}

                          {returnDays <= 0 && (
                            <div className="text-muted small">
                              Return window ({returnDays} days) closed.
                            </div>
                          )}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card.Body>
          </Card>
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
      <div>
        <Modal
          show={showStepModal && gifExists}
          onHide={() => setShowStepModal(false)}
          centered
          contentClassName="p-0 fade-modal"
        >
          <Modal.Body className="text-center p-3">
            <h5 className="mb-3">{hoveredStep}</h5>
            <img
              src={`/animations/${hoveredStep
                ?.toLowerCase()
                .replace(/\s/g, '_')}.gif`}
              alt={hoveredStep}
              style={{ width: '100%', maxWidth: '300px', height: 'auto' }}
            />
          </Modal.Body>
        </Modal>
      </div>
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
