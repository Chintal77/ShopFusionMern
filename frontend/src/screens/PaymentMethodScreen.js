// PaymentMethodScreen.js
import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import Axios from 'axios';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../payment.css';

const reducer = (state, action) => {
  switch (action.type) {
    case 'CREATE_REQUEST':
      return { ...state, loading: true };
    case 'CREATE_SUCCESS':
      return { ...state, loading: false };
    case 'CREATE_FAIL':
      return { ...state, loading: false };
    default:
      return state;
  }
};

export default function PaymentMethodScreen() {
  const navigate = useNavigate();
  const [{ loading }, dispatch] = useReducer(reducer, { loading: false });

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const latestOrder = JSON.parse(
    localStorage.getItem('latestOrderSummary') || '{}'
  );
  const cartItems =
    JSON.parse(localStorage.getItem(`orders_${userInfo.email}`) || '[]')?.slice(
      -1
    )[0]?.items || [];

  const shippingAddress = useMemo(() => {
    return latestOrder.deliveryInfo || {};
  }, [latestOrder.deliveryInfo]);
  const itemsPrice = latestOrder.subtotal || 0;
  const taxAmount = latestOrder.taxAmount || 0;
  const shippingCharge = latestOrder.shippingCharge || 0;
  const grandTotal = latestOrder.grandTotal || 0;

  const [paymentMethodName, setPaymentMethod] = useState('');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
  });

  // 🟢 SBI Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [payDisabled, setPayDisabled] = useState(true);

  useEffect(() => {
    if (!userInfo || !userInfo.token) {
      toast.error('⚠️ Please login to access payment');
      navigate('/login');
    } else if (!shippingAddress?.address) {
      navigate('/checkout');
    }
  }, [userInfo, shippingAddress, navigate]);

  // 🟢 Main Place Order Handler
  const placeOrderHandler = async () => {
    if (!paymentMethodName)
      return toast.error('❌ Please select a payment method');

    // If payment method is NOT PayPal → open modal first
    if (paymentMethodName !== 'PayPal' && !showModal) {
      setShowModal(true);
      return;
    }

    // ✅ Validate Card Details
    if (paymentMethodName === 'Card') {
      const { number, expiry, cvv } = cardDetails;
      if (!number || !expiry || !cvv) {
        toast.error('❌ Please fill in all card details.');
        return;
      }
    }

    // ✅ For Paytm Payment Flow
    if (paymentMethodName === 'Paytm') {
      try {
        const { data } = await Axios.post(
          'http://localhost:5040/api/paytm/initiate',
          {
            amount: grandTotal,
            email: userInfo.email,
            orderId: 'ORDER_' + new Date().getTime(),
          }
        );

        if (data.success && data.txnToken) {
          const config = {
            root: '',
            flow: 'DEFAULT',
            data: {
              orderId: data.orderId,
              token: data.txnToken,
              tokenType: 'TXN_TOKEN',
              amount: data.amount,
            },
            handler: {
              notifyMerchant: function (eventName, data) {
                console.log('Payment Event:', eventName, data);
              },
            },
          };

          const paytmMID = process.env.REACT_APP_PAYTM_MID;
          const paytmEnv = process.env.REACT_APP_PAYTM_ENV;

          const paytmScriptURL =
            paytmEnv === 'stage'
              ? `https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/${paytmMID}.js`
              : `https://securegw.paytm.in/merchantpgpui/checkoutjs/merchants/${paytmMID}.js`;

          const script = document.createElement('script');
          script.src = paytmScriptURL;
          script.async = true;

          script.onload = async () => {
            if (window.Paytm && window.Paytm.CheckoutJS) {
              await window.Paytm.CheckoutJS.init(config);
              window.Paytm.CheckoutJS.invoke();
            } else {
              toast.error('Paytm SDK failed to load.');
            }
          };

          document.body.appendChild(script);
        } else {
          toast.error(data.message || 'Paytm initialization failed!');
        }
      } catch (err) {
        console.error(err);
        toast.error('Payment failed!');
      }
      return;
    }

    // ✅ For Other Payment Methods (PhonePe, GPay, Card, COD, etc.)
    try {
      dispatch({ type: 'CREATE_REQUEST' });

      const { data } = await Axios.post(
        '/api/orders',
        {
          orderItems: cartItems,
          shippingAddress,
          paymentMethod: paymentMethodName,
          itemsPrice,
          shippingPrice: shippingCharge,
          taxPrice: taxAmount,
          totalPrice: grandTotal,
        },
        { headers: { authorization: `Bearer ${userInfo.token}` } }
      );

      const createdOrder = data.order;

      // ✅ Mark as paid if not PayPal
      if (paymentMethodName !== 'PayPal') {
        await Axios.put(
          `/api/orders/${createdOrder._id}/pay`,
          {
            isPaid: true,
            paidAt: new Date(),
          },
          {
            headers: { authorization: `Bearer ${userInfo.token}` },
          }
        );
      }

      dispatch({ type: 'CREATE_SUCCESS' });
      localStorage.removeItem(`cartItems_${userInfo.email}`);

      toast.success(
        paymentMethodName !== 'PayPal'
          ? `✅ Payment completed via ${paymentMethodName}`
          : '✅ Order created successfully'
      );

      setShowModal(false);
      navigate(`/order/${createdOrder._id}`);
    } catch (err) {
      dispatch({ type: 'CREATE_FAIL' });
      toast.error('❌ ' + (err.response?.data?.message || err.message));
    }
  };

  const paymentOptions = [
    { id: 'PhonePe', label: 'PhonePe', icon: '/icons/phonepe.png' },
    { id: 'GPay', label: 'GPay', icon: '/icons/gpay.png' },
    { id: 'Paytm', label: 'Paytm', icon: '/icons/paytm.png' },
    { id: 'PayPal', label: 'PayPal', icon: '/icons/paypal.png' },
    { id: 'Card', label: 'Credit/Debit Card', icon: '/icons/card.png' },
  ];

  return (
    <div className="payment-method-wrapper">
      <div className="container small-container">
        <Helmet>
          <title>Payment Method</title>
        </Helmet>
        <h1>🧾 Order Review </h1>

        <div className="main-content">
          {/* Left Column */}
          <div className="left-column">
            <div className="card-container">
              <h4>🛍️ Cart Items</h4>
              {cartItems.map((item) => (
                <div key={item.slug} className="cart-item">
                  <div className="item-name">{item.name}</div>
                  <div className="item-price">
                    {item.quantity} x ₹{item.price} = ₹
                    {item.quantity * item.price}
                  </div>
                </div>
              ))}
            </div>

            <div className="card-container">
              <h4>📦 Shipping Address</h4>
              <p>
                {shippingAddress.name}, {shippingAddress.phone}
              </p>
              <p>
                {shippingAddress.address}, {shippingAddress.landmark}
              </p>
              <p>
                {shippingAddress.city}, {shippingAddress.state} -{' '}
                {shippingAddress.pin}
              </p>
              <p>{shippingAddress.country}</p>
            </div>

            <div className="d-grid mt-4">
              <Button
                type="button"
                onClick={placeOrderHandler}
                className="btn btn-success"
                disabled={cartItems.length === 0}
              >
                Continue
              </Button>
            </div>
          </div>

          {/* Right Column */}
          <div className="right-column">
            <div className="card-container">
              <h4>💰 Payment Summary</h4>
              <ul className="summary-list">
                <li>
                  <span>Subtotal:</span> ₹{itemsPrice.toFixed(2)}
                </li>
                <li>
                  <span>Tax:</span> ₹{taxAmount.toFixed(2)}
                </li>
                <li>
                  <span>Shipping:</span> ₹{shippingCharge.toFixed(2)}
                </li>
                <li>
                  <strong>Total:</strong> ₹{grandTotal.toFixed(2)}
                </li>
              </ul>
            </div>

            <div className="card-container">
              <h4>💳 Select Payment Method</h4>
              <Form>
                {paymentOptions.map((method) => (
                  <div
                    key={method.id}
                    className={`payment-option ${
                      paymentMethodName === method.id ? 'selected' : ''
                    }`}
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    <Form.Check
                      inline
                      name="paymentMethod"
                      type="radio"
                      id={method.id}
                      value={method.id}
                      checked={paymentMethodName === method.id}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <img
                      src={method.icon}
                      alt={method.label}
                      className="payment-icon"
                    />
                    <label htmlFor={method.id}>{method.label}</label>
                  </div>
                ))}

                {paymentMethodName === 'Card' && (
                  <div className="card-details">
                    <Form.Group className="mb-3" controlId="cardNumber">
                      <Form.Label>Card Number</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardDetails.number}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            number: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="expiry">
                      <Form.Label>Expiry Date</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="MM/YY"
                        value={cardDetails.expiry}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            expiry: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="cvv">
                      <Form.Label>CVV</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="123"
                        value={cardDetails.cvv}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            cvv: e.target.value,
                          })
                        }
                      />
                    </Form.Group>
                  </div>
                )}
              </Form>
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 SBI Account Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Select Your SBI Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Select
            value={selectedAccount}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setPayDisabled(false);
            }}
          >
            <option value="">-- Select Account --</option>
            <option value="SBI-1234">SBI Savings - ****1234</option>
            <option value="SBI-5678">SBI Current - ****5678</option>
          </Form.Select>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={placeOrderHandler}
            disabled={payDisabled || loading}
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
