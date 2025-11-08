'use client';

import { useEffect, useState } from 'react';

export default function WelcomePage() {
    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        const user = sessionStorage.getItem('username');
    setUsername(user);
    }, []);

    return (
        <main className="container mt-5 text-center">
            {username ? (
            <div>
                <h1>Welcome, {username} 🐦</h1>
                <p className="lead">You’re successfully logged in as an expert.</p>
            </div>
            ) : (
            <div>
                <h1>Welcome!</h1>
                <p className="lead">Please log in first.</p>
            </div>
            )}
        </main>
    );
}
