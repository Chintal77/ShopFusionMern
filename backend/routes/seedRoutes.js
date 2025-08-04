import express from 'express';
import data from '../data.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js'; // ✅ Import Order model

const seedRouter = express.Router();

seedRouter.get('/', async (req, res) => {
  try {
    // Insert users only if no users exist
    const userCount = await User.countDocuments();
    let createdUsers = [];

    if (userCount === 0) {
      createdUsers = await User.insertMany(data.users);
    } else {
      createdUsers = await User.find({});
    }

    // Find admin user
    const adminUser = createdUsers.find((u) => u.isAdmin === true);

    if (!adminUser) {
      return res.status(400).send({ message: 'No admin user found' });
    }

    // Insert products only if no products exist
    const productCount = await Product.countDocuments();
    let createdProducts = [];

    if (productCount === 0) {
      const sampleProducts = data.products.map((product) => ({
        ...product,
        user: adminUser._id,
        source: 'seed',
      }));
      createdProducts = await Product.insertMany(sampleProducts);
    } else {
      createdProducts = await Product.find({});
    }

    // Insert orders only if no orders exist
    const orderCount = await Order.countDocuments();
    let createdOrders = [];

    if (orderCount === 0 && createdProducts.length > 0) {
      const sampleOrder = {
        orderItems: [
          {
            name: createdProducts[0].name,
            slug: createdProducts[0].slug,
            quantity: 1,
            image: createdProducts[0].image,
            price: createdProducts[0].price,
            product: createdProducts[0]._id,
          },
        ],
        shippingAddress: {
          name: 'John Doe',
          address: '123 Main St',
          city: 'Delhi',
          pin: '110001',
          country: 'India',
          location: {
            lat: 0,
            lng: 0,
            address: '',
            name: '',
            vicinity: '',
            googleAddressId: '',
          },
        },
        paymentMethod: 'UPI',
        itemsPrice: createdProducts[0].price,
        shippingPrice: 10,
        taxPrice: 2,
        totalPrice: createdProducts[0].price + 10 + 2,
        user: adminUser._id,
        isPaid: false,
        isDelivered: false,

        // ✅ New order status fields
        isPacking: false,
        isDispatched: false,
        outForDelivery: false,
      };

      createdOrders = await Order.insertMany([sampleOrder]);
    } else {
      createdOrders = await Order.find({});
    }

    await Order.updateMany(
      {
        $or: [
          { isPacking: { $exists: false } },
          { isDispatched: { $exists: false } },
          { outForDelivery: { $exists: false } },
        ],
      },
      {
        $set: {
          isPacking: false,
          isDispatched: false,
          outForDelivery: false,
        },
      }
    );

    res.send({
      message: 'Seed successful (no data deleted)',
      users: createdUsers,
      products: createdProducts,
      orders: createdOrders,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

export default seedRouter;
