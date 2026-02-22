'use client';

import React, { useState, useEffect } from 'react';

export default function App() {
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
        setSaveMessage('✅ 저장됨');
      } else {
        setSaveMessage('❌ 실패');
      }
    } catch (error) {
      setSaveMessage('❌ 실패');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

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

  const updateBuy = (i, field, value) => {
    const n = { ...settings };
    n.buy[i][field] = field === 'target' ? parseFloat(value) || 0 : value;
    saveSettings(n);
  };

  const updateSell = (i, field, value) => {
    const n = { ...settings };
    n.sell[i][field] = field === 'target' ? parseFloat(value) || 0 : value;
    saveSettings(n);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'system-ui' }}>
      <div style={{ backgroundColor: '#1a1a2e', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>💱 USD/KRW 환율 알림</h1>
        {saveMessage && <span style={{ fontSize: '12px' }}> {saveMessage}</span>}
      </div>

      <div style={{ backgroundColor: 'white', margin: '15px', borderRadius: '15px', padding: '25px', textAlign: 'center' }}>
        <div style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
          현재 환율 {lastUpdate && `(${lastUpdate})`}
        </div>
        <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#1a1a2e' }}>
          {loading ? '...' : currentRate ? `₩${currentRate.toFixed(2)}` : '오류'}
        </div>
        <button onClick={fetchRate} style={{ marginTop: '15px', padding: '10px 25px', backgroundColor: '#4a90d9', color: 'white', border: 'none', borderRadius: '20px', fontSize: '14px' }}>
          🔄 새로고침
        </button>
      </div>

      <div style={{ display: 'flex', backgroundColor: 'white', margin: '0 15px', borderRadius: '10px' }}>
        {['monitor', 'buy', 'sell'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '15px', border: 'none', backgroundColor: activeTab === tab ? '#1a1a2e' : 'white', color: activeTab === tab ? 'white' : '#666', fontSize: '14px' }}>
            {tab === 'monitor' ? '📊 모니터' : tab === 'buy' ? '🟢 매수' : '🔴 매도'}
          </button>
        ))}
      </div>

      <div style={{ padding: '15px' }}>
        {activeTab === 'monitor' && (
          <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>📋 설정 현황</h3>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#2e7d32' }}>🟢 매수 목표</div>
              {settings.buy.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', opacity: s.enabled ? 1 : 0.4 }}>
                  <span>{i + 1}단계</span>
                  <span>₩{s.target.toLocaleString()} {s.enabled ? '✅' : '⬜'}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#c62828' }}>🔴 매도 목표</div>
              {settings.sell.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', opacity: s.enabled ? 1 : 0.4 }}>
                  <span>{i + 1}단계</span>
                  <span>₩{s.target.toLocaleString()} {s.enabled ? '✅' : '⬜'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'buy' && (
          <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🟢 매수 목표 설정</h3>
            {settings.buy.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
                <span style={{ fontWeight: 'bold', minWidth: '50px' }}>{i + 1}단계</span>
                <input type="number" value={s.target} onChange={(e) => updateBuy(i, 'target', e.target.value)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                <button onClick={() => updateBuy(i, 'enabled', !s.enabled)} style={{ padding: '12px 15px', backgroundColor: s.enabled ? '#4caf50' : '#ccc', color: 'white', border: 'none', borderRadius: '8px' }}>
                  {s.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sell' && (
          <div style={{ backgroundColor: 'white', borderRadius: '15px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>🔴 매도 목표 설정</h3>
            {settings.sell.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
                <span style={{ fontWeight: 'bold', minWidth: '50px' }}>{i + 1}단계</span>
                <input type="number" value={s.target} onChange={(e) => updateSell(i, 'target', e.target.value)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }} />
                <button onClick={() => updateSell(i, 'enabled', !s.enabled)} style={{ padding: '12px 15px', backgroundColor: s.enabled ? '#f44336' : '#ccc', color: 'white', border: 'none', borderRadius: '8px' }}>
                  {s.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '10px', fontSize: '13px', color: '#1565c0' }}>
          ✅ 설정 변경 시 자동 저장되며, Telegram 알림에도 적용됩니다!
        </div>
      </div>
    </div>
  );
}
