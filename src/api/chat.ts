import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Initialize OpenAI client for Claude API
const anthropic = axios.create({
  baseURL: 'https://api.anthropic.com/v1',
  headers: {
    'anthropic-version': '2023-06-01',
    'x-api-key': process.env.ANTHROPIC_API_KEY || '',
    'content-type': 'application/json'
  }
});

// Mock PandasAI functionality (in production, you'd use actual PandasAI)
async function analyzePandasQuery(query: string, marketData: any) {
  // Simulate PandasAI analysis
  const analysis = {
    query,
    dataframe_shape: [marketData.length, 10],
    columns: ['symbol', 'price', 'volume', 'change', 'psi', 'rho', 'q', 'f', 'sentiment', 'timestamp'],
    insights: [],
    visualizations: []
  };

  const lowerQuery = query.toLowerCase();

  // Handle correlation queries
  if (lowerQuery.includes('correlation')) {
    const symbols = marketData.map((d: any) => d.symbol);
    if (lowerQuery.includes('aapl') && lowerQuery.includes('msft')) {
      analysis.insights.push({
        type: 'correlation',
        message: 'AAPL and MSFT show moderate positive correlation of 0.68 based on price movements and coherence metrics',
        data: { correlation: 0.68, period: '24h' }
      });
    } else {
      analysis.insights.push({
        type: 'correlation',
        message: 'Strong positive correlation found between NVDA and TSLA momentum indicators',
        data: { correlation: 0.82 }
      });
    }
  }

  // Handle news queries
  if (lowerQuery.includes('news')) {
    const newsSymbol = extractSymbolFromQuery(lowerQuery);
    analysis.insights.push({
      type: 'news_summary',
      message: `Recent news for ${newsSymbol || 'market'}: Strong earnings beat, AI chip demand surge, partnership announcements driving positive sentiment`,
      data: { sentiment_score: 0.75, articles_analyzed: 12 }
    });
  }

  // Handle metrics queries
  if (lowerQuery.includes('metric') || lowerQuery.includes('10') || lowerQuery.includes('list')) {
    analysis.insights.push({
      type: 'metrics_list',
      message: 'The 10 key metrics tracked are: 1) Symbol, 2) Price, 3) Volume, 4) Price Change %, 5) Psi (ψ) - Momentum, 6) Rho (ρ) - Volume Correlation, 7) Q - Market Energy, 8) F - Volatility Frequency, 9) Sentiment Score, 10) Last Update Timestamp',
      data: { metric_count: 10 }
    });
  }

  // Handle volume queries
  if (lowerQuery.includes('volume')) {
    analysis.insights.push({
      type: 'volume_analysis',
      message: 'Volume spike detected in AAPL, 3x average daily volume',
      data: { volume_ratio: 3.2 }
    });
  }

  // Handle trend queries
  if (lowerQuery.includes('trend') || lowerQuery.includes('momentum')) {
    analysis.insights.push({
      type: 'trend_analysis',
      message: 'Bullish momentum detected across tech sector, particularly in semiconductor stocks',
      data: { momentum_score: 0.75 }
    });
  }

  // Handle specific symbol queries
  const symbolMatch = lowerQuery.match(/\b(aapl|msft|nvda|tsla|btc|eth|spy|qqq)\b/);
  if (symbolMatch && !analysis.insights.length) {
    const symbol = symbolMatch[1].toUpperCase();
    const symbolData = marketData.find((d: any) => d.symbol === symbol);
    if (symbolData) {
      analysis.insights.push({
        type: 'symbol_analysis',
        message: `${symbol} trading at $${symbolData.price?.toFixed(2) || 'N/A'} with coherence scores: ψ=${symbolData.coherenceScores?.psi?.toFixed(2) || 'N/A'}, ρ=${symbolData.coherenceScores?.rho?.toFixed(2) || 'N/A'}, q=${symbolData.coherenceScores?.q?.toFixed(2) || 'N/A'}, f=${symbolData.coherenceScores?.f?.toFixed(2) || 'N/A'}`,
        data: symbolData
      });
    }
  }

  // Default response if no specific pattern matched
  if (analysis.insights.length === 0) {
    analysis.insights.push({
      type: 'general_analysis',
      message: `Analyzing ${marketData.length} symbols in your watchlist. Market shows mixed signals with varying coherence patterns across different sectors.`,
      data: { symbols_analyzed: marketData.length }
    });
  }

  return analysis;
}

function extractSymbolFromQuery(query: string): string | null {
  const match = query.match(/\b(aapl|msft|nvda|tsla|btc|eth|spy|qqq)\b/i);
  return match ? match[1].toUpperCase() : null;
}

// PandasAI chat endpoint
router.post('/chat/pandas', async (req, res) => {
  try {
    const { query, marketData } = req.body;
    
    // Analyze with PandasAI
    const analysis = await analyzePandasQuery(query, marketData || []);
    
    // Generate natural language response
    const response = {
      query,
      analysis,
      response: `Based on the analysis of ${analysis.dataframe_shape[0]} market data points:\n\n${
        analysis.insights.map(i => i.message).join('\n')
      }\n\nThe data shows ${analysis.columns.length} key metrics being tracked across all symbols.`,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('PandasAI chat error:', error);
    res.status(500).json({ error: 'Failed to analyze data' });
  }
});

// Claude chat endpoint
router.post('/chat/claude', async (req, res) => {
  try {
    const { messages, context } = req.body;
    
    // If no API key, return mock response
    if (!process.env.ANTHROPIC_API_KEY) {
      const mockResponse = {
        message: {
          role: 'assistant',
          content: `I'm analyzing the market data you've provided. Based on the current coherence metrics:\n\n` +
            `• The market shows mixed signals with high momentum (ψ) in tech stocks\n` +
            `• Volume correlation (ρ) suggests institutional accumulation\n` +
            `• Market energy (q) indicates potential for volatility\n` +
            `• Frequency patterns (f) show consolidation phase\n\n` +
            `Would you like me to dive deeper into any specific aspect?`
        },
        timestamp: new Date().toISOString()
      };
      return res.json(mockResponse);
    }
    
    // Call Claude API
    const response = await anthropic.post('/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst assistant specializing in GCT (Generalized Coherence Theory) market analysis. Help users understand market patterns using coherence metrics: ψ (momentum), ρ (volume correlation), q (market energy), and f (volatility cycles).'
        },
        ...messages
      ]
    });
    
    res.json({
      message: response.data.content[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Claude chat error:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// News analysis endpoint
router.get('/news/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Mock news data (in production, integrate with news API)
    const mockNews = [
      {
        symbol,
        title: `${symbol} Shows Strong Momentum in Trading Session`,
        summary: 'Technical indicators suggest continued bullish sentiment',
        sentiment: 0.7,
        source: 'Market Watch',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        symbol,
        title: `Analysts Upgrade ${symbol} Price Target`,
        summary: 'Major investment firms raise target prices citing strong fundamentals',
        sentiment: 0.8,
        source: 'Reuters',
        timestamp: new Date(Date.now() - 7200000).toISOString()
      }
    ];
    
    res.json({ news: mockNews });
  } catch (error) {
    console.error('News fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

export default router;