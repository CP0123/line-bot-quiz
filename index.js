require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 連線
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 測試讀取 questions 資料表
async function testSupabase() {
  const { data, error } = await supabase.from('questions').select().limit(3);

  if (error) {
    console.error('❌ 錯誤：讀取失敗');
    console.error(error.message);
  } else {
    console.log('✅ 讀取成功，題目如下：');
    console.log(data);
  }
}

testSupabase();
