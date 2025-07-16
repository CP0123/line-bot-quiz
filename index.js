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

// 建立使用者答題暫存表（使用記憶方式，未來可改成資料庫）
const userState = {}; // 例如：{ 'U123456': { lastQuestionCode: 'Q1' } }


// 處理單筆事件
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const userId = event.source.userId;
  const userMessage = event.message.text.trim();
  const upperMessage = userMessage.toUpperCase();

  // 👇 使用者輸入 Q1、Q2 等代碼
  if (/^Q\d+$/.test(upperMessage)) {
    const { data, error } = await supabase
      .from('questions')
      .select()
      .eq('code', upperMessage);

    if (error || !data || data.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `找不到代碼「${upperMessage}」對應的題目 😢`
      });
    }

    const question = data[0];
    const options = JSON.parse(question.options);

    // ✅ 儲存目前使用者的題目代碼
    userState[userId] = { lastQuestionCode: question.code };

    // 顯示題目 + Quick Reply 選項
    const quickReplyItems = options.map((opt) => ({
      type: 'action',
      action: {
        type: 'message',
        label: opt,
        text: opt
      }
    }));

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `📖 題目（${question.code}）：${question.text}`,
      quickReply: {
        items: quickReplyItems
      }
    });
  }

  // 使用者回答選項（如「台北」）
if (userState[userId]?.lastQuestionCode) {
  const questionCode = userState[userId].lastQuestionCode;
  const { data, error } = await supabase
    .from('questions')
    .select()
    .eq('code', questionCode);

  if (error || !data || data.length === 0) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `讀取題目失敗，請重新輸入代碼 📭`
    });
  }

  const question = data[0];
  const correctAnswer = question.correct_answer;
  const options = JSON.parse(question.options);

  const isCorrect = userMessage.trim() === correctAnswer;

  // ✅ 寫入 answers 表
try {
  const { error: insertError } = await supabase.from('answers').insert([
    {
      user_id: userId,
      question_code: question.code,
      user_answer: userMessage.trim(),
      is_correct: isCorrect,
      created_at: new Date().toISOString()
    }
  ]);

  if (insertError) {
    console.error('❌ 答題紀錄寫入失敗：', insertError.message);
  } else {
    console.log('✅ 答題紀錄成功寫入');
  }
} catch (err) {
  console.error('🔧 發生異常錯誤：', err.message);
}


  if (isCorrect) {
    delete userState[userId]; // 清除記憶
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '✅ 恭喜你答對了！'
    });
  } else {
    // 答錯 → 顯示提示 + 再次顯示題目與選項
    const quickReplyItems = options.map((opt) => ({
      type: 'action',
      action: {
        type: 'message',
        label: opt,
        text: opt
      }
    }));

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `❌ 答錯囉！再答一次～\n\n📖 題目（${question.code}）：${question.text}`,
      quickReply: {
        items: quickReplyItems
      }
    });
  }
}


  // 預設回覆
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請輸入題目代碼（例如 Q1）來開始答題 📮'
  });
}

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 LINE Bot server is running on port ${port}`);
});
