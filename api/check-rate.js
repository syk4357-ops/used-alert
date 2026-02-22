export default async function handler(req, res) {
  try {
    // 한국수출입은행 API
    const API_KEY = process.env.KOREAEXIM_API_KEY;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    const response = await fetch(
      `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${API_KEY}&searchdate=${today}&data=AP01`
    );
    
    const data = await response.json();
    
    // USD 환율 찾기
    const usdData = data.find(item => item.cur_unit === 'USD');
    
    if (!usdData) {
      // 주말/공휴일엔 데이터 없음 - 전일 데이터 사용
      return res.status(200).json({ 
        success: false, 
        message: '오늘 환율 데이터 없음 (주말/공휴일)',
        checkedAt: new Date().toLocaleString('ko-KR')
      });
    }
    
    // 매매기준율 (쉼표 제거)
    const currentRate = parseFloat(usdData.deal_bas_r.replace(/,/g, ''));
    
    // 목표가 체크
    const buyTargets = [];
    const sellTargets = [];
    
    for (let i = 1; i <= 5; i++) {
      const buyTarget = parseFloat(process.env[`BUY_TARGET_${i}`]);
      const buyEnabled = process.env[`BUY_ENABLED_${i}`] === 'true';
      const sellTarget = parseFloat(process.env[`SELL_TARGET_${i}`]);
      const sellEnabled = process.env[`SELL_ENABLED_${i}`] === 'true';
      
      if (buyEnabled && buyTarget && currentRate <= buyTarget) {
        buyTargets.push({ level: i, target: buyTarget });
      }
      if (sellEnabled && sellTarget && currentRate >= sellTarget) {
        sellTargets.push({ level: i, target: sellTarget });
      }
    }
    
    // Telegram 알림 전송
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    
    let alertsTriggered = 0;
    
    for (const buy of buyTargets) {
      const message = `💰🟢 매수 알림 (${buy.level}단계)\n\n💱 현재 환율: ₩${currentRate.toLocaleString()}\n🎯 목표가: ₩${buy.target.toLocaleString()}\n⏰ 시간: ${new Date().toLocaleString('ko-KR')}\n\n환율이 목표가 이하로 떨어졌습니다!`;
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
      });
      alertsTriggered++;
    }
    
    for (const sell of sellTargets) {
      const message = `📈🔴 매도 알림 (${sell.level}단계)\n\n💱 현재 환율: ₩${currentRate.toLocaleString()}\n🎯 목표가: ₩${sell.target.toLocaleString()}\n⏰ 시간: ${new Date().toLocaleString('ko-KR')}\n\n환율이 목표가 이상으로 올랐습니다!`;
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
      });
      alertsTriggered++;
    }
    
    res.status(200).json({
      success: true,
      currentRate,
      source: '한국수출입은행',
      checkedAt: new Date().toLocaleString('ko-KR'),
      alertsTriggered
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
