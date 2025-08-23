import axios from 'axios';

export const askGeminiAI = async (message) => {
  try {
    const { data } = await axios.post(
      '/api/ai/ask',
      { message }, // ✅ Correctly send message
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // ✅ Extract reply from backend response
    return data.reply || '⚠️ No response from AI.';
  } catch (error) {
    console.error('Gemini API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'AI request failed');
  }
};
