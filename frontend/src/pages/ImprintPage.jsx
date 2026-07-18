import { Link } from 'react-router'
import './ImprintPage.css'

export default function ImprintPage() {
  return (
    <div className="imprint-screen">
      <div className="imprint-card">
        <p className="imprint-eyebrow">Split Even Wiser</p>
        <h1 className="imprint-title">Imprint</h1>

        <section className="imprint-section">
          <h2>Operator</h2>
          <p>
            Dennis Woithe<br />
            (Individual)
          </p>
        </section>

        <section className="imprint-section">
          <h2>Contact</h2>
          <p>E-Mail: <a href="mailto:info@split-even-wiser.com">info@split-even-wiser.com</a></p>
        </section>

        <section className="imprint-section">
          <h2>Address</h2>
          <p>
            Stadtrade 9<br />
            24113 Kiel<br />
            Germany
          </p>
        </section>

        <Link to="/" className="imprint-back-link">← Back</Link>
      </div>
    </div>
  )
}
