'use client';

import { useContext, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthContext } from '../system/contexts';

export default function LoginPage() {
    const router = useRouter();
    const params = useSearchParams();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const auth = useContext(AuthContext);
    const signIn = auth && auth.signIn;

    const isProtected = auth === null || auth.signIn === undefined || isAuthenticating;
    let inputMessage = "Log In";
    if (isAuthenticating) {
      inputMessage = "Authenticating...";
    } else if (auth === null) {
      inputMessage = "Checking status..."
    } else if (!signIn) {
      inputMessage = "No authenticating method"
    }
    const targetPage = params.get("target") || "/system/welcome";

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsAuthenticating(true);
      setError("");
      if (!signIn) return;

      try {
        await signIn(username, password)
        window.location.reload(); // Force root to recheck auth
      } catch (err) {
        setError(String(err));
      } finally {
        setIsAuthenticating(false);
      }
    };

    useEffect(() => {
      if (auth !== null && auth.isAuthenticated) {
        router.push(targetPage);
      }
    }, [auth, targetPage])

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
                disabled={isProtected}
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
                disabled={isProtected}
              />
            </div>

            <button className="btn btn-primary w-100" type="submit" disabled={isProtected}>
              {inputMessage}
            </button>

            {error && <div className="alert alert-danger mt-3">{error}</div>}
          </form>
        </main>
    );
}
