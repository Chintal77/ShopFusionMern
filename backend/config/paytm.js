export const paytmConfig = {
  MID: process.env.PAYTM_MID,
  KEY: process.env.PAYTM_KEY,
  WEBSITE: process.env.PAYTM_WEBSITE,
  INDUSTRY_TYPE_ID: process.env.PAYTM_INDUSTRY_TYPE_ID,
  CHANNEL_ID: 'WEB',
  CALLBACK_URL: process.env.PAYTM_CALLBACK_URL,
};

module.exports = PaytmConfig;
