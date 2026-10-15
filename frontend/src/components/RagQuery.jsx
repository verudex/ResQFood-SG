import { useState } from 'react';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/qa/ask`;

export default function RagQuery() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleAsk = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuestion: question }),
      });
      if (!response.ok) {
        throw new Error('Request failed');
      }

      const data = await response.json();
      if (typeof data?.answer !== 'string') {
        throw new Error('Request failed');
      }

      setResult({
        answer: data.answer,
        sources: Array.isArray(data.sources) ? data.sources : [],
      });
    } catch {
      setError('Unable to get an answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleAsk}
      className="flex w-full max-w-xl flex-col items-start gap-3"
    >
      <label
        htmlFor="rag-question"
        className="text-sm font-semibold text-gray-900"
      >
        Ask the SFA Compliance Assistant
      </label>
      <div className="flex w-full gap-2">
        <input
          id="rag-question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="e.g. Can raw chicken share a container with cooked rice?"
          className="w-full rounded-md border border-gray-300 p-2 text-sm text-gray-900 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || question.trim() === ''}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Asking...' : 'Ask'}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {result && (
        <div className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm">
          <p className="text-sm text-gray-900">{result.answer}</p>
          {result.sources.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Sources: {result.sources.length === 1 ? 'page' : 'pages'}{' '}
              {result.sources.join(', ')}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
