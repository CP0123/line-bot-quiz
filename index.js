// 載入套件
require('dotenv').config();
const express = require('express');
const { Client } = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');

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
  //console.log(req.body);
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.status(200).json(results);
});

// 建立使用者答題暫存表（使用記憶方式，未來可改成資料庫）
const userState = {}; // 例如：{ 'U123456': { lastQuestionCode: 'Q1' } }

// 主程式, 處理各項單筆事件
async function handleEvent(event) {
 
  //只要不是文字型態的訊息(貼圖、圖片等), 一律回覆預設文字
  if (event.type !== 'message' || event.message.type !== 'text'){
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '請輸入任務代碼（例：Q2133）開始答題！' + '<br>' +'或開啟遊戲選單點選您需求的功能哦～'
    });
  }

  const userId = event.source.userId;
  const userMessage = event.message.text.trim().toUpperCase();;
  const upperMessage = userMessage.toUpperCase();
  
  //輸入指定關鍵字, 清除答題狀態, 即答題到一半可以跳出答題介面
  if (userMessage === '抽卡' || userMessage === '我的背包' || userMessage === '您尚未獲得此卡片' || userMessage === '兌換獎勵' || userMessage === '遊戲紀錄') {
    delete userState[userId];
  }

  //卡片未獲得不回傳訊息
  if (userMessage === '您尚未獲得此卡片') {
    // 預設回覆
    return ;
  }

  //查詢遊戲紀錄
  if (userMessage === '遊戲紀錄') {
    //console.log('🔍 查詢遊戲紀錄 for LINE ID:', userId);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select()
      .eq('line_id', userId);

    //console.log('📦 使用者資料:', userData);
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

    //console.log('📋 使用者答題紀錄:', answerData);
    const correctAnswers = answerData?.filter(a => a.is_correct)?.length ?? 0;

    delete userState[userId];
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `🎮 你的遊戲紀錄：\n✅ 答對題數：${correctAnswers}\n🏆 現有分數：${score} 分`
    });
  }

  if (userMessage === '兌換獎勵') {
    //第1步
    //查詢使用者分數
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select()
      .eq('line_id', userId);

    const currentScore = userData?.[0]?.score ?? 0;

    //查詢後發現小於10分, 即回傳預設文字;大於10分即呈現抽卡的Flex Message (bubble)
    if (currentScore < 10) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `💸 目前分數：${currentScore} 分，不足以抽卡（需 10 分）`
      });
    }else {
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
                  label: '扣 10 分抽卡',
                  text: '抽卡'
                },
                color: '#7D6AFF'
              }
            ]
          }
        }
      });
    }
    }

  if (userMessage === '抽卡') {
    //第1步
    //查詢使用者分數
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select()
      .eq('line_id', userId);

    const currentScore = userData?.[0]?.score ?? 0;

    //查詢後發現0分, 即回傳預設文字
    if (currentScore < 10) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `💸 目前分數：${currentScore} 分，不足以抽卡（需 10 分）`
      });
    }
    //第2步
    //查詢所有卡片
    const { data: allCards } = await supabase.from('cards').select();
    const totalCardCount = 9; // ✅ 固定為九宮格卡冊上限
    const unownedCards = allCards.filter(card => !ownedIds.includes(card.id)); // 篩出尚未獲得的卡片
    const newCard = unownedCards[Math.floor(Math.random() * unownedCards.length)]; //隨機抽一張未擁有卡

    //查詢使用者已擁有的卡片
    const { data: ownedCards } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('line_id', userId);

    const ownedIds = ownedCards.map((c) => c.card_id);
    const ownedCount = ownedIds.length;
     
    //判斷是否已集滿卡冊（9 張）
    if (ownedCount >= totalCardCount || unownedCards.length === 0) {
      const bubble = buildUnlockBubble();
      return client.replyMessage(event.replyToken, {
        type: 'flex',
        altText: '🏆 你已完成集卡冊，太強啦！',
        contents: bubble
      });
    } 

    //抽卡結果寫入 supabase 的 user_cards 表
    await supabase.from('user_cards').insert([
      {
        line_id: userId,
        card_id: newCard.id,
        created_at: new Date().toISOString()
      }
    ]);

    //扣除分數, 並寫入supabase
    await supabase
      .from('users')
      .update({ score: currentScore - 10 })
      .eq('line_id', userId);

    //回覆 Flex Bubble
    const bubble = buildCardBubble(newCard);

    return client.replyMessage(event.replyToken, {
      type: 'flex',
      altText: `你抽中了 ${newCard.name}！`,
      contents: bubble
    });
}

  if (userMessage === '我的背包') {
  // 1. 取得所有卡片資料
  const { data: allCards, error: cardError } = await supabase
    .from('cards')
    .select();

  if (cardError || !Array.isArray(allCards)) {
    console.error('❌ 卡片查詢失敗:', cardError?.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '🚫 查詢卡片時出錯了，請稍後再試！'
    });
  }

  // 2. 取得使用者已擁有卡片
  const { data: myCards, error: userCardError } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('line_id', userId);

  if (userCardError) {
    console.error('❌ 使用者卡片查詢失敗:', userCardError?.message);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 無法載入背包，請稍後再試！'
    });
  }

  // 3. 整理已擁有卡片 ID 清單
  const ownedIds = Array.isArray(myCards) ? myCards.map(c => c.card_id) : [];

  // 4. 生成卡片 Flex 圖片
  const flexItems = allCards.map(card => {
    const gotIt = ownedIds.includes(card.id);

    const itemContents = gotIt
      ? [
          {
            type: 'image',
            url: card.thumbnail_url,
            aspectRatio: '1:1',
            aspectMode: 'cover',
            size: 'full',
            action: {
              type: 'message',
              label: card.name,
              text: `查看 ${card.name}`
            }
          }
        ]
      : [
          {
            type: 'image',
            url: 'https://olis.kmu.edu.tw/images/game/full_collection.png',
            aspectRatio: '1:1',
            aspectMode: 'cover',
            size: 'full',
            action: {
              type: 'message',
              label: '?',
              text: '您尚未獲得此卡片'
            }
          }
        ]; // 未解鎖不顯示圖片

    return {
      type: 'box',
      layout: 'vertical',
      paddingAll: '1px',
      backgroundColor: '#000000',
      cornerRadius: 'sm',
      width: '72px',
      height: '72px',
      contents: itemContents
    };
  });

  // 5. 分成 3x3 九宮格 Rows
  const rows = [];
  for (let i = 0; i < flexItems.length; i += 3) {
    rows.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      justifyContent: 'center', // ← 加這行置中
      contents: flexItems.slice(i, i + 3)
    });
  }

  // 6. 組裝 Flex Bubble
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

  // 7. 回覆背包 Bubble
  await client.replyMessage(event.replyToken, {
    type: 'flex',
    altText: '你的背包',
    contents: bubble
  });

  // 8. 判斷是否已集滿
  const isComplete = await checkCollectionProgress(userId);
  if (isComplete) {
    const unlockBubble = buildUnlockBubble();
    await client.pushMessage(userId, {
      type: 'flex',
      altText: '✨ 集卡完成！',
      contents: unlockBubble
    });
  }

  return;
  }

  //查看指定卡片, 要判斷是否獲得, 有獲得即可看大圖;若輸入未獲得/資料庫未設定的卡片, 則回傳預設訊息
  if (/^查看\s/.test(userMessage)) {
    const cardName = userMessage.replace(/^查看\s/, '').trim();

    // 🔎 查卡片資料（從 cards 表）
    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .select()
      .eq('name', cardName);

    if (cardError || !cardData || cardData.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ 找不到這張卡片 😢'
      });
    }

    const card = cardData[0];

    // 🔐 查使用者是否擁有此卡片
    const { data: userCards, error: userError } = await supabase
      .from('user_cards')
      .select()
      .eq('line_id', userId)
      .eq('card_id', card.id);

    if (userError || !userCards || userCards.length === 0) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `🚫 你尚未解鎖「${card.name}」，快去抽卡吧！`
      });
    }

    // ✅ 使用者已擁有 → 回傳大圖 Bubble
    const bubble = buildCardBubble(card);

    return client.replyMessage(event.replyToken, {
      type: 'flex',
      altText: `卡片：${card.name}`,
      contents: bubble
    });
  }

  //顯示題目選項（Q1、Q2 等）
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


  //使用者選擇答案（作答區塊）
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

  //針對未設定的文字(文字類型)的預設回覆
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請輸入任務代碼（例：Q2133）開始答題！' + '<br>' +'或開啟遊戲選單點選您需求的功能哦～'
  });
}

