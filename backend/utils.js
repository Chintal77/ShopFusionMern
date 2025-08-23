import jwt from 'jsonwebtoken';
import Order from '../backend/models/orderModel.js';
import mg from 'mailgun-js';

export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );
};

export const isAuth = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.slice(7, authorization.length);
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err) {
        console.error('JWT verify error:', err);
        res.status(401).send({ message: 'Invalid Token' });
      } else {
        req.user = decode;
        next();
      }
    });
  } else {
    res.status(401).send({ message: 'No Token' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401).send({ message: 'Admin Token is not valid' });
  }
};

export const mailgun = () =>
  mg({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  });

export const payOrderEmailTemplate = (order) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #4CAF50; padding: 20px; color: white; text-align: center;">
      <h1 style="margin: 0;">Thank You for Your Order!</h1>
    </div>

    <div style="padding: 20px;">
      <p style="font-size: 16px;">Hi <strong>${order.user.name}</strong>,</p>
      <p style="font-size: 14px; color: #555;">We’ve finished processing your order. Below are your order details:</p>

      <h2 style="color: #4CAF50; font-size: 18px;">
        Order #${
          order._id
        } <span style="font-weight: normal; font-size: 14px;">(${order.createdAt
    .toString()
    .substring(0, 10)})</span>
      </h2>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f8f8f8;">
            <th align="left" style="padding: 8px; border: 1px solid #ddd;">Product</th>
            <th align="center" style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
            <th align="right" style="padding: 8px; border: 1px solid #ddd;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${order.orderItems
            .map(
              (item) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${
                item.name
              }</td>
              <td align="center" style="padding: 8px; border: 1px solid #ddd;">${
                item.quantity
              }</td>
              <td align="right" style="padding: 8px; border: 1px solid #ddd;">₹${item.price.toFixed(
                2
              )}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 8px; border: 1px solid #ddd;">Items Price:</td>
            <td align="right" style="padding: 8px; border: 1px solid #ddd;">₹${order.itemsPrice.toFixed(
              2
            )}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 8px; border: 1px solid #ddd;">Shipping Price:</td>
            <td align="right" style="padding: 8px; border: 1px solid #ddd;">₹${order.shippingPrice.toFixed(
              2
            )}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Total Price:</td>
            <td align="right" style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">₹${order.totalPrice.toFixed(
              2
            )}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 8px; border: 1px solid #ddd;">Payment Method:</td>
            <td align="right" style="padding: 8px; border: 1px solid #ddd;">${
              order.paymentMethod
            }</td>
          </tr>
        </tfoot>
      </table>

      <h2 style="margin-top: 20px; color: #4CAF50;">Shipping Address</h2>
      <p style="font-size: 14px; line-height: 1.5; color: #555;">
        ${order.shippingAddress.name},<br/>
        ${order.shippingAddress.address},<br/>
        ${order.shippingAddress.city},<br/>
        ${order.shippingAddress.country},<br/>
        ${order.shippingAddress.pin}
      </p>

      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;"/>
      <p style="font-size: 14px; text-align: center; color: #777;">
        Thank you for shopping with us. We hope to see you again soon!
      </p>
    </div>
  </div>
  `;
};

export const orderStatusEmailTemplate = (order, statusmessage) => `
<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0;">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Status Update</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8f9fa;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
    }
    .status-badge {
      display: inline-block;
      background-color: #28a745;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      margin-bottom: 15px;
    }
    .order-items {
      margin-top: 20px;
      border-collapse: collapse;
      width: 100%;
    }
    .order-items th, .order-items td {
      padding: 10px;
      border: 1px solid #dee2e6;
      text-align: left;
    }
    .footer {
      background-color: #f1f3f5;
      text-align: center;
      padding: 15px;
      font-size: 12px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Your Order Status Has Been Updated</h1>
    </div>
    <div class="content">
      <p>Hi <strong>${order.user.name}</strong>,</p>
      <p>${statusmessage}</p>

      <div class="status-badge">${statusmessage}</div>

      <h3>Order Summary</h3>
      <table class="order-items">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${order.orderItems
            .map(
              (item) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price}</td>
              </tr>
            `
            )
            .join('')}
        </tbody>
      </table>

      <h3 style="margin-top:20px;">Total: ₹${order.totalPrice}</h3>

      <p>Thank you for shopping with us! We’ll keep you updated as your order progresses.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ShopFusion. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

export const returnRequestEmailTemplate = (order, user) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #ff4d4d; padding: 16px; text-align: center;">
        <h2 style="color: white; margin: 0;">Return Request Submitted</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hi ${user.name},</p>
        <p>We have received your return request for order <b>${
          order._id
        }</b>.</p>
        <p><b>Reason:</b> ${order.returnReason}</p>
        <p>Our support team will review and update you shortly.</p>

        <h3>Order Summary:</h3>
        <ul>
          ${order.orderItems
            .map(
              (item) => `
              <li>${item.name} - ${item.quantity} x ₹${item.price}</li>
            `
            )
            .join('')}
        </ul>

        <p style="margin-top: 20px;">Thank you for shopping with us.</p>
      </div>
      <div style="background-color: #f4f4f4; text-align: center; padding: 10px;">
        <small>This is an automated message. Please do not reply.</small>
      </div>
    </div>
  `;
};

export const returnApprovedEmailTemplate = (order) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #28a745; padding: 16px; text-align: center;">
        <h2 style="color: white; margin: 0;">Return Approved</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hi ${order.user.name},</p>
        <p>Your return request for order <b>${
          order._id
        }</b> has been <b>approved</b>.</p>
        <p>Refund will be processed within 3-5 business days.</p>

        <h3>Returned Items:</h3>
        <ul>
          ${order.orderItems
            .map(
              (item) => `
              <li>${item.name} - ${item.quantity} x ₹${item.price}</li>
            `
            )
            .join('')}
        </ul>

        <p style="margin-top: 20px;">Thank you for shopping with us.</p>
      </div>
      <div style="background-color: #f4f4f4; text-align: center; padding: 10px;">
        <small>This is an automated message. Please do not reply.</small>
      </div>
    </div>
  `;
};

export const refundCreditedEmailTemplate = (order) => {
  // Calculate IST date = returnedAt + 3 minutes
  const returnedAtISTPlus3 = order?.returnedAt
    ? new Date(
        new Date(order.returnedAt).getTime() + 3 * 60 * 1000
      ).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date not available';

  // Fallbacks in case values are missing
  const transactionId =
    order?.transactionId || `TXN${Math.floor(Math.random() * 1000000000)}`;
  const refundMode = order?.refundMode || 'Original Payment Method';
  const paymentGateway = order?.paymentGateway || 'Paytm / Razorpay';
  const estimatedDate = order?.estimatedCreditDate
    ? new Date(order.estimatedCreditDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : returnedAtISTPlus3;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 12px rgba(0,0,0,0.1);">
      <div style="background-color: #007bff; padding: 16px; text-align: center;">
        <h2 style="color: white; margin: 0;">Refund Successfully Credited</h2>
      </div>

      <div style="padding: 20px; color: #333;">
        <p>Hi <b>${order.user.name}</b>,</p>
        <p>We're happy to inform you that your refund for order <b>${order._id}</b> has been successfully processed and credited to your account.</p>

        <h3 style="color: #007bff; margin-top: 20px;">Refund Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><b>Refund Amount:</b></td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">₹${order.totalPrice}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><b>Transaction ID:</b></td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${transactionId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><b>Refund Mode:</b></td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${refundMode}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><b>Payment Gateway:</b></td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${paymentGateway}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><b>Refund Date:</b></td>
            <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${returnedAtISTPlus3}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><b>Expected Credit By:</b></td>
            <td style="padding: 8px;">${estimatedDate}</td>
          </tr>
        </table>

        <p style="margin-top: 20px;">If you haven't received the refund yet, please check with your bank or payment provider. It may take <b>2-4 working days</b> depending on your payment method.</p>

        <p>For any queries, feel free to <a href="mailto:support@shopfusion.com" style="color: #007bff; text-decoration: none;">contact our support team</a>.</p>

        <p>Thank you for shopping with <b>ShopFusion</b>! We hope to serve you again soon.</p>
      </div>

      <div style="background-color: #f4f4f4; text-align: center; padding: 12px;">
        <small style="color: #666;">This is an automated message. Please do not reply.</small>
      </div>
    </div>
  `;
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).send({ message: 'Order not found' });
    }

    order[field] = value; // Dynamically update the specified status field
    await order.save();

    res.send({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).send({ message: 'Failed to update order status' });
  }
};

export const updateReturnStatus = async (req, res) => {
  const { id: orderId } = req.params;
  const { field, value } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow specific fields to be updated
    const validFields = [
      'isPacking',
      'isDispatched',
      'outForDelivery',
      'isDelivered',
      'returnStatus',
    ];

    if (!validFields.includes(field)) {
      return res.status(400).json({ message: 'Invalid field update request' });
    }

    order[field] = value;

    await order.save();

    res.status(200).json({ message: `${field} updated successfully`, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating status' });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      if (order.isPaid) {
        return res.status(400).send({ message: 'Cannot cancel a paid order' });
      }
      order.isCancelled = true;
      await order.save();
      res.send({ message: 'Order cancelled successfully' });
    } else {
      res.status(404).send({ message: 'Order not found' });
    }
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
