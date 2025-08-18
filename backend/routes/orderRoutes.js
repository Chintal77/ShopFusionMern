import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import {
  isAuth,
  isAdmin,
  updateOrderStatus,
  cancelOrder,
  updateReturnStatus,
  mailgun,
  payOrderEmailTemplate,
  orderStatusEmailTemplate,
  returnRequestEmailTemplate,
  returnApprovedEmailTemplate,
  refundCreditedEmailTemplate,
} from '../utils.js';
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
    const order = await Order.findById(req.params.id).populate(
      'user',
      'email name'
    );
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
      mailgun()
        .messages()
        .send(
          {
            from: 'ShopFusion <admin@mshopfusion.com>',
            to: `${order.user.name} <${order.user.email}>`,
            subject: `New order ${order._id}`,
            html: payOrderEmailTemplate(order),
          },
          (error, body) => {
            if (error) {
              console.log(error);
            } else {
              console.log(body);
            }
          }
        );
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

orderRouter.put(
  '/:id/return',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { returnReason } = req.body;
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email'
    );

    if (!order) {
      return res.status(404).send({ message: 'Order not found' });
    }

    if (!order.isDelivered) {
      return res.status(400).send({ message: 'Order not yet delivered' });
    }

    if (order.returnRequested) {
      return res.status(400).send({ message: 'Return already requested' });
    }

    if (order.isCancelled) {
      return res.status(400).send({ message: 'Order is cancelled' });
    }

    order.returnRequested = true;
    order.returnReason = returnReason || 'Not specified';
    order.returnStatus = 'Pending';
    order.returnedAt = new Date();

    const updatedOrder = await order.save();

    // 📧 Send Return Request Email
    mailgun()
      .messages()
      .send(
        {
          from: 'ShopFusion <no-reply@shopfusion.com>',
          to: `${order.user.name} <${order.user.email}>`,
          subject: `Return Request for Order ${order._id}`,
          html: returnRequestEmailTemplate(order, order.user),
        },
        (error, body) => {
          if (error) {
            console.error('Email sending error:', error);
          } else {
            console.log('Return request email sent:', body);
          }
        }
      );

    res.send({ message: 'Return request submitted', order: updatedOrder });
  })
);

orderRouter.put('/:id/status', isAuth, isAdmin, updateReturnStatus);

const sendOrderEmail = async (order, subject, html) => {
  const mg = mailgun({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  });

  await mg.messages().send({
    from: 'ShopFusion <admin@shopfusion.com>',
    to: `${order.user.name} <${order.user.email}>`,
    subject,
    html,
  });
};

orderRouter.put(
  '/:id/statusmessage',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { field, value } = req.body;
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email'
    );

    if (!order) {
      return res.status(404).send({ message: 'Order not found' });
    }

    // ✅ Update the order field dynamically
    order[field] = value;
    await order.save();

    // ✅ Determine the status message based on field & value
    let statusmessage = '';
    if (value) {
      switch (field) {
        case 'isPacking':
          statusmessage = 'Your order is now being packed!';
          break;
        case 'isDispatched':
          statusmessage = 'Your order has been dispatched!';
          break;
        case 'outForDelivery':
          statusmessage = 'Your order is out for delivery!';
          break;
        case 'isDelivered':
          statusmessage = 'Your order has been delivered!';
          break;
        default:
          statusmessage = 'Your order status has been updated.';
      }

      // ✅ Send the HTML email only if the status is being set to true
      await sendOrderEmail(
        order,
        'Order Status Update',
        orderStatusEmailTemplate(order, statusmessage)
      );
    }

    res.send({ message: 'Order status updated successfully', order });
  })
);

orderRouter.put(
  '/:id/refund-credited',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'name email'
    );

    if (!order) {
      return res.status(404).send({ message: 'Order not found' });
    }

    // ✅ Check if already credited
    if (order.refundCredited) {
      return res.status(400).send({ message: 'Refund already credited' });
    }

    // Mark refund credited only once
    order.refundCredited = true;
    await order.save();

    try {
      await sendOrderEmail(
        order,
        'Refund Credited',
        refundCreditedEmailTemplate(order)
      );
      res.send({
        message: 'Refund credited email sent successfully',
        order,
      });
    } catch (error) {
      console.error('Email send error:', error.message);
      // Still respond 200 because refund is credited
      res.send({
        message: 'Refund credited but email failed to send',
        order,
      });
    }
  })
);

orderRouter.put(
  '/:id/returnStatus',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { field, value } = req.body;
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems'); // populate items if not already

    if (!order) {
      return res.status(404).send({ message: 'Order not found' });
    }

    // Update return status
    if (field === 'returnStatus') {
      order.returnStatus = value;
      order.returnedAt = new Date();
    }

    await order.save();

    // Send email when status is Approved or Rejected
    if (value === 'Approved' || value === 'Rejected') {
      let subject = '';
      let htmlTemplate = '';

      if (value === 'Approved') {
        subject = 'Your Return Request Has Been Approved';
        htmlTemplate = returnApprovedEmailTemplate(order);
      } else {
        subject = 'Your Return Request Has Been Rejected';
        htmlTemplate = returnRejectedEmailTemplate(order); // You'll create this
      }

      await mailgun()
        .messages()
        .send({
          from: 'ShopFusion <no-reply@shopfusion.com>',
          to: `${order.user.name} <${order.user.email}>`,
          subject,
          html: htmlTemplate,
        });
    }

    res.send({ message: `Return status updated to ${value}` });
  })
);

export default orderRouter;
