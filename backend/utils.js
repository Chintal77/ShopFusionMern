import jwt from 'jsonwebtoken';
import Order from '../backend/models/orderModel.js';

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
  if (authorization) {
    const token = authorization.slice(7, authorization.length); // Bearer XXXXXX
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err) {
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
    res.status(401).send({ message: 'Invalid Admin Token' });
  }
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
