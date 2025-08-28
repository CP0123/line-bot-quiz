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
          text: `${card.rarity}`,
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
    },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'message',
                label: '集卡冊',
                text: '集卡冊'
              }
            }
          ]
        }
  };
}

function buildUnlockBubble() {
  return {
    type: 'bubble',
    hero: {
      type: 'image',
      url: 'https://olis.kmu.edu.tw/images/game/Achievement_unlocked.png',
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
          text: "遊戲達人就是你！\n You're the Game Master!",
          size: 'md',
          weight: 'bold',
          color: '#666666',
          align: 'center',
          wrap: true
        },
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
            label: '遊玩回饋 Feedback',
            uri: 'https://nc.kmu.edu.tw/index.php/apps/forms/s/dNaRWwcXDNTjLRfwgEz5Kama'
          },
          style: 'primary',
          color: '#778dc7'
        }
      ]
    }
  };
}


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


// 處理單筆事件
async function handleEvent(event) {

  console.log('🔔 收到事件:', event);

  if(event.type === 'follow'){
    return client.replyMessage(event.replyToken, {
      type: 'flex',
      altText: '遊戲說明Game Instructions',
      contents: {
        type: 'carousel',
        contents: [
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/Instructions_1.png',
              size: 'full',
              aspectRatio: '9:16',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '遊戲說明Game Instructions',
                  weight: 'bold',
                  size: 'md',
                  align: 'center'
                }
              ]
            }
          },
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/Instructions_2.png',
              size: 'full',
              aspectRatio: '9:16',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '遊戲說明Game Instructions',
                  weight: 'bold',
                  size: 'md',
                  align: 'center'
                }
              ]
            }
          },
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/Instructions_3.png',
              size: 'full',
              aspectRatio: '9:16',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '遊戲說明Game Instructions',
                  weight: 'bold',
                  size: 'md',
                  align: 'center'
                }
              ]
            }
          },
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/Instructions_4.png',
              size: 'full',
              aspectRatio: '9:16',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '遊戲說明Game Instructions',
                  weight: 'bold',
                  size: 'md',
                  align: 'center'
                }
              ]
            }
          },
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/Instructions_5.png',
              size: 'full',
              aspectRatio: '9:16',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '遊戲說明Game Instructions',
                  weight: 'bold',
                  size: 'md',
                  align: 'center'
                }
              ]
            }
          }
        ]
      }
    });
  }else if(!(event.type === 'message' && event.message.type === 'text')){
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '請開啟遊戲選單，或輸入任務代碼（例：Q1）開始答題！\nPlease open the game menu or enter the task code (e.g., Q1) to begin answering questions!'
    });
  }

  const userId = event.source.userId;
  const userMessage = event.message.text.trim().toUpperCase();;
  const upperMessage = userMessage.toUpperCase();
  
  //輸入關鍵字清除答題狀態
  if (userMessage === '抽卡' || userMessage === '集卡冊' || userMessage === '您尚未獲得此卡片\nYou have not yet obtained this card.' || userMessage === '獎勵兌換' || userMessage === '遊戲紀錄'|| userMessage === '遊戲說明'||userMessage === '圖書館資訊' || userMessage === '遊戲開始' || userMessage === '繼續遊玩') {
    delete userState[userId];
  }

  //卡片未獲得不回傳訊息
  if (userMessage === '您尚未獲得此卡片\nYou have not yet obtained this card.') {
    // 預設回覆
    return ;
  }

  if (userMessage === '遊戲說明') {
    return client.replyMessage(event.replyToken, {
      type: 'flex',
      altText: '遊戲說明Game Instructions',
      contents: {
        type: 'carousel',
        contents: [
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/Instructions_1.png',
              size: 'full',
              aspectRatio: '9:16',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '遊戲說明Game Instructions',
                  weight: 'bold',
                  size: 'md',
                  align: 'center'
                }
              ]
            }
          },
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/Instructions_2.png',
              size: 'full',
              aspectRatio: '9:16',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '遊戲說明Game Instructions',
                  weight: 'bold',
                  size: 'md',
                  align: 'center'
                }
              ]
            }
          },
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/Instructions_3.png',
              size: 'full',
              aspectRatio: '9:16',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '遊戲說明Game Instructions',
                  weight: 'bold',
                  size: 'md',
                  align: 'center'
                }
              ]
            }
          },
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/Instructions_4.png',
              size: 'full',
              aspectRatio: '9:16',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '遊戲說明Game Instructions',
                  weight: 'bold',
                  size: 'md',
                  align: 'center'
                }
              ]
            }
          },
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/Instructions_5.png',
              size: 'full',
              aspectRatio: '9:16',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '遊戲說明Game Instructions',
                  weight: 'bold',
                  size: 'md',
                  align: 'center'
                }
              ]
            }
          }
        ]
      }
    });
  }

  if (userMessage === '圖書館資訊') {
    return client.replyMessage(event.replyToken, {
      type: 'flex',
      altText: '遊戲說明Game Instructions',
      contents: {
        type: 'carousel',
        contents: [
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/寶箱.png',
              size: 'full',
              aspectRatio: '1:1',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              contents: [
                {
                  type: 'text',
                  text: "圖書館LINE\n(library's LINE)",
                  size: 'md',
                  weight: 'bold',
                  color: '#666666',
                  align: 'center',
                  wrap: true
                },
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
                    label: '加好友 Add as friend',
                    uri: 'https://line.me/R/ti/p/%40ayr1866v'
                  },
                  style: 'primary',
                  color: '#778dc7'
                }
              ]
            }
          },
          {
            type: 'bubble',
            hero: {
              type: 'image',
              url: 'https://olis.kmu.edu.tw/images/game/寶箱.png',
              size: 'full',
              aspectRatio: '1:1',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              contents: [
                {
                  type: 'text',
                  text: "圖書館IG\n(library's Instagram)",
                  size: 'md',
                  weight: 'bold',
                  color: '#666666',
                  align: 'center',
                  wrap: true
                },
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
                    label: '追蹤 Follow',
                    uri: 'https://line.me/R/ti/p/%40ayr1866v'
                  },
                  style: 'primary',
                  color: '#778dc7'
                }
              ]
            }
          }
        ]
      }
    });
  }

  if (userMessage === '遊戲開始' || userMessage === '繼續遊玩') {
    try {
      // 1. 取得所有題目代碼
      const { data: questions, error: qError } = await supabase
        .from('questions')
        .select();
  
      if (qError || !questions || questions.length === 0) {
        console.error('❌ 題目查詢失敗:', qError?.message);
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '⚠️ 無法載入題目，請稍後再試！'
        });
      }
  
      const allCodes = questions.map(q => q.code);
      console.log('✅ 所有題目代碼:', allCodes);
  
      // 2. 查詢使用者已答對的題目代碼
      const { data: answered, error: aError } = await supabase
        .from('answers')
        .select('question_code')
        .eq('line_id', userId)
        .eq('is_correct', true);
  
      if (aError) {
        console.error('❌ 使用者答題查詢失敗:', aError?.message);
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '⚠️ 無法載入答題紀錄，請稍後再試！'
        });
      }
  
      const completedCodes = answered?.map(a => a.question_code) ?? [];
      console.log('✅ 已完成題目代碼:', completedCodes);
  
      // 3. 篩選尚未完成的題目代碼
      const remainingCodes = allCodes.filter(code => !completedCodes.includes(code));
      console.log('✅ 尚未完成題目代碼:', remainingCodes);
  
      // 4. 若已完成所有題目
      if (remainingCodes.length === 0) {
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '🎉 你已完成所有題目，太厲害了！'
        });
      }
  
      // 5. 建立 quickReply 選項
      const quickReplyItems = remainingCodes.map(code => ({
        type: 'action',
        action: {
          type: 'message',
          label: code,
          text: code
        }
      }));
  
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '請選擇要挑戰的題目代碼：',
        quickReply: {
          items: quickReplyItems
        }
      });
  
    } catch (err) {
      console.error('❌ 發生例外錯誤:', err.message);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '🚫 發生錯誤，請稍後再試！'
      });
    }
  }
    
  // 🟡 查詢遊戲紀錄區塊（放最前面）
  
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
        text: '⚠️ 尚未找到你的遊戲紀錄，請先答題後再試！\nYour game record has not been found yet.\nPlease answer the questions first and try again!'
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
      type: 'flex',
      altText: '遊戲紀錄 Game Record',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: '🎮 遊戲紀錄 Game Record',
              weight: 'bold',
              size: 'lg'
            },
            {
              type: 'text',
              text: `✅ 答對題數 Number of Questions Completed：${correctAnswers}`,
              wrap: true
            },
            {
              type: 'text',
              text: `🏆 當前得分 Current score：${score}`,
              wrap: true
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'message',
                label: '繼續遊玩 Continue playing',
                text: '繼續遊玩'
              }
            }
          ]
        }
      }
    });
  }

  if (userMessage === '獎勵兌換') {
    // 1. 查詢使用者分數
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select()
      .eq('line_id', userId);

    const currentScore = userData?.[0]?.score ?? 0;

    //查詢後發現小於20分, 即回傳預設文字;大於20分即呈現抽卡的Flex Message (bubble)
    if (currentScore < 20) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '💸 目前分數不足以抽卡（需有20分）\nYour current score is insufficient to draw cards (20 points are required).'
      });
    }else {
      return client.replyMessage(event.replyToken, {
      type: 'flex',
      altText: '獎勵兌換',
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
                text: '扣20分抽卡 Draw a card (-20 points)',
                weight: 'bold',
                size: 'sm',
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
                  label: '抽卡 Draw a card',
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
    // 1. 查詢使用者分數
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select()
      .eq('line_id', userId);

    const currentScore = userData?.[0]?.score ?? 0;

  // 2. 查詢所有卡片
  const { data: allCards } = await supabase.from('cards').select();
  const totalCardCount = 9; // ✅ 固定為九宮格卡冊上限

  // 3. 查詢使用者已擁有的卡片
  const { data: ownedCards } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('line_id', userId);

  const ownedIds = ownedCards.map((c) => c.card_id);
  const ownedCount = ownedIds.length;

  // 4. 判斷是否已集滿卡冊（9 張）
  if (ownedCount >= totalCardCount) {
    const bubble = buildUnlockBubble();
    return client.replyMessage(event.replyToken, {
      type: 'flex',
      altText: '✨ 集卡完成！',
      contents: bubble
    });
  }else if(currentScore < 20){
    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '💸 目前分數不足以抽卡（需有20分）\nYour current score is insufficient to draw cards (20 points are required).'
      });
  }

  // 6. 篩出尚未獲得的卡片
  const unownedCards = allCards.filter(card => !ownedIds.includes(card.id));

  if (unownedCards.length === 0) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '🏆 你已完成集卡冊，太強啦！'
    });
  }

  // 7. 隨機抽一張未擁有卡
  const newCard = unownedCards[Math.floor(Math.random() * unownedCards.length)];

  // 8. 寫入 user_cards 表
  await supabase.from('user_cards').insert([
    {
      line_id: userId,
      card_id: newCard.id,
      created_at: new Date().toISOString()
    }
  ]);

  // 9. 扣除分數
  await supabase
    .from('users')
    .update({ score: currentScore - 20 })
    .eq('line_id', userId);

  // 10. 回覆 Flex Bubble
  const bubble = buildCardBubble(newCard);

  return client.replyMessage(event.replyToken, {
    type: 'flex',
    altText: `你抽中了 ${newCard.name}！`,
    contents: bubble
  });
}


  if (userMessage === '集卡冊') {
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

  // 4. 生成卡片 Flex 圖片，加灰階與黑框
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
          url: 'https://olis.kmu.edu.tw/images/game/unlocked.png',
          aspectRatio: '1:1',
          aspectMode: 'cover',
          size: 'full',
          action: {
            type: 'message',
            label: '?',
            text: '您尚未獲得此卡片\nYou have not yet obtained this card.'
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
          text: '集卡冊\n Collectible card album',
          weight: 'bold',
          size: 'md',
          align: 'center',
          margin: 'md',
          wrap: true
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
      text: '⚠️ 找不到這張卡片 This card cannot be found. 😢'
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
      text: '📌 你已經完成此題，可以挑戰其他題目唷\nYou have completed this question. You can now try other questions. 🎮'
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
      text: '找不到對應的題目 No matching question found. 😢'
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
    const explain_text = question.explain_text;
    const explain_image = question.explain_image;
    const explain_url = question.explain_url;
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
        type: 'flex',
        altText: '回答結果',
        contents: {
          type: 'bubble',
          hero: {
            type: 'image',
            url: explain_image,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: explain_text,
                weight: 'bold',
                size: 'sm',
                align: 'center',
                wrap: true
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
                  label: '繼續遊玩 Continue playing',
                  text: '繼續遊玩'
                },
                color: '#7D6AFF'
              }
            ]
          }
        }
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
        text: `❌ 答錯囉！再答一次~ \nWrong answer! Try again.\n\n📖 題目（${question.code}）：${question.text}`,
        quickReply: {
          items: quickReplyItems
        }
      });
    }
  }

  // 預設回覆
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: '請開啟遊戲選單，或輸入任務代碼（例：Q1）開始答題！\nPlease open the game menu or enter the task code (e.g., Q1) to begin answering questions!'
  });
}

app.get('/', (req, res) => {
  res.send('LINE Bot is running!');
});


// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 LINE Bot server is running on port ${port}`);
});
