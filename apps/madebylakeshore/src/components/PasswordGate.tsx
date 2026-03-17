import { useState, type FormEvent } from 'react';

interface PasswordGateProps {
  slug: string;
  title: string;
}

export default function PasswordGate({ slug, title }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/case-study-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      });

      const data = await res.json();

      if (data.success) {
        window.location.reload();
        return; // Keep loading state while page reloads
      }

      if (res.status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (res.status === 401) {
        setError('Incorrect password, please try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to verify password. Please check your connection and try again.');
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          {/* Lock icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mbl-cloud mb-6">
            <svg
              className="w-8 h-8 text-mbl-stone"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl md:text-3xl text-mbl-ink mb-3">
            {title}
          </h1>
          <p className="text-mbl-stone">
            This case study is password protected.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoFocus
              className="w-full px-4 py-3 border border-mbl-mist rounded-lg text-mbl-ink placeholder:text-mbl-stone/50 focus:outline-none focus:ring-2 focus:ring-mbl-accent focus:border-transparent transition-shadow"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full px-4 py-3 bg-mbl-dusk text-white font-heading font-medium rounded-lg hover:bg-mbl-slate transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'View Case Study'}
          </button>
        </form>

        <p className="text-center text-sm text-mbl-stone/70 mt-6">
          Don't have a password?{' '}
          <a href="/contact" className="text-mbl-accent hover:underline">
            Get in touch
          </a>
        </p>
      </div>
    </div>
  );
}
