import express from 'express';
import axios from 'axios';

const router = express.Router();

router.post('/ask', async (req, res) => {
  try {
    const { message } = req.body;

    // 🛑 Check if message is missing
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // ✅ Call Gemini API
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent',
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: message }],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
      }
    );

    // ✅ Send AI response back to frontend
    res.json({
      reply:
        response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "⚠️ I'm not sure about that.",
    });
  } catch (error) {
    console.error('Gemini API Error:', error.response?.data || error.message);

    res.status(500).json({
      error: error.response?.data?.error?.message || 'AI request failed',
    });
  }
});

export default router;
