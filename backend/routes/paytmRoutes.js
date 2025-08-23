import express from 'express';
import axios from 'axios';
import PaytmChecksum from 'paytmchecksum';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

router.post('/initiate', async (req, res) => {
  try {
    const { amount, email, orderId } = req.body;

    if (!amount || !email || !orderId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing required fields' });
    }

    const paytmParams = {
      body: {
        requestType: 'Payment',
        mid: process.env.PAYTM_MID,
        websiteName: process.env.PAYTM_WEBSITE,
        orderId,
        callbackUrl: process.env.PAYTM_CALLBACK_URL,
        txnAmount: {
          value: amount,
          currency: 'INR',
        },
        userInfo: {
          custId: email,
        },
      },
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      process.env.PAYTM_KEY
    );

    const paytmRequest = {
      body: paytmParams.body,
      head: {
        signature: checksum,
      },
    };

    const url = `https://securegw-stage.paytm.in/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${orderId}`;

    const { data } = await axios.post(url, paytmRequest, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Send txnToken and other details to frontend
    return res.json({
      success: true,
      txnToken: data.body.txnToken,
      orderId,
      amount,
    });
  } catch (error) {
    console.error('Paytm Initiate Error:', error);

    return res.status(500).json({
      success: false,
      message: error.response?.data || 'Paytm Server Error',
    });
  }
});

router.post('/callback', (req, res) => {
  console.log('Paytm Callback Response:', req.body);
  res.send('Payment Successful');
});

export default router;
