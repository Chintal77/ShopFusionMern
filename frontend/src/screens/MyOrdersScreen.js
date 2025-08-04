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
import { toast } from 'react-toastify';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { Store } from '../Store';
import { getError } from '../utils';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
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

  function createOrder(data, actions) {
    return actions.order
      .create({
        purchase_units: [
          {
            amount: { value: order.totalPrice },
          },
        ],
      })
      .then((orderID) => orderID);
  }

  function onApprove(data, actions) {
    return actions.order.capture().then(async function (details) {
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
  }

  function onError(err) {
    toast.error(getError(err));
  }

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
              {order.isDelivered ? (
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
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Payment</Card.Title>
              {order.isPaid ? (
                <MessageBox variant="success">
                  Paid at{' '}
                  {new Date(order.paidAt).toLocaleString('en-IN', {
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

          {/* Items */}
          <Card className="mb-3 card-items">
            <Card.Body>
              <Card.Title>Items</Card.Title>
              <ListGroup variant="flush">
                {order.orderItems.map((item) => (
                  <ListGroup.Item key={item._id}>
                    <div className="item-row">
                      <img src={item.image} alt={item.name} />
                      <div className="item-details">
                        <div className="item-name">{item.name}</div>
                        <div className="item-qty">Qty: {item.quantity}</div>
                        <div className="item-price">
                          Price: ₹{item.price.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
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

          {/* Display Payment Method */}
          {!order.isPaid && (
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
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
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
          )}
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
