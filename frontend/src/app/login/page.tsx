'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:3210/api/auth/login/';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const authHeader = 'Basic ' + btoa(`${username}:${password}`);

        try {
          const res = await fetch(API_URL, {
            method: 'GET',
            headers: {
              Authorization: authHeader,
            },
          });

          if (res.ok) {
            const data = await res.json();
            sessionStorage.setItem('username', data.username);
            router.push('/system/welcome');
          } else {
            const result = await res.json();
            setError(result?.detail || 'Invalid credentials');
          }
        } catch (err) {
          setError('Network or server error.');
        } finally {
          setLoading(false);
        }
    };

    return (
        <main className="container mt-5" style={{ maxWidth: '480px' }}>
          <h2 className="mb-4">Expert Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group mb-3">
              <label>Username</label>
              <input
                className="form-control"
                type="text"
                value={username}
                required
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group mb-3">
              <label>Password</label>
              <input
                className="form-control"
                type="password"
                value={password}
                required
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="btn btn-primary w-100" type="submit" disabled={loading}>
              {loading ? 'Authenticating...' : 'Log In'}
            </button>

            {error && <div className="alert alert-danger mt-3">{error}</div>}
          </form>
        </main>
    );
}
