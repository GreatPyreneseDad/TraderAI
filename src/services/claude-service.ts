import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';

export interface ClaudeConfig {
  apiKey: string;
}

export interface InferenceRequest {
  query: string;
  context?: string;
  marketData?: any;
}

export interface InferenceResponse {
  conservative: {
    answer: string;
    confidence: number;
    reasoning: string;
  };
  progressive: {
    answer: string;
    confidence: number;
    reasoning: string;
  };
  synthetic: {
    answer: string;
    confidence: number;
    reasoning: string;
  };
}

export interface DebateRequest {
  symbol: string;
  question: string;
  marketData: any;
  coherenceScores: any;
}

export interface DebateResponse {
  bullArguments: string[];
  bearArguments: string[];
  judgeEvaluation: {
    winner: 'BULL' | 'BEAR' | 'NEUTRAL';
    confidence: number;
    reasoning: string;
    keyPoints: string[];
  };
}

export class ClaudeService {
  private anthropic: Anthropic;

  constructor(config: ClaudeConfig) {
    this.anthropic = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async generateInference(request: InferenceRequest): Promise<InferenceResponse> {
    try {
      const systemPrompt = `You are a financial market analyst providing insights using three different perspectives:
1. Conservative: Risk-averse, traditional analysis
2. Progressive: Growth-focused, innovation-oriented
3. Synthetic: Balanced integration of both views

For each perspective, provide:
- A clear answer to the query
- Confidence level (0-1)
- Brief reasoning

Format your response as JSON with these exact keys: conservative, progressive, synthetic`;

      const userPrompt = `Query: ${request.query}
${request.context ? `Context: ${request.context}` : ''}
${request.marketData ? `Market Data: ${JSON.stringify(request.marketData)}` : ''}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1500,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON response
      const result = JSON.parse(content.text);
      return result as InferenceResponse;

    } catch (error) {
      logger.error('Failed to generate inference:', error);
      throw error;
    }
  }

  async runDebate(request: DebateRequest): Promise<DebateResponse> {
    try {
      // Bull Agent
      const bullResponse = await this.runDebateAgent('BULL', request);
      
      // Bear Agent
      const bearResponse = await this.runDebateAgent('BEAR', request);
      
      // Judge Agent
      const judgeResponse = await this.runJudgeAgent(
        request,
        bullResponse,
        bearResponse
      );

      return {
        bullArguments: bullResponse,
        bearArguments: bearResponse,
        judgeEvaluation: judgeResponse
      };

    } catch (error) {
      logger.error('Failed to run debate:', error);
      throw error;
    }
  }

  private async runDebateAgent(
    position: 'BULL' | 'BEAR',
    request: DebateRequest
  ): Promise<string[]> {
    const systemPrompt = `You are a ${position} market analyst debating about ${request.symbol}.
${position === 'BULL' ? 
  'You believe in the positive potential and growth opportunities.' : 
  'You focus on risks, challenges, and potential downsides.'}

Provide 3-5 compelling arguments supported by:
- Market data and coherence scores
- Technical analysis
- Fundamental factors
- Market sentiment

Format as a JSON array of argument strings.`;

    const userPrompt = `Question: ${request.question}
Market Data: ${JSON.stringify(request.marketData)}
Coherence Scores: ${JSON.stringify(request.coherenceScores)}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return JSON.parse(content.text);
  }

  private async runJudgeAgent(
    request: DebateRequest,
    bullArguments: string[],
    bearArguments: string[]
  ): Promise<DebateResponse['judgeEvaluation']> {
    const systemPrompt = `You are a neutral judge evaluating a market debate about ${request.symbol}.

Evaluate both sides objectively based on:
- Argument quality and evidence
- Logical consistency
- Market data support
- Risk/reward balance

Provide your verdict as JSON with:
- winner: "BULL", "BEAR", or "NEUTRAL"
- confidence: 0-1
- reasoning: Brief explanation
- keyPoints: Array of 2-3 key deciding factors`;

    const userPrompt = `Question: ${request.question}

Bull Arguments:
${bullArguments.map((arg, i) => `${i + 1}. ${arg}`).join('\n')}

Bear Arguments:
${bearArguments.map((arg, i) => `${i + 1}. ${arg}`).join('\n')}

Market Data: ${JSON.stringify(request.marketData)}
Coherence Scores: ${JSON.stringify(request.coherenceScores)}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 800,
      temperature: 0.5,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return JSON.parse(content.text);
  }
}