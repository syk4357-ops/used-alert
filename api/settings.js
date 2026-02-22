export default async function handler(req, res) {
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  const defaultSettings = {
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

  // GET: 설정 불러오기
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${UPSTASH_URL}/get/usdkrw-settings`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      const data = await response.json();
      
      if (data.result) {
        return res.status(200).json(JSON.parse(data.result));
      } else {
        return res.status(200).json(defaultSettings);
      }
    } catch (error) {
      return res.status(200).json(defaultSettings);
    }
  }

  // POST: 설정 저장하기
  if (req.method === 'POST') {
    try {
      const settings = req.body;
      const value = encodeURIComponent(JSON.stringify(settings));
      
      const response = await fetch(`${UPSTASH_URL}/set/usdkrw-settings/${value}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      
      const result = await response.json();
      
      if (result.result === 'OK') {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Save failed', result });
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
