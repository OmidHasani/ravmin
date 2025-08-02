require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'chatdb';
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new MongoClient(uri);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('خطا در اتصال به MongoDB:', err);
  }
}

connectDB();

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'chat.html'));
});

app.get('/messages', async (req, res) => {
  try {
    const messages = await db.collection('messages').find().toArray();
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در دریافت پیام‌ها' });
  }
});

app.post('/messages', async (req, res) => {
  const { sender, content } = req.body;
  if (!sender || !content) return res.status(400).json({ error: 'فیلدهای اجباری پر نشده' });
  try {
    const newMessage = { sender, content, created_at: new Date() };
    await db.collection('messages').insertOne(newMessage);
    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطا در ذخیره پیام' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages) return res.status(400).json({ error: 'پیام‌ها ارسال نشده' });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
    });

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در ارتباط با OpenAI' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
