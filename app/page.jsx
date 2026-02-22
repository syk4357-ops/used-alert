'use client';

import React, { useState, useEffect } from 'react';

export default function USDKRWAlertApp() {
  const [currentRate, setCurrentRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('monitor');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  
  const [settings, setSettings] = useState({
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
  });

  // 서버에서 설정 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.buy && data.sell) {
          setSettings(data);
        }
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
      }
    };
    loadSettings();
  }, []);

  // 설정 저장
  const saveSettings = async (newSettings) => {
    setSettings(newSettings);
    setSaving(true);
    setSaveMessage('');
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      
      if (response.ok) {
        setSaveMessage('✅ 저장 완료!');
      } else {
        setSaveMessage('❌ 저장 실패');
      }
    } catch (error) {
      setSaveMessage('❌ 저장 실패');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  // 환율 가져오기
  const fetchRate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/check-rate');
      const data = await response.json();
      if (data.success) {
        setCurrentRate(parseFloat(data.currentRate));
        setLastUpdate(new Date().toLocaleTimeString('ko-KR'));
      }
    } catch (error) {
      console.error('환율 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, 60000);
    return () => clearInterval(interval);
  }, []);

  // 매수 설정 변경
  const updateBuySetting = (index, field, value) => {
    const newSettings = { ...settings };
    newSettings.buy[index][field] = field === 'target' ? parseFloat(value) || 0 : value;
    saveSettings(newSettings);
  };

  // 매도 설정 변경
  const updateSellSetting = (index, field, value) => {
    const newSettings = { ...settings };
    newSettings.sell[index][field] = field === 'target' ? parseFloat(value) || 0 : value;
    saveSettings(newSettings);
  };

  // 알림 상태 확인
  const checkAlerts = () => {
    if (!currentRate) return { buyAlerts: [], sellAlerts: [] };
    
    const buyAlerts = settings.buy
      .map((s, i) => ({ ...s, level: i + 1 }))
      .filter(s => s.enabled && currentRate <= s.target);
    
    const sellAlerts = settings.sell
      .map((s, i) => ({ ...s, level: i + 1 }))
      .filter(s => s.enabled && currentRate >= s.target);
    
    return { buyAlerts, sellAlerts };
  };

  const { buyAlerts, sellAlerts } = checkAlerts();

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* 헤더 */}
      <div style={{
        backgroundColor: '#1a1a2e',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>💱 USD/KRW 환율 알림</h1>
        {saveMessage && (
          <div style={{
            position: 'absolute',
            right: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '14px'
          }}>
            {saveMessage}
          </div>
        )}
      </div>

      {/* 현재 환율 */}
      <div style={{
        backgroundColor: 'white',
        margin: '15px',
        borderRadius: '15px',
        padding: '25px',
        textAlign: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
          현재 환율 {lastUpdate && `(${lastUpdate})`}
        </div>
        <div style={{ 
          fontSize: '42px', 
          fontWeight: 'bold',
          color: '#1a1a2e'
        }}>
          {loading ? '...' : currentRate ? `₩${currentRate.toFixed(2)}` : '오류'}
        </div>
        <button 
          onClick={fetchRate}
          disabled={loading}
          style={{
            marginTop: '15px',
            padding: '10px 25px',
            backgroundColor: '#4a90d9',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            fontSize: '14px',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '조회 중...' : '🔄 새로고침'}
        </button>
        
        {/* 알림 상태 */}
        {(buyAlerts.length > 0 || sellAlerts.length > 0) && (
          <div style={{ marginTop: '20px' }}>
            {buyAlerts.length > 0 && (
              <div style={{
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                padding: '10px',
                borderRadius: '10px',
                marginBottom: '10px'
              }}>
                🟢 매수 {buyAlerts.map(a => `${a.level}단계`).join(', ')} 도달!
              </div>
            )}
            {sellAlerts.length > 0 && (
              <div style={{
                backgroundColor: '#ffebee',
                color: '#c62828',
                padding: '10px',
                borderRadius: '10px'
              }}>
                🔴 매도 {sellAlerts.map(a => `${a.level}단계`).join(', ')} 도달!
              </div>
            )}
          </div>
        )}
      </div>

      {/* 탭 메뉴 */}
      <div style={{
        display: 'flex',
        backgroundColor: 'white',
        margin: '0 15px',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        {['monitor', 'buy', 'sell'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '15px',
              border: 'none',
              backgroundColor: activeTab === tab ? '#1a1a2e' : 'white',
              color: activeTab === tab ? 'white' : '#666',
              fontSize: '14px',
              fontWeight: activeTab === tab ? 'bold' : 'normal'
            }}
          >
            {tab === 'monitor' ? '📊 모니터' : tab === 'buy' ? '🟢 매수' : '🔴 매도'}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div style={{ padding: '15px' }}>
        {activeTab === 'monitor' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>📋 설정 현황</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#2e7d32' }}>🟢 매수 목표</div>
              {settings.buy.map((s, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #eee',
                  opacity: s.enabled ? 1 : 0.4
                }}>
                  <span>{i + 1}단계</span>
                  <span>₩{s.target.toLocaleString()} {s.enabled ? '✅' : '⬜'}</span>
                </div>
              ))}
            </div>
            
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#c62828' }}>🔴 매도 목표</div>
              {settings.sell.map((s, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #eee',
                  opacity: s.enabled ? 1 : 0.4
                }}>
                  <span>{i + 1}단계</span>
                  <span>₩{s.target.toLocaleString()} {s.enabled ? '✅' : '⬜'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'buy' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '15px',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>🟢 매수 목표 설정</h3>
            <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>
              환율이 목표가 이하로 떨어지면 Telegram 알림
            </p>
            
            {settings.buy.map((s, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '15px',
                padding: '15px',
                backgroundColor: '#f9f9f9',
                borderRadius: '10px'
              }}>
                <span style={{ fontWeight: 'bold', minWidth: '50px' }}>{i + 1}단계</span>
                <input
                  type="number"
                  value={s.target}
                  onChange={(e) => updateBuySetting(i, 'target', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                <button
                  onClick={() => updateBuySetting(i, 'enabled', !s.enabled)}
                  disabled={saving}
                  style={{
                    padding: '12px 15px',
                    backgroundColor: s.enabled ? '#4caf50' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    minWidth: '60px'
                  }}
                >
                  {s.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
        )}
