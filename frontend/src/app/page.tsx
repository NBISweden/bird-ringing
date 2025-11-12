import "./page.scss";

export default function Home() {
    return (
        <>
            <div>
                <h1>Welcome to Birdy!</h1>
                <p>The most fantastic place to manage your licenses.</p>
            </div>
            <div className="d-flex flex-wrap gap-2 mb-3">
                <button type="button" className="btn btn-primary">Primary</button>
                <button type="button" className="btn btn-secondary">Secondary</button>
                <button type="button" className="btn btn-success">Success</button>
                <button type="button" className="btn btn-danger">Danger</button>
                <button type="button" className="btn btn-warning">Warning</button>
                <button type="button" className="btn btn-info">Info</button>
                <button type="button" className="btn btn-light">Light</button>
                <button type="button" className="btn btn-dark">Dark</button>
            </div>
            <div className="table-responsive w-75">
                <table className="table table-striped table-bordered align-middle">
                    <thead className="table-success">
                    <tr>
                        <th scope="col">First name</th>
                        <th scope="col">Last name</th>
                        <th scope="col">Email</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td>Anna</td>
                        <td>Svensson</td>
                        <td>anna.svensson@example.com</td>
                    </tr>
                    <tr>
                        <td>Johan</td>
                        <td>Andersson</td>
                        <td>johan.andersson@example.com</td>
                    </tr>
                    <tr>
                        <td>Karin</td>
                        <td>Lindberg</td>
                        <td>karin.lindberg@example.com</td>
                    </tr>
                    </tbody>
                </table>
            </div>
            <div className="d-flex flex-column  w-75 gap-2 mb-3">
                <div className="alert alert-success" role="alert">
                    A simple success alert—check it out!
                </div>
                <div className="alert alert-danger" role="alert">
                    A simple danger alert—check it out!
                </div>
                <div className="alert alert-warning" role="alert">
                    A simple warning alert—check it out!
                </div>
            </div>
        </>

    );
}
