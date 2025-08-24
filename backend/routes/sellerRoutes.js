import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

const sellerRouter = express.Router();

// ✅ GET seller details by ID
sellerRouter.get(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    const seller = await User.findById(req.params.id).select(
      'seller name email isSeller'
    );

    if (seller && seller.isSeller) {
      res.send({
        _id: seller._id,
        name: seller.name,
        email: seller.email,
        seller: seller.seller,
      });
    } else {
      res.status(404).send({ message: 'Seller Not Found' });
    }
  })
);

export default sellerRouter;
