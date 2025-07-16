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

  // 🟡 查詢遊戲紀錄區塊（放最前面）
  if (userMessage === '遊戲紀錄') {
    console.log('🔍 查詢遊戲紀錄 for LINE ID:', userId);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select()
      .eq('line_id', userId);

    console.log('📦 使用者資料:', userData);

    if (userError || !userData || userData.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ 尚未找到你的遊戲紀錄，請先答題後再試！'
      });
    }

    const score = userData?.[0]?.score ?? 0;

    const { data: answerData, error: answerError } = await supabase
      .from('answers')
      .select()
      .eq('line_id', userId);

    console.log('📋 使用者答題紀錄:', answerData);

    const totalAnswers = answerData?.length ?? 0;
    const correctAnswers = answerData?.filter(a => a.is_correct)?.length ?? 0;

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `🎮 你的遊戲紀錄：\n✅ 答對題數：${correctAnswers}\n📋 總作答：${totalAnswers}\n🏆 累積分數：${score} 分`
    });
  }

  if (userMessage === '兌換獎勵') {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select()
    .eq('line_id', userId);

  if (userError || !userData || userData.length === 0) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 尚未找到你的資料，請先答題累積分數後再試！'
    });
  }

  const currentScore = userData[0]?.score ?? 0;

  if (currentScore < 20) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `💸 目前分數 ${currentScore} 分，尚未達到兌換條件（需 20 分）`
    });
  }

  // ✅ 隨機選擇寶物
  const treasureItems = ['小金幣 ×5', '力量果實', '幸運符咒', '神秘道具', '技能卷軸', '經驗值 +100'];
  const reward = treasureItems[Math.floor(Math.random() * treasureItems.length)];

  // 🧾 扣除分數（-20）
  const { error: updateError } = await supabase
    .from('users')
    .update({ score: currentScore - 20 })
    .eq('line_id', userId);

  if (updateError) {
    console.error('❌ 扣除分數失敗:', updateError.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 系統錯誤，請稍後再試'
    });
  }

  await supabase.from('rewards').insert([
  {
    line_id: userId,
    item_name: reward,
    created_at: new Date().toISOString()
  }
]);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `🎉 兌換成功！你獲得了：${reward} 🪄`
  });
}

if (userMessage === '我的背包') {
  const { data: rewardData, error } = await supabase
    .from('rewards')
    .select('item_name')
    .eq('line_id', userId);

  if (error) {
    console.error('❌ 查詢背包失敗:', error.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 查詢背包失敗，請稍後再試！'
    });
  }

  if (!rewardData || rewardData.length === 0) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '🧳 你尚未兌換任何寶物，趕快累積積分試試看吧！'
    });
  }

  // 整理背包清單
  const backpack = rewardData.map(r => `・${r.item_name}`).join('\n');

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `🎒 你的寶物背包：\n${backpack}`
  });
}



  // 🟡 顯示題目選項（Q1、Q2 等）
  if (/^Q\d+$/.test(upperMessage)) {
  // 👀 查詢是否已答對此題
  const { data: existingAnswers, error: checkError } = await supabase
    .from('answers')
    .select()
    .eq('line_id', userId)
    .eq('question_code', upperMessage)
    .eq('is_correct', true);

  if (checkError) {
    console.error('❌ 檢查答題紀錄失敗:', checkError.message);
  }

  if (existingAnswers && existingAnswers.length > 0) {
    // ✅ 已完成該題
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '📌 你已經完成此題，可以挑戰其他題目唷 🎮'
    });
  }

  // 🔍 正常讀取題目並顯示
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

  userState[userId] = { lastQuestionCode: question.code };

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


  // 🟡 使用者選擇答案（作答區塊）
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

    await supabase.from('answers').insert([
      {
        line_id: userId,
        question_code: question.code,
        user_answer: userMessage.trim(),
        is_correct: isCorrect,
        created_at: new Date().toISOString()
      }
    ]);

    if (isCorrect) {
      delete userState[userId];

      // ✅ 修正區：使用 userRecord，避免與上方變數衝突
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select()
        .eq('line_id', userId);

      if (userError) {
        console.error('讀取使用者錯誤', userError);
      }

      if (!userRecord || userRecord.length === 0) {
        await supabase.from('users').insert([
          {
            line_id: userId,
            score: 10,
            created_at: new Date().toISOString()
          }
        ]);
      } else {
        const currentScore = userRecord[0]?.score ?? 0;
        console.log('⚡ 目前分數:', currentScore);
        await supabase
          .from('users')
          .update({ score: currentScore + 10 })
          .eq('line_id', userId);
        console.log('✅ 已更新分數:', currentScore + 10);
      }

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '✅ 恭喜你答對了！'
      });
    } else {
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
