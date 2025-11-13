'use client';

import { useRouter } from 'next/navigation';
import './page.scss';

export default function Home() {
  const router = useRouter();

  const handleLoginClick = () => {
    router.push('/login');
  };

  return (
    <main className="container text-center mt-5">
      <div>
        <h1>Welcome to Birdy!</h1>
        <p>The most fantastic place to manage your licenses.</p>
      </div>
      <div className="mt-4">
        <button className="btn btn-primary" onClick={handleLoginClick}>
          <i className="bi bi-twitter"></i> Experts Login
        </button>
      </div>
    </main>
  );
}
