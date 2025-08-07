import React, { useState } from 'react';
import { AlertCircle, TrendingUp, TrendingDown, Scale } from 'lucide-react';

interface InferenceData {
  id: string;
  query: string;
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
  debate?: {
    id: string;
    bullArguments: string[];
    bearArguments: string[];
    judgeEvaluation: {
      winner: 'BULL' | 'BEAR' | 'NEUTRAL';
      confidence: number;
      reasoning: string;
      keyPoints: string[];
    };
    winner: string;
    confidence: number;
  };
}

interface Props {
  inference: InferenceData;
  onVerify: (selectedOption: string, confidence: number, rationale?: string) => void;
}

export const InferenceVerification: React.FC<Props> = ({ inference, onVerify }) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0.7);
  const [rationale, setRationale] = useState<string>('');
  const [showDebate, setShowDebate] = useState(false);

  const handleSubmit = () => {
    if (selectedOption) {
      onVerify(selectedOption, confidence, rationale);
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.8) return 'High';
    if (conf >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Query Display */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-2">Market Query</h2>
        <p className="text-gray-700 text-lg">{inference.query}</p>
      </div>

      {/* Three-Angle Analysis */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Conservative View */}
        <div className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all cursor-pointer
          ${selectedOption === 'conservative' ? 'border-blue-500 shadow-lg' : 'border-transparent hover:border-gray-300'}`}
          onClick={() => setSelectedOption('conservative')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-800">Conservative View</h3>
            <div className="text-blue-600">
              <AlertCircle size={24} />
            </div>
          </div>
          <p className="text-gray-700 mb-4">{inference.conservative.answer}</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Confidence</span>
              <span className={`font-semibold ${getConfidenceColor(inference.conservative.confidence)}`}>
                {getConfidenceLabel(inference.conservative.confidence)} ({(inference.conservative.confidence * 100).toFixed(0)}%)
              </span>
            </div>
            <p className="text-sm text-gray-600 italic">{inference.conservative.reasoning}</p>
          </div>
        </div>

        {/* Progressive View */}
        <div className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all cursor-pointer
          ${selectedOption === 'progressive' ? 'border-green-500 shadow-lg' : 'border-transparent hover:border-gray-300'}`}
          onClick={() => setSelectedOption('progressive')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-800">Progressive View</h3>
            <div className="text-green-600">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-gray-700 mb-4">{inference.progressive.answer}</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Confidence</span>
              <span className={`font-semibold ${getConfidenceColor(inference.progressive.confidence)}`}>
                {getConfidenceLabel(inference.progressive.confidence)} ({(inference.progressive.confidence * 100).toFixed(0)}%)
              </span>
            </div>
            <p className="text-sm text-gray-600 italic">{inference.progressive.reasoning}</p>
          </div>
        </div>

        {/* Synthetic View */}
        <div className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all cursor-pointer
          ${selectedOption === 'synthetic' ? 'border-purple-500 shadow-lg' : 'border-transparent hover:border-gray-300'}`}
          onClick={() => setSelectedOption('synthetic')}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-purple-800">Synthetic View</h3>
            <div className="text-purple-600">
              <Scale size={24} />
            </div>
          </div>
          <p className="text-gray-700 mb-4">{inference.synthetic.answer}</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Confidence</span>
              <span className={`font-semibold ${getConfidenceColor(inference.synthetic.confidence)}`}>
                {getConfidenceLabel(inference.synthetic.confidence)} ({(inference.synthetic.confidence * 100).toFixed(0)}%)
              </span>
            </div>
            <p className="text-sm text-gray-600 italic">{inference.synthetic.reasoning}</p>
          </div>
        </div>
      </div>

      {/* Debate Section */}
      {inference.debate && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">AI Debate Analysis</h3>
            <button
              onClick={() => setShowDebate(!showDebate)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {showDebate ? 'Hide' : 'Show'} Debate
            </button>
          </div>

          {showDebate && (
            <div className="space-y-6">
              {/* Bull vs Bear Arguments */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Bull Case */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <TrendingUp className="text-green-600 mr-2" size={20} />
                    <h4 className="font-semibold text-green-800">Bull Case</h4>
                  </div>
                  <ul className="space-y-2">
                    {inference.debate.bullArguments.map((arg, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start">
                        <span className="text-green-600 mr-2">•</span>
                        <span>{arg}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bear Case */}
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <TrendingDown className="text-red-600 mr-2" size={20} />
                    <h4 className="font-semibold text-red-800">Bear Case</h4>
                  </div>
                  <ul className="space-y-2">
                    {inference.debate.bearArguments.map((arg, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start">
                        <span className="text-red-600 mr-2">•</span>
                        <span>{arg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Judge Verdict */}
              <div className={`rounded-lg p-4 ${
                inference.debate.winner === 'BULL' ? 'bg-green-100' :
                inference.debate.winner === 'BEAR' ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">Judge Verdict</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    inference.debate.winner === 'BULL' ? 'bg-green-600 text-white' :
                    inference.debate.winner === 'BEAR' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
                  }`}>
                    {inference.debate.winner} ({(inference.debate.confidence * 100).toFixed(0)}% confidence)
                  </span>
                </div>
                <p className="text-gray-700 mb-3">{inference.debate.judgeEvaluation.reasoning}</p>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Key Points:</p>
                  {inference.debate.judgeEvaluation.keyPoints.map((point, idx) => (
                    <p key={idx} className="text-sm text-gray-600 pl-4">• {point}</p>
                  ))}
                </div>
              </div>

              {/* Option to select debate winner */}
              <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedOption === 'debate_winner' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300'
              }`}
                onClick={() => setSelectedOption('debate_winner')}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={selectedOption === 'debate_winner'}
                    onChange={() => setSelectedOption('debate_winner')}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium">I agree with the debate outcome</p>
                    <p className="text-sm text-gray-600">
                      The {inference.debate.winner} case is more compelling based on the arguments presented
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verification Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Your Verification</h3>
        
        {/* Confidence Slider */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How confident are you in your selection? ({(confidence * 100).toFixed(0)}%)
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Not confident</span>
            <span>Somewhat confident</span>
            <span>Very confident</span>
          </div>
        </div>

        {/* Rationale */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rationale (optional)
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Explain your reasoning..."
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!selectedOption}
          className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
            selectedOption
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Submit Verification
        </button>
      </div>
    </div>
  );
};