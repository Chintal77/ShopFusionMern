import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../checkout.css';

function CheckoutScreen({ cartItems, setCartItems }) {
  const [productsInCart, setProductsInCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pin, setPin] = useState('');
  const [country, setCountry] = useState('');
  const [isDeliverySaved, setIsDeliverySaved] = useState(false);

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

  useEffect(() => {
    document.title = 'Shopfusion | Checkout';
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching products:', error);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      setProductsInCart([]);
      return;
    }
    const cartProductSlugs = cartItems.map((item) => item.slug);
    const filtered = products.filter((product) =>
      cartProductSlugs.includes(product.slug)
    );
    setProductsInCart(filtered);
  }, [products, cartItems]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('deliveryInfo') || '{}');
    if (saved.phone) {
      localStorage.removeItem('deliveryInfo');
      toast.info(
        '🗑️ Previous delivery info cleared. Please enter new details.',
        {
          autoClose: 3000,
        }
      );
    }

    setPhone('');
    setAddress('');
    setLandmark('');
    setCity('');
    setStateName('');
    setPin('');
    setCountry('');
    setIsDeliverySaved(false);
  }, []);

  const totalAmount = productsInCart.reduce((acc, product) => {
    const cartItem = cartItems.find((item) => item.slug === product.slug);
    const quantity = cartItem ? cartItem.quantity : 0;
    const discountMatch = product.badge?.match(/(\d+)%/);
    const discount = discountMatch ? parseInt(discountMatch[1]) : 0;
    const finalPrice =
      product.price - Math.round((product.price * discount) / 100);
    return acc + finalPrice * quantity;
  }, 0);

  const taxAmount = Math.round(totalAmount * 0.18);
  const shippingCharge = totalAmount >= 1000 ? 0 : 50;
  const grandTotal = totalAmount + taxAmount + shippingCharge;
  const shippingMessage =
    shippingCharge === 0
      ? '🎉 Free Shipping applied (on orders ₹1000+)'
      : '🚚 Shipping Charges Applied (Subtotal < ₹1000)';

  const estimatedDeliveryDate = new Date();
  estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);
  const deliveryDateStr = estimatedDeliveryDate.toDateString();

  const handleSaveDeliveryInfo = () => {
    if (!phone || !address || !city || !stateName || !pin || !country) {
      toast.error('🚚 Please fill in all required delivery fields.', {
        position: 'top-center',
        autoClose: 3000,
      });
      return;
    }

    const deliveryDetails = {
      name: userInfo.name,
      email: userInfo.email,
      phone,
      address,
      landmark,
      city,
      state: stateName,
      pin,
      country,
    };

    localStorage.setItem('deliveryInfo', JSON.stringify(deliveryDetails));
    setIsDeliverySaved(true);
    toast.success('✅ Delivery Info Saved!', { autoClose: 2000 });
  };

  const handlePlaceOrder = () => {
    if (totalAmount === 0 || productsInCart.length === 0) {
      toast.error('🛒 Please add items to your cart to proceed.', {
        position: 'top-center',
        autoClose: 3000,
      });
      return;
    }

    const savedDelivery = JSON.parse(
      localStorage.getItem('deliveryInfo') || '{}'
    );

    if (!savedDelivery.phone || !savedDelivery.address || !savedDelivery.city) {
      toast.error('🚚 Please save your delivery info before proceeding.', {
        position: 'top-center',
        autoClose: 3000,
      });
      return;
    }

    const order = {
      date: new Date().toLocaleString(),
      status: 'Pending Payment',
      paymentMode: 'Not Selected',
      deliveryDate: deliveryDateStr,
      deliveryInfo: savedDelivery,
      items: productsInCart.map((product) => {
        const cartItem = cartItems.find((item) => item.slug === product.slug);
        const quantity = cartItem ? cartItem.quantity : 0;
        const discountMatch = product.badge?.match(/(\d+)%/);
        const discount = discountMatch ? parseInt(discountMatch[1]) : 0;
        const finalPrice =
          product.price - Math.round((product.price * discount) / 100);
        return {
          slug: product.slug,
          name: product.name,
          image: product.image,
          quantity,
          price: finalPrice,
        };
      }),
      subtotal: totalAmount,
      tax: taxAmount,
      shipping: shippingCharge,
      total: grandTotal,
    };

    const existingOrders = JSON.parse(
      localStorage.getItem(`orders_${userInfo.email}`) || '[]'
    );
    existingOrders.push(order);
    localStorage.setItem(
      `orders_${userInfo.email}`,
      JSON.stringify(existingOrders)
    );

    localStorage.setItem(
      'latestOrderSummary',
      JSON.stringify({
        subtotal: totalAmount,
        taxAmount,
        shippingCharge,
        grandTotal,
        deliveryInfo: savedDelivery,
      })
    );

    setCartItems([]);
    localStorage.removeItem(`cartItems_${userInfo.email}`);
    navigate('/payment');
  };

  if (!userInfo.name) {
    navigate('/login?redirect=/checkout');
    return null;
  }

  return (
    <div className="container my-4">
      <h2 className="mb-4">🧾 Checkout Summary</h2>

      {totalAmount >= 1000 && (
        <div className="alert alert-success">
          🎁 You’re eligible for <strong>Free Shipping</strong>! (Orders ₹1000+)
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3">Loading your cart...</p>
        </div>
      ) : (
        <div className="row">
          <div className="col-md-7">
            <div className="card mb-4">
              <div className="card-header bg-light">🛒 Items in Your Cart</div>
              <ul className="list-group list-group-flush">
                {productsInCart.length === 0 ? (
                  <li className="list-group-item text-muted">
                    Your cart is empty.
                  </li>
                ) : (
                  productsInCart.map((product) => {
                    const cartItem = cartItems.find(
                      (item) => item.slug === product.slug
                    );
                    const quantity = cartItem ? cartItem.quantity : 0;
                    const discountMatch = product.badge?.match(/(\d+)%/);
                    const discount = discountMatch
                      ? parseInt(discountMatch[1])
                      : 0;
                    const finalPrice =
                      product.price -
                      Math.round((product.price * discount) / 100);
                    const subtotal = finalPrice * quantity;

                    return (
                      <li
                        key={product.slug}
                        className="list-group-item d-flex align-items-center"
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="img-thumbnail me-3"
                          style={{ width: '80px', height: '80px' }}
                        />
                        <div>
                          <h6 className="mb-1">{product.name}</h6>
                          <small className="text-muted">
                            ID: {product._id}
                          </small>
                          <div>
                            Qty: <strong>{quantity}</strong>
                          </div>
                          <div>
                            Price: ₹{finalPrice.toLocaleString('en-IN')} each
                          </div>
                          <div className="fw-bold">
                            Subtotal: ₹{subtotal.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>

          <div className="col-md-5">
            <div className="card mb-4">
              <div className="card-header bg-light">📦 Delivery Info</div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    value={userInfo.name}
                    disabled
                    className="form-control"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={userInfo.email}
                    disabled
                    className="form-control"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Landmark</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">PIN Code</label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="form-control"
                  />
                </div>
                <button
                  onClick={handleSaveDeliveryInfo}
                  className="btn btn-outline-primary w-100"
                >
                  💾 Save Delivery Info
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header bg-light">💳 Payment Summary</div>
              <div className="card-body">
                <p>Subtotal: ₹{totalAmount.toLocaleString('en-IN')}</p>
                <p>Tax (18% GST): ₹{taxAmount.toLocaleString('en-IN')}</p>
                <p
                  className={
                    shippingCharge === 0 ? 'text-success' : 'text-danger'
                  }
                >
                  Shipping Charges: ₹{shippingCharge.toLocaleString('en-IN')}
                </p>
                <small className="text-muted">{shippingMessage}</small>
                <hr />
                <h5>Grand Total: ₹{grandTotal.toLocaleString('en-IN')}</h5>
                <p>
                  📦 Estimated Delivery: <strong>{deliveryDateStr}</strong>
                </p>

                {isDeliverySaved && (
                  <div className="alert alert-info mt-3">
                    <h6>📍 Shipping Address:</h6>
                    <p>
                      {userInfo.name}, {phone}
                    </p>
                    <p>
                      {address}, {landmark}
                    </p>
                    <p>
                      {city}, {stateName} - {pin}
                    </p>
                    <p>{country}</p>
                  </div>
                )}

                <button
                  onClick={handlePlaceOrder}
                  className="btn btn-success w-100"
                >
                  💸 Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckoutScreen;
