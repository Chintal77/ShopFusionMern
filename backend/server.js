import data from './data.js';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import seedRouter from './routes/seedRoutes.js';
import productRouter from './routes/productRoutes.js';
import userRouter from './routes/userRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import uploadRouter from './routes/uploadRoutes.js';
import router from './routes/paytmRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import sellerRouter from './routes/sellerRoutes.js';
import cron from 'node-cron';
import Order from './models/orderModel.js';
import cors from 'cors';

dotenv.config();
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to DB !!');
  })
  .catch((err) => {
    console.log(err.message);
  });

const app = express();

app.use(cors({ origin: '*' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/keys/paypal', (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID || 'sb');
});

app.use('/api/seed', seedRouter);

// Route to get all products
app.use('/api/products', productRouter);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/paytm', router);
app.use('/api/ai', aiRoutes);
app.use('/api/sellers', sellerRouter);

cron.schedule('* * * * *', async () => {
  try {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const unpaidOrders = await Order.find({
      isPaid: false,
      isCancelled: false,
      createdAt: { $lt: threeMinutesAgo },
    });

    if (unpaidOrders.length > 0) {
      for (const order of unpaidOrders) {
        order.isCancelled = true;
        order.cancelledBy = 'system';
        order.cancelledAt = new Date();
        await order.save();
        console.log(`🛑 Auto-cancelled order: ${order._id}`);
      }
    }
  } catch (err) {
    console.error('❌ Auto-cancel job failed:', err.message);
  }
});

// Route to get a single product by slug
app.get('/api/products/:slug', (req, res) => {
  const product = data.products.find((p) => p.slug === req.params.slug);
  if (product) {
    res.send(product);
  } else {
    res.status(404).send({ message: 'Product Not Found' });
  }
});

app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

const __dirname = path.resolve();

// ✅ Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'))
  );
} else {
  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}

const port = process.env.PORT || 5040;
app.listen(port, () => {
  console.log(`server at http://localhost:${port}`);
});
