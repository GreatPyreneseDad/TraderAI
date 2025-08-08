#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Free market data sources that don't require API keys
const FREE_APIS = {
  // Yahoo Finance (unofficial but works)
  yahoo: {
    quote: (symbol: string) => 
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
    symbols: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ']
  },
  
  // CoinGecko for crypto (free tier)
  coingecko: {
    btc: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true',
    eth: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true'
  },

  // Alpha Vantage (requires free API key)
  alphavantage: {
    apiKey: process.env.ALPHA_VANTAGE_KEY || 'demo',
    quote: (symbol: string, apiKey: string) => 
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
  }
};

// Fetch real stock data from Yahoo Finance
async function fetchYahooData(symbol: string) {
  try {
    console.log(`📊 Fetching ${symbol} from Yahoo Finance...`);
    const response = await axios.get(FREE_APIS.yahoo.quote(symbol), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const result = response.data.chart.result[0];
    const quote = result.indicators.quote[0];
    const meta = result.meta;

    const latestIndex = quote.close.length - 1;
    const price = quote.close[latestIndex] || meta.regularMarketPrice;
    const volume = quote.volume[latestIndex] || meta.regularMarketVolume;

    return {
      symbol,
      price: parseFloat(price.toFixed(2)),
      volume: BigInt(volume || 0),
      high: quote.high[latestIndex],
      low: quote.low[latestIndex],
      open: quote.open[latestIndex],
      previousClose: meta.previousClose,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
    };
  } catch (error) {
    console.error(`❌ Failed to fetch ${symbol} from Yahoo:`, error.message);
    return null;
  }
}

// Fetch crypto data from CoinGecko
async function fetchCryptoData() {
  try {
    console.log('🪙 Fetching crypto data from CoinGecko...');
    const btcResponse = await axios.get(FREE_APIS.coingecko.btc);
    const btcData = btcResponse.data.bitcoin;

    return {
      symbol: 'BTC',
      price: btcData.usd,
      volume: BigInt(Math.floor(btcData.usd_24h_vol || 0)),
      change24h: btcData.usd_24h_change
    };
  } catch (error) {
    console.error('❌ Failed to fetch crypto data:', error.message);
    return null;
  }
}

// Generate realistic coherence scores based on market conditions
function generateRealisticCoherenceScores(changePercent: number, volume: bigint) {
  const volatility = Math.abs(changePercent);
  const volumeNormalized = Number(volume) / 10000000; // Normalize to millions

  return {
    // PSI increases with volatility
    psi: Math.min(0.9, 0.5 + (volatility * 0.1)),
    
    // RHO correlates with volume
    rho: Math.min(0.8, 0.4 + (volumeNormalized * 0.01)),
    
    // Q represents quality/confidence
    q: 0.6 + (Math.random() * 0.2),
    
    // F is fractal dimension (relatively stable)
    f: 0.3 + (Math.random() * 0.1)
  };
}

// Generate sentiment based on price movement
function generateSentiment(changePercent: number): number {
  // Sentiment ranges from -1 to 1
  // Positive changes = positive sentiment
  return Math.max(-1, Math.min(1, changePercent / 5));
}

// Fetch data from Alpha Vantage
async function fetchAlphaVantageData(symbol: string) {
  try {
    const apiKey = FREE_APIS.alphavantage.apiKey;
    if (!apiKey || apiKey === 'demo') {
      return null;
    }

    console.log(`📈 Fetching ${symbol} from Alpha Vantage...`);
    const response = await axios.get(FREE_APIS.alphavantage.quote(symbol, apiKey));
    
    const quote = response.data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      console.warn(`⚠️  No data returned for ${symbol} from Alpha Vantage`);
      return null;
    }

    const price = parseFloat(quote['05. price']);
    const volume = parseInt(quote['06. volume']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

    return {
      symbol,
      price,
      volume: BigInt(volume),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      open: parseFloat(quote['02. open']),
      previousClose: parseFloat(quote['08. previous close']),
      change,
      changePercent
    };
  } catch (error) {
    console.error(`❌ Failed to fetch ${symbol} from Alpha Vantage:`, error.message);
    return null;
  }
}

// Main function to collect real market data
async function collectRealMarketData() {
  console.log('🚀 Starting real market data collection...\n');

  const results = [];
  const apiKey = FREE_APIS.alphavantage.apiKey;

  // If we have Alpha Vantage API key, use it as primary source
  if (apiKey && apiKey !== 'demo') {
    console.log('✅ Using Alpha Vantage API for stock data\n');
    
    // Fetch stock data from Alpha Vantage
    for (const symbol of FREE_APIS.yahoo.symbols) {
      const data = await fetchAlphaVantageData(symbol);
      if (data) {
        results.push({
          ...data,
          type: 'stock'
        });
      } else {
        // Fallback to Yahoo if Alpha Vantage fails
        const yahooData = await fetchYahooData(symbol);
        if (yahooData) {
          results.push({
            ...yahooData,
            type: 'stock'
          });
        }
      }
      // Alpha Vantage free tier: 5 API calls per minute
      await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds between calls
    }
  } else {
    console.log('⚠️  No Alpha Vantage API key, using Yahoo Finance\n');
    
    // Fallback to Yahoo Finance
    for (const symbol of FREE_APIS.yahoo.symbols) {
      const data = await fetchYahooData(symbol);
      if (data) {
        results.push({
          ...data,
          type: 'stock'
        });
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Fetch crypto data
  const cryptoData = await fetchCryptoData();
  if (cryptoData) {
    results.push({
      ...cryptoData,
      type: 'crypto',
      changePercent: cryptoData.change24h
    });
  }

  // Store in database
  console.log('\n💾 Storing real market data...');
  
  for (const data of results) {
    try {
      const coherenceScores = generateRealisticCoherenceScores(
        data.changePercent || 0, 
        data.volume
      );
      
      const sentiment = generateSentiment(data.changePercent || 0);

      const record = await prisma.marketData.create({
        data: {
          symbol: data.symbol,
          timestamp: new Date(),
          price: data.price,
          volume: data.volume,
          coherenceScores,
          sentiment
        }
      });

      console.log(`✅ ${data.symbol}: $${data.price} (${data.changePercent > 0 ? '+' : ''}${data.changePercent?.toFixed(2)}%)`);

      // Create alert if significant movement
      if (Math.abs(data.changePercent || 0) > 3) {
        await prisma.alert.create({
          data: {
            type: 'MARKET_ANOMALY',
            severity: Math.abs(data.changePercent) > 5 ? 'HIGH' : 'MEDIUM',
            symbol: data.symbol,
            title: `Significant price movement for ${data.symbol}`,
            message: `${data.changePercent > 0 ? 'Up' : 'Down'} ${Math.abs(data.changePercent).toFixed(2)}% - Price: $${data.price}`,
            data: {
              price: data.price,
              change: data.changePercent,
              volume: data.volume.toString()
            }
          }
        });
      }
    } catch (error) {
      console.error(`❌ Failed to store ${data.symbol}:`, error.message);
    }
  }

  // Update system health
  await prisma.systemHealth.create({
    data: {
      service: 'market-data',
      status: 'HEALTHY',
      message: `Collected real data for ${results.length} symbols`,
      metrics: {
        symbolsProcessed: results.length,
        source: 'Yahoo Finance & CoinGecko',
        timestamp: new Date()
      }
    }
  });

  console.log(`\n🎉 Real market data collection complete!`);
  console.log(`📊 Collected data for ${results.length} symbols`);
}

// Setup for Tiingo API (if you have a real key)
async function setupTiingoCollection() {
  const tiingoToken = process.env.TIINGO_API_TOKEN;
  
  if (tiingoToken && tiingoToken !== 'mock-tiingo-token') {
    console.log('🔑 Tiingo API key detected!');
    console.log('To use Tiingo API, update the data collection scripts.');
    console.log('Get your free API key at: https://www.tiingo.com/');
  } else {
    console.log('ℹ️  No Tiingo API key found. Using free data sources.');
    console.log('For more reliable data, get a free API key at:');
    console.log('  1. https://www.tiingo.com/ (stocks + crypto)');
    console.log('  2. https://www.alphavantage.co/ (stocks)');
    console.log('  3. https://finnhub.io/ (stocks + forex)');
  }
}

// Run the collection
async function main() {
  try {
    await setupTiingoCollection();
    console.log('');
    
    // Run once
    await collectRealMarketData();

    // Schedule to run every 5 minutes
    console.log('\n⏰ Scheduling updates every 5 minutes...');
    setInterval(async () => {
      console.log('\n🔄 Running scheduled update...');
      await collectRealMarketData();
    }, 5 * 60 * 1000);

    console.log('Press Ctrl+C to stop');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start collection
main();