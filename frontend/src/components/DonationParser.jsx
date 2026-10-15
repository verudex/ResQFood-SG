import { useState } from 'react';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/donations/parse`;

const PRIORITY_STYLES = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export default function DonationParser() {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [donation, setDonation] = useState(null);
  const [issues, setIssues] = useState([]);

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    setDonation(null);
    setIssues([]);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });

      const body = await response.json();
      if (!response.ok || !body?.success) {
        // Backend error messages are generic and safe to display.
        throw new Error(body?.error || 'Parsing failed');
      }

      if (body.status === 'incomplete') {
        setIssues(body.issues ?? []);
        return;
      }

      setDonation(body.data);
    } catch (err) {
      setError(
        err instanceof TypeError || !err.message
          ? 'Unable to parse donation. Please try again.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-3">
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={5}
        placeholder="Paste a WhatsApp-style donation message here..."
        className="w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 focus:border-red-600 focus:outline-none"
      />
      <button
        type="button"
        onClick={handleParse}
        disabled={loading || rawText.trim() === ''}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Parsing...' : 'Parse Donation'}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {issues.length > 0 && (
        <div
          role="alert"
          className="w-full rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-sm text-amber-900"
        >
          <p className="font-semibold">Donation not saved. Please fix:</p>
          <ul className="mt-1 list-disc pl-5">
            {issues.map((item) => (
              <li key={`${item.field}-${item.code}`}>{item.message}</li>
            ))}
          </ul>
        </div>
      )}

      {donation && (
        <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Item</dt>
            <dd className="text-sm font-semibold text-gray-900">{donation.itemType}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Quantity</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {donation.quantity}
              {donation.unit ? ` ${donation.unit}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Location</dt>
            <dd className="text-sm font-semibold text-gray-900">{donation.location}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Expires in</dt>
            <dd className="text-sm font-semibold text-gray-900">
              {donation.expiryHours} hours
              {donation.expiryAssumed ? ' (time assumed)' : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Priority</dt>
            <dd>
              <span
                className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${
                  PRIORITY_STYLES[donation.priority] ?? PRIORITY_STYLES.medium
                }`}
              >
                {donation.priority}
              </span>
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
