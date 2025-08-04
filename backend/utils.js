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
