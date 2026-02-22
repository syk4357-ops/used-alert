'use client';
import React, { useState, useEffect, useCallback } from 'react';

export default function USDKRWAlertApp() {
  // 환율 상태
  const [currentRate, setCurrentRate] = useState(1432.50);
  const [previousRate, setPreviousRate] = useState(1432.50);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // 5단계 매수 목표가
  const [buyTargets, setBuyTargets] = useState([
    { price: 1380, enabled: true, label: '1단계' },
    { price: 1370, enabled: true, label: '2단계' },
    { price: 1360, enabled: true, label: '3단계' },
    { price: 1350, enabled: false, label: '4단계' },
    { price: 1340, enabled: false, label: '5단계' },
  ]);
  
  // 5단계 매도 목표가
  const [sellTargets, setSellTargets] = useState([
    { price: 1450, enabled: true, label: '1단계' },
    { price: 1460, enabled: true, label: '2단계' },
    { price: 1470, enabled: true, label: '3단계' },
    { price: 1480, enabled: false, label: '4단계' },
    { price: 1490, enabled: false, label: '5단계' },
  ]);
  
  // UI 상태
  const [activeTab, setActiveTab] = useState('monitor');
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashType, setFlashType] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [rateHistory, setRateHistory] = useState([]);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // 매수 목표가 업데이트
  const updateBuyTarget = (index, field, value) => {
    setBuyTargets(prev => prev.map((target, i) => 
      i === index ? { ...target, [field]: field === 'price' ? Number(value) : value } : target
    ));
  };

  // 매도 목표가 업데이트
  const updateSellTarget = (index, field, value) => {
    setSellTargets(prev => prev.map((target, i) => 
      i === index ? { ...target, [field]: field === 'price' ? Number(value) : value } : target
    ));
  };

  // 진동
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // 알림 트리거
  const triggerAlert = useCallback((type, level, rate, targetPrice) => {
    const now = new Date();
    const alertInfo = {
      type,
      level,
      rate,
      targetPrice,
      time: now.toLocaleTimeString('ko-KR'),
      date: now.toLocaleDateString('ko-KR')
    };
    
    setAlertHistory(prev => [alertInfo, ...prev].slice(0, 30));
    setFlashType(type);
    setIsFlashing(true);
    vibrate(type === 'buy' ? [200, 100, 200, 100, 200] : [500, 100, 500]);
    
    setTimeout(() => setIsFlashing(false), 2000);
  }, []);

  // 환율 업데이트 (데모용)
  const updateRate = useCallback(() => {
    setPreviousRate(currentRate);
    const change = (Math.random() - 0.5) * 14;
    const newRate = Math.max(1320, Math.min(1520, currentRate + change));
    
    setCurrentRate(newRate);
    setLastUpdated(new Date());
    setRateHistory(prev => [...prev, { rate: newRate, time: new Date() }].slice(-20));
    
    // 매수 알림 체크
    buyTargets.forEach((target, idx) => {
      if (target.enabled && newRate <= target.price) {
        triggerAlert('buy', idx + 1, newRate, target.price);
      }
    });
    
    // 매도 알림 체크
    sellTargets.forEach((target, idx) => {
      if (target.enabled && newRate >= target.price) {
        triggerAlert('sell', idx + 1, newRate, target.price);
      }
    });
  }, [currentRate, buyTargets, sellTargets, triggerAlert]);

  useEffect(() => {
    const interval = setInterval(updateRate, 30000);
    return () => clearInterval(interval);
  }, [updateRate]);

  const rateChange = currentRate - previousRate;
  const rateChangePercent = ((rateChange / previousRate) * 100).toFixed(3);

  const getBgClass = () => {
    if (!isFlashing) return 'bg-gray-950';
    return flashType === 'buy' ? 'bg-green-950' : 'bg-red-950';
  };

  // 활성화된 목표가 중 현재 환율과 가장 가까운 것 찾기
  const getClosestBuyTarget = () => {
    const enabled = buyTargets.filter(t => t.enabled && t.price > 0);
    if (enabled.length === 0) return null;
    return enabled.reduce((closest, t) => 
      Math.abs(t.price - currentRate) < Math.abs(closest.price - currentRate) ? t : closest
    );
  };

  const getClosestSellTarget = () => {
    const enabled = sellTargets.filter(t => t.enabled && t.price > 0);
    if (enabled.length === 0) return null;
    return enabled.reduce((closest, t) => 
      Math.abs(t.price - currentRate) < Math.abs(closest.price - currentRate) ? t : closest
    );
  };

  // 모니터 탭
  const MonitorTab = () => {
    const closestBuy = getClosestBuyTarget();
    const closestSell = getClosestSellTarget();
    
    return (
      <div className="px-4 pb-24">
        {/* 현재 환율 */}
        <div className={`rounded-3xl p-6 mb-4 text-center transition-all duration-300 ${
          isFlashing 
            ? flashType === 'buy' ? 'bg-green-900/80 ring-4 ring-green-400' : 'bg-red-900/80 ring-4 ring-red-400'
            : 'bg-gray-900'
        }`}>
          <p className="text-gray-400 text-sm mb-1">USD/KRW 현재 환율</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-bold tracking-tight">
              {currentRate.toFixed(2)}
            </span>
            <span className="text-2xl text-gray-400">원</span>
          </div>
          <div className={`mt-2 text-lg font-medium ${rateChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {rateChange >= 0 ? '▲' : '▼'} {Math.abs(rateChange).toFixed(2)} ({rateChange >= 0 ? '+' : ''}{rateChangePercent}%)
          </div>
          <p className="text-gray-500 text-xs mt-3">
            {lastUpdated.toLocaleTimeString('ko-KR')} 업데이트
          </p>
        </div>

        {/* 목표가 요약 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* 매수 요약 */}
          <div className={`rounded-2xl p-4 ${
            buyTargets.some(t => t.enabled && currentRate <= t.price) 
              ? 'bg-green-900/60 ring-2 ring-green-500' 
              : 'bg-gray-900'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💰</span>
              <span className="text-sm text-gray-400">매수 목표</span>
            </div>
            {closestBuy ? (
              <>
                <p className="text-xl font-bold">{closestBuy.price.toLocaleString()}원</p>
                <p className="text-xs text-gray-500">{closestBuy.label} (가장 근접)</p>
                <p className="text-xs mt-1 text-gray-400">
                  {buyTargets.filter(t => t.enabled).length}개 활성화
                </p>
              </>
            ) : (
              <p className="text-gray-500 text-sm">설정 없음</p>
            )}
            {buyTargets.some(t => t.enabled && currentRate <= t.price) && (
              <p className="text-green-400 text-sm mt-2 animate-pulse">● 매수 타이밍!</p>
            )}
          </div>

          {/* 매도 요약 */}
          <div className={`rounded-2xl p-4 ${
            sellTargets.some(t => t.enabled && currentRate >= t.price) 
              ? 'bg-red-900/60 ring-2 ring-red-500' 
              : 'bg-gray-900'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📈</span>
              <span className="text-sm text-gray-400">매도 목표</span>
            </div>
            {closestSell ? (
              <>
                <p className="text-xl font-bold">{closestSell.price.toLocaleString()}원</p>
                <p className="text-xs text-gray-500">{closestSell.label} (가장 근접)</p>
                <p className="text-xs mt-1 text-gray-400">
                  {sellTargets.filter(t => t.enabled).length}개 활성화
                </p>
              </>
            ) : (
              <p className="text-gray-500 text-sm">설정 없음</p>
            )}
            {sellTargets.some(t => t.enabled && currentRate >= t.price) && (
              <p className="text-red-400 text-sm mt-2 animate-pulse">● 매도 타이밍!</p>
            )}
          </div>
        </div>

        {/* 목표가 시각화 */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4">
          <p className="text-sm text-gray-400 mb-3">목표가 분포</p>
          <div className="relative h-12 bg-gray-800 rounded-full overflow-hidden">
            {/* 현재 환율 마커 */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white z-10"
              style={{ left: `${Math.min(100, Math.max(0, (currentRate - 1300) / 2.5))}%` }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap">
                현재
              </div>
            </div>
            
            {/* 매수 목표 */}
            {buyTargets.filter(t => t.enabled).map((t, i) => (
              <div
                key={`buy-${i}`}
                className="absolute top-1 bottom-1 w-2 bg-green-500 rounded-full opacity-70"
                style={{ left: `${Math.min(100, Math.max(0, (t.price - 1300) / 2.5))}%` }}
                title={`매수 ${t.label}: ${t.price}`}
              />
            ))}
            
            {/* 매도 목표 */}
            {sellTargets.filter(t => t.enabled).map((t, i) => (
              <div
                key={`sell-${i}`}
                className="absolute top-1 bottom-1 w-2 bg-red-500 rounded-full opacity-70"
                style={{ left: `${Math.min(100, Math.max(0, (t.price - 1300) / 2.5))}%` }}
                title={`매도 ${t.label}: ${t.price}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1,300</span>
            <span>1,400</span>
            <span>1,500</span>
          </div>
        </div>

        {/* 미니 차트 */}
        {rateHistory.length > 1 && (
          <div className="bg-gray-900 rounded-2xl p-4 mb-4">
            <p className="text-sm text-gray-400 mb-3">환율 추이</p>
            <div className="flex items-end justify-between h-16 gap-0.5">
              {rateHistory.slice(-15).map((item, idx) => {
                const min = Math.min(...rateHistory.map(r => r.rate));
                const max = Math.max(...rateHistory.map(r => r.rate));
                const range = max - min || 1;
                const height = ((item.rate - min) / range) * 100;
                const isLatest = idx === rateHistory.slice(-15).length - 1;
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-sm transition-all ${
                      isLatest ? 'bg-blue-400' : 'bg-blue-600/60'
                    }`}
                    style={{ height: `${Math.max(15, height)}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={updateRate}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 py-4 rounded-2xl font-semibold text-lg transition-colors"
        >
          🔄 환율 새로고침
        </button>
      </div>
    );
  };

  // 매수 설정 탭
  const BuySettingsTab = () => (
    <div className="px-4 pb-24">
      <div className="bg-green-900/30 border border-green-700 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-semibold text-green-400">매수 알림 설정</p>
            <p className="text-sm text-gray-400">환율이 목표가 이하로 떨어지면 알림</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {buyTargets.map((target, index) => (
          <div 
            key={index}
            className={`rounded-2xl p-4 transition-all ${
              target.enabled 
                ? 'bg-gray-900 ring-2 ring-green-600' 
                : 'bg-gray-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  target.enabled ? 'bg-green-600' : 'bg-gray-700'
                }`}>
                  {index + 1}
                </span>
                <span className="font-medium">{target.label}</span>
              </div>
              <button
                onClick={() => updateBuyTarget(index, 'enabled', !target.enabled)}
                className={`w-14 h-8 rounded-full transition-colors ${
                  target.enabled ? 'bg-green-500' : 'bg-gray-700'
                }`}
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-transform mx-1 ${
                  target.enabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₩</span>
              <input
                type="number"
                value={target.price}
                onChange={(e) => updateBuyTarget(index, 'price', e.target.value)}
                disabled={!target.enabled}
                className={`w-full rounded-xl pl-10 pr-4 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  target.enabled 
                    ? 'bg-gray-800' 
                    : 'bg-gray-800/50 text-gray-500'
                }`}
              />
            </div>

            {target.enabled && currentRate <= target.price && (
              <div className="mt-2 text-green-400 text-sm animate-pulse">
                ✓ 현재 환율이 목표가 이하입니다!
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-gray-900/50 rounded-xl">
        <p className="text-sm text-gray-400">
          💡 <strong>팁:</strong> 여러 단계를 설정하면 환율이 각 단계에 도달할 때마다 알림을 받을 수 있습니다.
          예: 1,380원, 1,370원, 1,360원...
        </p>
      </div>
    </div>
  );

  // 매도 설정 탭
  const SellSettingsTab = () => (
    <div className="px-4 pb-24">
      <div className="bg-red-900/30 border border-red-700 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📈</span>
          <div>
            <p className="font-semibold text-red-400">매도 알림 설정</p>
            <p className="text-sm text-gray-400">환율이 목표가 이상으로 오르면 알림</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sellTargets.map((target, index) => (
          <div 
            key={index}
            className={`rounded-2xl p-4 transition-all ${
              target.enabled 
                ? 'bg-gray-900 ring-2 ring-red-600' 
                : 'bg-gray-900/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  target.enabled ? 'bg-red-600' : 'bg-gray-700'
                }`}>
                  {index + 1}
                </span>
                <span className="font-medium">{target.label}</span>
              </div>
              <button
                onClick={() => updateSellTarget(index, 'enabled', !target.enabled)}
                className={`w-14 h-8 rounded-full transition-colors ${
                  target.enabled ? 'bg-red-500' : 'bg-gray-700'
                }`}
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-transform mx-1 ${
                  target.enabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₩</span>
              <input
                type="number"
                value={target.price}
                onChange={(e) => updateSellTarget(index, 'price', e.target.value)}
                disabled={!target.enabled}
                className={`w-full rounded-xl pl-10 pr-4 py-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  target.enabled 
                    ? 'bg-gray-800' 
                    : 'bg-gray-800/50 text-gray-500'
                }`}
              />
            </div>

            {target.enabled && currentRate >= target.price && (
              <div className="mt-2 text-red-400 text-sm animate-pulse">
                ✓ 현재 환율이 목표가 이상입니다!
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-gray-900/50 rounded-xl">
        <p className="text-sm text-gray-400">
          💡 <strong>팁:</strong> 여러 단계를 설정하면 환율이 각 단계에 도달할 때마다 알림을 받을 수 있습니다.
          예: 1,450원, 1,460원, 1,470원...
        </p>
      </div>
    </div>
  );

  // 알림 기록 탭
  const HistoryTab = () => (
    <div className="px-4 pb-24">
      {/* Telegram 설정 안내 */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-2xl p-4 mb-4">
        <button
          onClick={() => setShowSetupGuide(!showSetupGuide)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div className="text-left">
              <p className="font-semibold text-blue-400">Telegram 알림 설정</p>
              <p className="text-sm text-gray-400">백그라운드 알림 받기</p>
            </div>
          </div>
          <span className="text-gray-400">{showSetupGuide ? '▲' : '▼'}</span>
        </button>
        
        {showSetupGuide && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="font-medium text-blue-400 mb-2">📱 설정 방법:</p>
              <ol className="space-y-2 text-gray-300">
                <li>1. Telegram에서 @BotFather 검색</li>
                <li>2. /newbot 명령으로 봇 생성</li>
                <li>3. 봇 토큰 복사</li>
                <li>4. 생성된 봇에게 아무 메시지 전송</li>
                <li>5. @userinfobot에서 Chat ID 확인</li>
                <li>6. Vercel 환경변수에 설정</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-3">알림 기록</h3>
      
      {alertHistory.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl p-8 text-center">
          <span className="text-4xl mb-4 block">🔔</span>
          <p className="text-gray-400">아직 알림 기록이 없습니다</p>
          <p className="text-gray-500 text-sm mt-2">목표가 도달 시 여기에 기록됩니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertHistory.map((alert, idx) => (
            <div
              key={idx}
              className={`rounded-xl p-4 ${
                alert.type === 'buy' ? 'bg-green-900/40' : 'bg-red-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{alert.type === 'buy' ? '💰' : '📈'}</span>
                  <div>
                    <p className="font-semibold">
                      {alert.type === 'buy' ? '매수' : '매도'} {alert.level}단계
                    </p>
                    <p className="text-sm text-gray-400">{alert.date} {alert.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">₩{alert.rate.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">목표: ₩{alert.targetPrice}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {alertHistory.length > 0 && (
        <button
          onClick={() => setAlertHistory([])}
          className="w-full mt-4 py-3 bg-gray-800 rounded-xl text-gray-400 text-sm"
        >
          기록 삭제
        </button>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${getBgClass()} text-white transition-colors duration-300`}>
      {/* 상단 헤더 */}
      <div className="sticky top-0 bg-gray-950/90 backdrop-blur-lg z-10 px-4 py-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">💱 환율 알리미</h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-gray-400">실시간</span>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="pt-4">
        {activeTab === 'monitor' && <MonitorTab />}
        {activeTab === 'buy' && <BuySettingsTab />}
        {activeTab === 'sell' && <SellSettingsTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-2 py-2 pb-6">
        <div className="flex justify-around">
          {[
            { id: 'monitor', icon: '📊', label: '모니터' },
            { id: 'buy', icon: '💰', label: '매수설정' },
            { id: 'sell', icon: '📈', label: '매도설정' },
            { id: 'history', icon: '📋', label: '기록' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition ${
                activeTab === tab.id 
                  ? tab.id === 'buy' ? 'text-green-400' 
                    : tab.id === 'sell' ? 'text-red-400'
                    : 'text-blue-400'
                  : 'text-gray-500'
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
