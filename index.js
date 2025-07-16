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
if (event.type === 'message' && event.message.type === 'text') {
  const userMessage = event.message.text.trim().toUpperCase(); // 例如 Q1

  // 🧩 檢查是否是題目代碼格式
  if (/^Q\d+$/.test(userMessage)) {
    const { data, error } = await supabase
      .from('questions')
      .select()
      .eq('code', userMessage); // 根據 code 欄位查題目

    if (error) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '❌ 讀取資料時發生錯誤，請稍後再試'
      });
    }

    if (!data || data.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `找不到代碼「${userMessage}」對應的題目 😢`
      });
    }

    const question = data[0];
    const options = JSON.parse(question.options);
    const optionText = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `📖 題目（${userMessage}）：${question.text}\n\n選項：\n${optionText}`
    });
  }

  // ➕ 其他預設訊息，例如開始答題或說明
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請輸入題目代碼（例如 Q1）來開始答題 📮'
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
