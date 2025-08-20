const PaytmConfig = {
  mid: process.env.PAYTM_MID,
  key: process.env.PAYTM_KEY,
  website: process.env.PAYTM_WEBSITE || 'WEBSTAGING',
  channelId: 'WEB',
  industryTypeId: 'Retail',
  callbackUrl: 'http://localhost:5000/api/paytm/callback',
};

module.exports = PaytmConfig;
