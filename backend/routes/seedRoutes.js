import express from 'express';
import Product from '../models/productModel.js';
import data from '../data.js';
import User from '../models/userModel.js';

const seedRouter = express.Router();

seedRouter.get('/', async (req, res) => {
  const createdUsers = [];
  const createdProducts = [];

  // Only add users if DB is empty
  const usersCount = await User.countDocuments();
  if (usersCount === 0) {
    const users = await User.insertMany(data.users);
    createdUsers.push(...users);
  }

  // Insert only new products from data.js based on unique slug
  for (const product of data.products) {
    const existing = await Product.findOne({ slug: product.slug });
    if (!existing) {
      const created = await Product.create(product);
      createdProducts.push(created);
    }
  }

  res.send({
    message: 'Seeding completed.',
    createdUsers,
    createdProducts,
  });
});

export default seedRouter;
