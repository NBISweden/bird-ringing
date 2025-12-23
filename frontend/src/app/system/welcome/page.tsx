'use client';

import { useModalsContext, useAuth } from "../contexts";

export default function WelcomePage() {
  const user = useAuth();
  const modals = useModalsContext();

  const handleButtonPress = () => {
    modals.add({
      title: "This is a demo modal",
      content: "This is the content of the demo modal",
      closeAction: () => console.log("close action"),
      actions: [
        {
          label: "Accept",
          action: () => console.log("accept action"),
          type: "success",
        },
        {
          label: "Reject",
          action: () => console.log("reject action"),
        }
      ]
    })
  }

  return (
    <>
      <div className="d-flex flex-column gap-2 mb-3" style={{textAlign: "left"}}>
        <h1>Welcome, {user.username} 🐦</h1>
        <p>You’re successfully logged in as an expert.</p>
      </div>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button type="button" className="btn btn-primary" onClick={handleButtonPress}>Primary</button>
        <button type="button" className="btn btn-secondary" onClick={handleButtonPress}>Secondary</button>
        <button type="button" className="btn btn-success" onClick={handleButtonPress}>Success</button>
        <button type="button" className="btn btn-danger" onClick={handleButtonPress}>Danger</button>
        <button type="button" className="btn btn-warning" onClick={handleButtonPress}>Warning</button>
        <button type="button" className="btn btn-info" onClick={handleButtonPress}>Info</button>
        <button type="button" className="btn btn-light" onClick={handleButtonPress}>Light</button>
        <button type="button" className="btn btn-dark" onClick={handleButtonPress}>Dark</button>
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

