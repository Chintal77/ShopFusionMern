import express from 'express';
import data from '../data.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';

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

    // Find admin user (from existing or newly created users)
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
        source: 'seed', // Optional: tag seed data
      }));
      createdProducts = await Product.insertMany(sampleProducts);
    } else {
      createdProducts = await Product.find({});
    }

    res.send({
      message: 'Seed successful (no data deleted)',
      users: createdUsers,
      products: createdProducts,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

export default seedRouter;
