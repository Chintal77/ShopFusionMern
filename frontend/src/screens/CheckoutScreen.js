import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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

  // Adjusted: Filter products based on array of cartItems
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

  // Auto-clear delivery info on entering /checkout
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

  // Calculate total amount using array cartItems
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
    <div className="checkout-container">
      <h2 className="checkout-title">🧾 Checkout Summary</h2>
      {totalAmount >= 1000 && (
        <div className="free-shipping-banner">
          🎁 You’re eligible for <strong>Free Shipping</strong>! (Orders ₹1000+)
        </div>
      )}

      {loading ? (
        <p className="loading-message">Loading your cart...</p>
      ) : (
        <div className="checkout-grid">
          <div className="cart-items">
            <h3 className="section-title">🛒 Items in Your Cart</h3>
            {productsInCart.length === 0 ? (
              <p className="empty-cart">Your cart is empty.</p>
            ) : (
              productsInCart.map((product) => {
                const cartItem = cartItems.find(
                  (item) => item.slug === product.slug
                );
                const quantity = cartItem ? cartItem.quantity : 0;
                const discountMatch = product.badge?.match(/(\d+)%/);
                const discount = discountMatch ? parseInt(discountMatch[1]) : 0;
                const finalPrice =
                  product.price - Math.round((product.price * discount) / 100);
                const subtotal = finalPrice * quantity;

                return (
                  <div key={product.slug} className="cart-item">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="product-image"
                    />
                    <div>
                      <h4 className="product-name">{product.name}</h4>
                      <p className="product-id">ID: {product._id}</p>
                      <p>
                        Qty: <strong>{quantity}</strong>
                      </p>
                      <p>Price: ₹{finalPrice.toLocaleString('en-IN')} each</p>
                      <p className="subtotal">
                        Subtotal: ₹{subtotal.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="summary-box">
            <h3 className="section-title">📦 Delivery Info</h3>
            <div className="delivery-info-form">
              <div className="form-group">
                <label>Name:</label>
                <input type="text" value={userInfo.name} disabled />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input type="email" value={userInfo.email} disabled />
              </div>
              <div className="form-group">
                <label>Phone:</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Address:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Landmark:</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>City:</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>State:</label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>PIN Code:</label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Country:</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <button
                className="save-delivery-btn"
                onClick={handleSaveDeliveryInfo}
              >
                💾 Save Delivery Info
              </button>
            </div>

            <h3 className="section-title">💳 Payment Summary</h3>
            <div className="price-row">
              Subtotal: ₹{totalAmount.toLocaleString('en-IN')}
            </div>
            <div className="price-row">
              Tax (18% GST): ₹{taxAmount.toLocaleString('en-IN')}
            </div>
            <div
              className={`price-row ${
                shippingCharge === 0 ? 'free-shipping' : 'shipping-charged'
              }`}
            >
              Shipping Charges: ₹{shippingCharge.toLocaleString('en-IN')}
            </div>
            <div className="shipping-note">{shippingMessage}</div>
            <hr />
            <div className="price-row bold">
              Grand Total: ₹{grandTotal.toLocaleString('en-IN')}
            </div>
            <div className="delivery-date">
              📦 Estimated Delivery: <strong>{deliveryDateStr}</strong>
            </div>

            {isDeliverySaved && (
              <div className="saved-delivery-summary">
                <h4>📍 Shipping Address:</h4>
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

            <button className="place-order-btn" onClick={handlePlaceOrder}>
              💸 Proceed to Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckoutScreen;
