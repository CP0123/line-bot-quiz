// 載入套件
require('dotenv').config();
const express = require('express');
const { Client } = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 初始化 LINE Bot
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);

// 建立 Express App
const app = express();
app.use(express.json());

// 處理 webhook 事件
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.status(200).json(results);
});

// 處理單筆事件
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text;

  // 使用者輸入「開始答題」
  if (userMessage === '開始答題') {
    const { data, error } = await supabase.from('questions').select();
    if (error || !data || data.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '目前沒有題目可以答，請稍後再試試！📭'
      });
    }

    // 隨機抽一題
    const randomQuestion = data[Math.floor(Math.random() * data.length)];
    const options = JSON.parse(randomQuestion.options);
    const optionText = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `📖 題目：${randomQuestion.text}\n\n選項：\n${optionText}`
    });
  }

  // 預設回覆
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請輸入「開始答題」來開始互動 🎯'
  });
}

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 LINE Bot server is running on port ${port}`);
});
