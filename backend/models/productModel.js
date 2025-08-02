import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    countInStock: { type: Number, required: true },
    brand: { type: String, required: true },
    rating: { type: Number, required: true },
    numReviews: { type: Number, required: true },
    description: { type: String, required: true },

    badge: { type: String },
    seller: { type: String },
    delivery: { type: String },
    returnPolicy: { type: String },
    highlights: [{ type: String }],
    sizeFit: { type: String },
    specifications: {
      fabric: String,
      pattern: String,
      sleeve: String,
      collar: String,
      fit: String,
      occasion: String,
      washCare: String,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);
export default Product;
