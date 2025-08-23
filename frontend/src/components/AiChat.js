import React, { useState } from 'react';
import axios from 'axios';

export default function AiChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) {
      setError('Please enter a message.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await axios.post('/api/ai/ask', {
        message: input.trim(), // ✅ Make sure message is sent correctly
      });

      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: input },
        { sender: 'bot', text: data.reply },
      ]);

      setInput(''); // ✅ Clear input after sending
    } catch (err) {
      console.error('AI Error:', err.response?.data || err.message);
      setError('Sorry, I could not process your request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-chat-container">
      <h3>ShopFusion AI</h3>

      <div className="chat-box">
        {messages.map((msg, idx) => (
          <p
            key={idx}
            className={msg.sender === 'user' ? 'user-msg' : 'bot-msg'}
          >
            {msg.text}
          </p>
        ))}
        {loading && <p>Thinking...</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input} // ✅ Controlled input
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
        />
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}
