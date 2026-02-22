export default async function handler(req, res) {
  try {
    const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Upstash에서 설정 불러오기
    let settings;
    try {
      const settingsRes = await fetch(`${UPSTASH_URL}/get/usdkrw-settings`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      const settingsData = await settingsRes.json();
      
      if (settingsData.result) {
        settings = JSON.parse(settingsData.result);
      }
    } catch (e) {
      console.log('Upstash 설정 불러오기 실패, 기본값 사용');
    }

    // 기본 설정 (Upstash 실패 시)
    if (!settings) {
      settings = {
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
    }

    // 환율 가져오기
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD'
    );
    const data = await response.json();
    const currentRate = data.rates.KRW;

    // 목표가 체크
    const buyAlerts = settings.buy
      .map((s, i) => ({ ...s, level: i + 1 }))
      .filter(s => s.enabled && currentRate <= s.target);

    const sellAlerts = settings.sell
      .map((s, i) => ({ ...s, level: i + 1 }))
      .filter(s => s.enabled && currentRate >= s.target);

    // Telegram 알림 전송
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    let alertsTriggered = 0;

    for (const buy of buyAlerts) {
      const message = `💰🟢 매수 알림 (${buy.level}단계)\n\n💱 현재 환율: ₩${currentRate.toFixed(2)}\n🎯 목표가: ₩${buy.target.toLocaleString()}\n⏰ 시간: ${new Date().toLocaleString('ko-KR')}\n\n환율이 목표가 이하로 떨어졌습니다!`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
      });
      alertsTriggered++;
    }

    for (const sell of sellAlerts) {
      const message = `📈🔴 매도 알림 (${sell.level}단계)\n\n💱 현재 환율: ₩${currentRate.toFixed(2)}\n🎯 목표가: ₩${sell.target.toLocaleString()}\n⏰ 시간: ${new Date().toLocaleString('ko-KR')}\n\n환율이 목표가 이상으로 올랐습니다!`;

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
      source: 'ExchangeRate-API',
      settingsSource: 'Upstash',
      checkedAt: new Date().toLocaleString('ko-KR'),
      alertsTriggered
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
