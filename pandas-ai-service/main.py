"""
FastAPI server for PandasAI service
"""

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
from datetime import datetime
import logging
import re

from pandas_ai_service import PandasAIService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="TraderAI PandasAI Service",
    description="Natural language data analysis for market data",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGIN", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Initialize PandasAI service
pandas_service = PandasAIService()


# Request/Response models
class MarketAnalysisRequest(BaseModel):
    query: str = Field(..., description="Natural language query for analysis")
    symbols: Optional[List[str]] = Field(None, description="List of stock symbols to analyze")
    timeframe: str = Field("24h", description="Timeframe for analysis (1h, 24h, 7d, 30d)")
    use_cache: bool = Field(True, description="Whether to use cached results")


class MarketAnalysisResponse(BaseModel):
    success: bool
    query: str
    result: Any
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class InsightsRequest(BaseModel):
    symbols: List[str] = Field(..., description="List of symbols to analyze")


class AnomalyDetectionRequest(BaseModel):
    symbols: Optional[List[str]] = Field(None, description="Symbols to check for anomalies")


class TradingSignalRequest(BaseModel):
    strategy: str = Field(..., description="Trading strategy name")
    symbols: List[str] = Field(..., description="Symbols to generate signals for")


# Security middleware
def validate_query(query: str) -> bool:
    """Validate query for security concerns"""
    # Check for potentially harmful patterns
    blacklist_patterns = [
        r'\b(drop|delete|truncate|exec|execute)\b',
        r'\b(import|eval|compile|__[a-z]+__)\b',
        r'\b(os\.|sys\.|subprocess\.|open\(|file\()\b',
    ]
    
    for pattern in blacklist_patterns:
        if re.search(pattern, query, re.IGNORECASE):
            return False
    
    # Check query length
    if len(query) > 1000:
        return False
    
    return True


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token"""
    # TODO: Implement actual JWT verification
    # For now, just check if token exists
    if not credentials.credentials:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return credentials.credentials


# Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "pandas-ai",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/analyze", response_model=MarketAnalysisResponse)
async def analyze_market_data(
    request: MarketAnalysisRequest,
    token: str = Depends(verify_token)
):
    """Analyze market data using natural language queries"""
    try:
        # Validate query
        if not validate_query(request.query):
            raise HTTPException(
                status_code=400,
                detail="Query contains restricted operations or is too complex"
            )
        
        # Process analysis
        result = pandas_service.analyze_market_data(
            query=request.query,
            symbols=request.symbols,
            timeframe=request.timeframe,
            use_cache=request.use_cache
        )
        
        return MarketAnalysisResponse(**result)
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/insights")
async def generate_insights(
    request: InsightsRequest,
    token: str = Depends(verify_token)
):
    """Generate automated market insights"""
    try:
        insights = pandas_service.generate_market_insights(request.symbols)
        return insights
    except Exception as e:
        logger.error(f"Insights generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/anomalies")
async def detect_anomalies(
    request: AnomalyDetectionRequest,
    token: str = Depends(verify_token)
):
    """Detect anomalies in market data"""
    try:
        anomalies = pandas_service.detect_anomalies(request.symbols)
        return anomalies
    except Exception as e:
        logger.error(f"Anomaly detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/signals")
async def generate_trading_signals(
    request: TradingSignalRequest,
    token: str = Depends(verify_token)
):
    """Generate trading signals based on strategy"""
    try:
        signals = pandas_service.generate_trading_signals(
            strategy=request.strategy,
            symbols=request.symbols
        )
        return signals
    except Exception as e:
        logger.error(f"Signal generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/suggestions")
async def get_query_suggestions(
    context: Optional[str] = Query(None, description="Context for suggestions")
):
    """Get suggested queries based on context"""
    suggestions = {
        "general": [
            "Show me the top 5 stocks by coherence score",
            "Which stocks have the highest correlation between psi and price?",
            "Find stocks with unusual volume patterns today",
            "What's the average coherence score across all symbols?"
        ],
        "technical": [
            "Calculate RSI for all stocks and show overbought conditions",
            "Find stocks with coherence divergence patterns",
            "Show me stocks breaking out of their trading range",
            "Identify mean reversion opportunities"
        ],
        "risk": [
            "Which stocks show the highest volatility?",
            "Find correlations between different symbols",
            "Show me portfolio risk metrics",
            "Identify stocks with coherence score anomalies"
        ],
        "performance": [
            "What are today's top gainers by percentage?",
            "Show me stocks outperforming their sector",
            "Find stocks with consistent coherence patterns",
            "Compare performance across different timeframes"
        ]
    }
    
    if context and context in suggestions:
        return {"suggestions": suggestions[context]}
    
    return {"suggestions": suggestions}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)