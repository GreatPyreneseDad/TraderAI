import { Router } from 'express';

const router = Router();

// Mock alerts for now
const mockAlerts = [
  {
    id: '1',
    type: 'PRICE_ALERT',
    severity: 'HIGH',
    symbol: 'BTC',
    title: 'BTC Price Alert',
    message: 'Bitcoin has reached $116,000 - your target price',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    acknowledged: false,
    data: {
      targetPrice: 116000,
      currentPrice: 116861,
      direction: 'above'
    }
  },
  {
    id: '2',
    type: 'COHERENCE_ALERT',
    severity: 'MEDIUM',
    symbol: 'ETH',
    title: 'ETH Coherence Spike',
    message: 'Ethereum coherence score (ψ) exceeded 0.8',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    acknowledged: false,
    data: {
      metric: 'psi',
      value: 0.82,
      threshold: 0.8
    }
  }
];

// Get alerts
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 50, acknowledged } = req.query;
    
    let alerts = [...mockAlerts];
    
    // Filter by acknowledged status if specified
    if (acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === (acknowledged === 'true'));
    }
    
    // Limit results
    alerts = alerts.slice(0, parseInt(limit as string));
    
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Acknowledge alert
router.put('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const alert = mockAlerts.find(a => a.id === id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    alert.acknowledged = true;
    res.json(alert);
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Create new alert
router.post('/alerts', async (req, res) => {
  try {
    const { type, symbol, condition, value } = req.body;
    
    const newAlert = {
      id: Date.now().toString(),
      type: 'USER_ALERT',
      severity: 'MEDIUM',
      symbol,
      title: `${symbol} Alert`,
      message: `Alert condition met: ${condition} ${value}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      data: { condition, value }
    };
    
    mockAlerts.unshift(newAlert);
    res.json(newAlert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

export default router;