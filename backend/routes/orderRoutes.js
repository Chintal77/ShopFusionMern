import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import { isAuth, isAdmin } from '../utils.js';
import mongoose from 'mongoose';

import { startOfDay, endOfDay } from 'date-fns';

const orderRouter = express.Router();
orderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orderItemsWithObjectIds = req.body.orderItems.map((x) => ({
      ...x,
      product: new mongoose.Types.ObjectId(x._id), // ✅ Explicit conversion
    }));

    const newOrder = new Order({
      orderItems: orderItemsWithObjectIds,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      itemsPrice: req.body.itemsPrice,
      shippingPrice: req.body.shippingPrice,
      taxPrice: req.body.taxPrice,
      totalPrice: req.body.totalPrice,
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
    const order = await Order.findById(req.params.id);
    if (order) {
      res.send(order);
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

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

export default orderRouter;
