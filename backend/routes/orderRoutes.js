import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import { isAuth, isAdmin, updateOrderStatus, cancelOrder } from '../utils.js';
import mongoose from 'mongoose';

import { startOfDay, endOfDay } from 'date-fns';

const orderRouter = express.Router();

orderRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find().populate('user', 'name');
    res.send(orders);
  })
);

orderRouter.put('/:id/status', isAuth, updateOrderStatus);

orderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    } = req.body;

    // ✅ Replace slug with actual product ObjectId from DB
    const orderItemsWithObjectIds = await Promise.all(
      orderItems.map(async (item) => {
        const product = await Product.findOne({ slug: item.slug });
        if (!product) {
          throw new Error(`Product not found for slug: ${item.slug}`);
        }

        return {
          ...item,
          product: product._id, // ✅ Correct ObjectId reference
        };
      })
    );

    const newOrder = new Order({
      orderItems: orderItemsWithObjectIds,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      user: req.user._id,
    });

    const order = await newOrder.save();
    res.status(201).send({ message: 'New Order Created', order });
  })
);

orderRouter.get(
  '/summary',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const users = await User.aggregate([
      { $group: { _id: null, numUsers: { $sum: 1 } } },
    ]);

    const orders = await Order.aggregate([
      {
        $group: {
          _id: null,
          numOrders: { $sum: 1 },
          totalSales: { $sum: '$totalPrice' },
        },
      },
    ]);

    const dailyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          sales: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const productCategories = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const today = new Date();
    const todayOrdersCount = await Order.countDocuments({
      createdAt: { $gte: startOfDay(today), $lte: endOfDay(today) },
    });

    const lowStockProducts = await Product.find({
      countInStock: { $lt: 10 },
    }).select('name countInStock');

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name');

    const monthlyUserStats = await User.aggregate([
      {
        $group: {
          _id: { $substr: ['$createdAt', 0, 7] },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const activeUsers = await Order.aggregate([
      { $group: { _id: '$user', totalOrders: { $sum: 1 } } },
      { $sort: { totalOrders: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $project: { name: '$user.name', totalOrders: 1 } },
    ]);

    const returnStats = await Order.aggregate([
      { $match: { status: 'Returned' } },
      {
        $group: {
          _id: null,
          returnCount: { $sum: 1 },
          totalRefunded: { $sum: '$totalPrice' },
        },
      },
    ]);

    const paymentMethodStats = await Order.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
        },
      },
    ]);

    const [cancelled, delivered, unpaid, paid, topProducts] = await Promise.all(
      [
        Order.aggregate([
          { $match: { isCancelled: true } },
          {
            $group: {
              _id: null,
              cancelledCount: { $sum: 1 },
              cancelledRevenue: { $sum: '$totalPrice' },
            },
          },
        ]),
        Order.aggregate([
          { $match: { isDelivered: true } },
          {
            $group: {
              _id: null,
              deliveredCount: { $sum: 1 },
              deliveredRevenue: { $sum: '$totalPrice' },
            },
          },
        ]),
        Order.aggregate([
          { $match: { isPaid: false } },
          {
            $group: {
              _id: null,
              unpaidCount: { $sum: 1 },
              unpaidRevenue: { $sum: '$totalPrice' },
            },
          },
        ]),
        Order.aggregate([
          { $match: { isPaid: true } },
          {
            $group: {
              _id: null,
              paidCount: { $sum: 1 },
              paidRevenue: { $sum: '$totalPrice' },
            },
          },
        ]),
        Order.aggregate([
          { $unwind: '$orderItems' },
          {
            $group: {
              _id: '$orderItems.product',
              quantitySold: { $sum: '$orderItems.quantity' },
              revenue: {
                $sum: {
                  $multiply: ['$orderItems.quantity', '$orderItems.price'],
                },
              },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          {
            $project: {
              _id: 0,
              productId: '$_id',
              name: '$product.name',
              quantitySold: 1,
              revenue: 1,
              image: '$product.image',
            },
          },
        ]),
      ]
    );

    res.send({
      users,
      orders,
      dailyOrders,
      productCategories,
      todayOrdersCount,
      lowStockProducts,
      recentOrders,
      monthlyUserStats,
      returnStats: returnStats[0] || { returnCount: 0, totalRefunded: 0 },
      activeUsers,
      orderStats: {
        cancelledCount: cancelled[0]?.cancelledCount || 0,
        cancelledRevenue: cancelled[0]?.cancelledRevenue || 0,
        deliveredCount: delivered[0]?.deliveredCount || 0,
        deliveredRevenue: delivered[0]?.deliveredRevenue || 0,
        unpaidCount: unpaid[0]?.unpaidCount || 0,
        unpaidRevenue: unpaid[0]?.unpaidRevenue || 0,
        paidCount: paid[0]?.paidCount || 0,
        paidRevenue: paid[0]?.paidRevenue || 0,
      },
      paymentMethods: paymentMethodStats,
      topProducts,
    });
  })
);

orderRouter.get(
  '/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id });
    res.send(orders);
  })
);

orderRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'orderItems.product',
      'name returnPolicy'
    );

    if (!order) {
      return res.status(404).send({ message: 'Order Not Found' });
    }

    const ONE_MINUTES = 1 * 60 * 1000;
    const isEligibleForAutoCancel =
      !order.isPaid &&
      !order.isCancelled &&
      new Date() - order.createdAt > ONE_MINUTES;

    if (isEligibleForAutoCancel) {
      order.isCancelled = true;
      order.cancelledBy = 'system';
      order.cancelledAt = new Date();
      await order.save();
    }

    res.send(order);
  })
);

orderRouter.put('/:id/cancel', isAuth, isAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).send({ message: 'Order not found' });
    }

    if (order.isCancelled) {
      return res.status(400).send({ message: 'Order already cancelled' });
    }

    order.isCancelled = true;
    order.cancelledBy = 'admin';
    order.cancelledAt = new Date();

    await order.save();
    res.send({ message: 'Order cancelled by admin', order });
  } catch (err) {
    res
      .status(500)
      .send({ message: 'Internal server error', error: err.message });
  }
});

orderRouter.put(
  '/:id/pay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };

      const updatedOrder = await order.save();
      res.send({ message: 'Order Paid', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      await order.deleteOne();
      res.send({ message: 'Order Deleted' });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

export default orderRouter;
