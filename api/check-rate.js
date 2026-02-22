export default async function handler(req, res) {
  try {
    const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    // 기본 설정
    let settings = {
      buy: [
        { target: 1380, enabled: true },
        { target: 1370, enabled: true },
        { target: 1360, enabled: true },
        { target: 1350, enabled: false },
        { target: 1340, enabled: false },
      ],
      sell: [
        { target: 1450, enabled: true },
        { target: 1460, enabled: true },
        { target: 1470, enabled: true },
        { target: 1480, enabled: false },
        { target: 1490, enabled: false },
      ]
    };

    // Upstash에서 설정 불러오기
    if (UPSTASH_URL && UPSTASH_TOKEN) {
      try {
        const settingsRes = await fetch(`${UPSTASH_URL}/get/usdkrw-settings`, {
          headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });
        const settingsData = await settingsRes.json();
        
        if (settingsData && settingsData.result) {
          const parsed = JSON.parse(settingsData.result);
          if (parsed && parsed.buy && parsed.sell) {
            settings = parsed;
          }
        }
      } catch (e) {
        console.log('Upstash 설정 불러오기 실패:', e.message);
      }
    }

    // 환율 가져오기
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    const currentRate = data.rates.KRW;

    // 목표가 체크
    const buyAlerts = [];
    const sellAlerts = [];

    for (let i = 0; i < settings.buy.length; i++) {
      const s = settings.buy[i];
      if (s.enabled && currentRate <= s.target) {
        buyAlerts.push({ level: i + 1, target: s.target });
      }
    }

    for (let i = 0; i < settings.sell.length; i++) {
      const s = settings.sell[i];
      if (s.enabled && currentRate >= s.target) {
        sellAlerts.push({ level: i + 1, target: s.target });
      }
    }

    // Telegram 알림 전송
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    let alertsTriggered = 0;

    for (const buy of buyAlerts) {
      const message = `💰🟢 매수 알림 (${buy.level}단계)\n\n💱 현재 환율: ₩${currentRate.toFixed(2)}\n🎯 목표가: ₩${buy.target}\n⏰ 시간: ${new Date().toLocaleString('ko-KR')}\n\n환율이 목표가 이하로 떨어졌습니다!`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
      });
      alertsTriggered++;
    }

    for (const sell of sellAlerts) {
      const message = `📈🔴 매도 알림 (${sell.level}단계)\n\n💱 현재 환율: ₩${currentRate.toFixed(2)}\n🎯 목표가: ₩${sell.target}\n⏰ 시간: ${new Date().toLocaleString('ko-KR')}\n\n환율이 목표가 이상으로 올랐습니다!`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
      });
      alertsTriggered++;
    }

    res.status(200).json({
      success: true,
      currentRate: currentRate.toFixed(2),
      settings: settings,
      checkedAt: new Date().toLocaleString('ko-KR'),
      alertsTriggered
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