// 呈現每張卡片的大圖, 包含圖片、名稱、稀有度、描述
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

//完成所有集卡後, 呈現的成就畫面, 包含連結按鈕(可設定填寫滿意度問卷/追蹤圖書館ig等)
function buildUnlockBubble() {
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: 'https://olis.kmu.edu.tw/images/game/unlock_effect.png',
      size: 'full',
      aspectRatio: '16:9',
      aspectMode: 'cover'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        {
          type: 'text',
          text: '🌟 恭喜！Congratulations!',
          size: 'xl',
          weight: 'bold',
          color: '#f2b546',
          align: 'center'
        },
        {
          type: 'text',
          text: '點擊按鈕看更多活動 Click the button to see more activities.',
          size: 'md',
          align: 'center',
          color: '#666666'
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '填寫遊玩回饋🎉' + '<br>' + 'Feedback🎉',
            uri: 'https://nc.kmu.edu.tw/index.php/apps/forms/s/dNaRWwcXDNTjLRfwgEz5Kama'
          },
          style: 'primary',
          color: '#778dc7'
        },
        
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '加入圖書館官方LINE🎉' + '<br>' + "library's official LINE account🎉",
            uri: 'https://line.me/R/ti/p/@ayr1866v'
          },
          style: 'primary',
          color: '#9bc650'
        },
        
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '追蹤圖書館官方IG🎉' + '<br>' + "Library's official Instagram account🎉",
            uri: 'https://www.instagram.com/kmulibrary/'
          },
          style: 'primary',
          color: '#FF6B00'
        }
      ]
    }
  };
}

//查詢是否完成所有集卡, 至supabase中比對是否擁有全部的卡片編號
async function checkCollectionProgress(userId) {
  // 查詢全部卡片 ID
  const { data: allCards, error: allError } = await supabase
    .from('cards')
    .select('id');

  if (allError || !allCards) {
    console.error('❌ 卡片資料查詢失敗:', allError?.message);
    return false;
  }

  const totalCardIds = allCards.map(c => c.id);

  // 查詢使用者已擁有的卡片 ID
  const { data: userCards, error: userError } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('line_id', userId);

  if (userError || !userCards) {
    console.error('❌ 使用者卡片查詢失敗:', userError?.message);
    return false;
  }

  const ownedCardIds = userCards.map(c => c.card_id);

  // 檢查是否集滿全部卡片
  return totalCardIds.every(id => ownedCardIds.includes(id));
}

// 初始化 Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.get('/', (req, res) => {
  res.send('LINE Bot is running!');
});


// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 LINE Bot server is running on port ${port}`);
});
