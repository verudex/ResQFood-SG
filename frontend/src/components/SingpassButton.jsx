import { useState } from 'react';

const API_URL = 'http://localhost:5000/api/auth/mock-singpass';

export default function SingpassButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL, { method: 'POST' });
      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const data = await response.json();
      const verifiedName = data?.id_token_payload?.sub_attributes?.name;
      if (!data.success || !verifiedName) {
        throw new Error('Verification failed');
      }

      setName(verifiedName);
    } catch {
      setError('Unable to verify identity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (name) {
    return (
      <span className="inline-flex items-center rounded-md bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
        Verified: {name}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleVerify}
        disabled={loading}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Verifying...' : 'Verify Identity via Singpass'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
