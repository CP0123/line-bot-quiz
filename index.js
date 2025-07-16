// 載入套件
require('dotenv').config();
const express = require('express');
const { Client } = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');

// 👇 建議在這裡加入 buildCardBubble()
function buildCardBubble(card) {
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: card.image_url,
      size: 'full',
      aspectRatio: '1:1',
      aspectMode: 'cover'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: card.name,
          weight: 'bold',
          size: 'xl',
          align: 'center',
          color: '#7D6AFF'
        },
        {
          type: 'text',
          text: `稀有度：${card.rarity}`,
          size: 'md',
          align: 'center',
          color: '#888888'
        },
        {
          type: 'text',
          text: card.description,
          wrap: true,
          size: 'sm',
          align: 'center',
          color: '#555555'
        }
      ]
    }
  };
}


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
    return client.replyMessage(event.replyToken, {
      type: 'flex',
      altText: '兌換獎勵',
      contents: {
        type: 'bubble',
        hero: {
          type: 'image',
          url: 'https://olis.kmu.edu.tw/images/game/寶箱.png',
          size: 'full',
          aspectRatio: '16:9',
          aspectMode: 'cover'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📦 集卡獎勵',
              weight: 'bold',
              size: 'lg',
              align: 'center'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'message',
                label: '扣 20 分抽卡',
                text: '抽卡'
              },
              color: '#7D6AFF'
            }
          ]
        }
      }
    });
  }

  if (userMessage === '抽卡') {
  // 1. 查詢使用者分數
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select()
    .eq('line_id', userId);

  if (userError || !userData || userData.length === 0) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 無法查詢使用者，請先答題累積積分'
    });
  }

  const currentScore = userData[0]?.score ?? 0;

  if (currentScore < 20) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `💸 目前分數：${currentScore} 分，不足以抽卡（需 20 分）`
    });
  }

  // 2. 查詢所有卡片
  const { data: allCards, error: cardError } = await supabase
    .from('cards')
    .select();

  if (cardError || !allCards || allCards.length === 0) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 卡片資料錯誤，請稍後再試'
    });
  }

  // 3. 隨機抽一張卡
  const randomCard = allCards[Math.floor(Math.random() * allCards.length)];

  // 4. 儲存至 user_cards 表
  await supabase.from('user_cards').insert([
    {
      line_id: userId,
      card_id: randomCard.id,
      created_at: new Date().toISOString()
    }
  ]);

  // 5. 扣除 20 分
  await supabase
    .from('users')
    .update({ score: currentScore - 20 })
    .eq('line_id', userId);

  // 最後抽卡結果回覆
  const bubble = buildCardBubble(randomCard);

  return client.replyMessage(event.replyToken, {
    type: 'flex',
    altText: `你抽中了 ${randomCard.name}！`,
    contents: bubble
  }); 
}

  if (userMessage === '我的背包') {
    // 1. 取得全部卡片
    const { data: allCards, error: cardError } = await supabase
      .from('cards')
      .select();

    // 2. 取得使用者已獲得的卡片
    const { data: myCards, error: userCardError } = await supabase
      .from('user_cards')
      .select('card_id')
      .eq('line_id', userId);

    // 3. 整理使用者已擁有卡片 ID 清單
    const owned = myCards.map(c => c.card_id);

    // 4. 將所有卡片轉成 Flex Bubble（有則顯示圖、無則顯示灰框）
    const flexItems = allCards.map(card => {
      const gotIt = owned.includes(card.id);

      return {
        type: 'image',
        url: gotIt ? card.thumbnail_url : 'https://olis.kmu.edu.tw/images/game/cards/locked.png',
        size: 'sm',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        action: gotIt ? {
          type: 'message',
          label: card.name,
          text: `查看 ${card.name}`
        } : undefined
      };
    });

    // 5. 將圖片以 3x3 分組為 Grid
    const rows = [];
    for (let i = 0; i < flexItems.length; i += 3) {
      rows.push({
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: flexItems.slice(i, i + 3)
      });
    }

    // 6. 組裝整個 Bubble
    const bubble = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎒 我的集卡背包',
            weight: 'bold',
            size: 'lg',
            align: 'center',
            margin: 'md'
          },
          ...rows
        ]
      }
    };

    // 7. 回覆 Flex
    return client.replyMessage(event.replyToken, {
      type: 'flex',
      altText: '我的背包',
      contents: bubble
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
