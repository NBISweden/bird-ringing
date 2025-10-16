import "./page.css";

export default function Home() {
  return (
    <main>
      <div>
        <h1>Welcome to Birdy!</h1>
        <p>The most fantastic place to manage your licenses.</p>
      </div>
      <div>
        <button className="btn btn-primary">
          <i className="bi bi-twitter"></i> Fly with Bootstrap
        </button>
      </div>
    </main>
  );
}
