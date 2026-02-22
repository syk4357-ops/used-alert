// api/check-rate.js
// Vercel Serverless Function - 환율 체크 및 Telegram 알림

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 환경변수에서 설정 가져오기
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  
  // 매수 목표가 (5단계)
  const BUY_TARGETS = [
    { price: parseFloat(process.env.BUY_TARGET_1 || '0'), enabled: process.env.BUY_ENABLED_1 === 'true' },
    { price: parseFloat(process.env.BUY_TARGET_2 || '0'), enabled: process.env.BUY_ENABLED_2 === 'true' },
    { price: parseFloat(process.env.BUY_TARGET_3 || '0'), enabled: process.env.BUY_ENABLED_3 === 'true' },
    { price: parseFloat(process.env.BUY_TARGET_4 || '0'), enabled: process.env.BUY_ENABLED_4 === 'true' },
    { price: parseFloat(process.env.BUY_TARGET_5 || '0'), enabled: process.env.BUY_ENABLED_5 === 'true' },
  ];
  
  // 매도 목표가 (5단계)
  const SELL_TARGETS = [
    { price: parseFloat(process.env.SELL_TARGET_1 || '0'), enabled: process.env.SELL_ENABLED_1 === 'true' },
    { price: parseFloat(process.env.SELL_TARGET_2 || '0'), enabled: process.env.SELL_ENABLED_2 === 'true' },
    { price: parseFloat(process.env.SELL_TARGET_3 || '0'), enabled: process.env.SELL_ENABLED_3 === 'true' },
    { price: parseFloat(process.env.SELL_TARGET_4 || '0'), enabled: process.env.SELL_ENABLED_4 === 'true' },
    { price: parseFloat(process.env.SELL_TARGET_5 || '0'), enabled: process.env.SELL_ENABLED_5 === 'true' },
  ];

  try {
    // 1. 환율 API 호출 (무료 API 사용)
    const rateResponse = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD'
    );
    const rateData = await rateResponse.json();
    const currentRate = rateData.rates.KRW;
    
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const alerts = [];

    // 2. 매수 목표가 체크
    BUY_TARGETS.forEach((target, index) => {
      if (target.enabled && target.price > 0 && currentRate <= target.price) {
        alerts.push({
          type: 'BUY',
          level: index + 1,
          targetPrice: target.price,
          currentRate
        });
      }
    });

    // 3. 매도 목표가 체크
    SELL_TARGETS.forEach((target, index) => {
      if (target.enabled && target.price > 0 && currentRate >= target.price) {
        alerts.push({
          type: 'SELL',
          level: index + 1,
          targetPrice: target.price,
          currentRate
        });
      }
    });

    // 4. 알림 전송
    if (alerts.length > 0 && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      for (const alert of alerts) {
        const emoji = alert.type === 'BUY' ? '💰🟢' : '📈🔴';
        const action = alert.type === 'BUY' ? '매수' : '매도';
        
        const message = `
${emoji} ${action} 알림 (${alert.level}단계)

💱 현재 환율: ₩${currentRate.toFixed(2)}
🎯 목표가: ₩${alert.targetPrice.toFixed(2)}
⏰ 시간: ${now}

${alert.type === 'BUY' ? '환율이 목표가 이하로 떨어졌습니다!' : '환율이 목표가 이상으로 올랐습니다!'}
        `.trim();

        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: message,
              parse_mode: 'HTML'
            })
          }
        );
      }
    }

    // 5. 응답 반환
    return res.status(200).json({
      success: true,
      currentRate,
      checkedAt: now,
      alertsTriggered: alerts.length,
      alerts,
      buyTargets: BUY_TARGETS,
      sellTargets: SELL_TARGETS
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
