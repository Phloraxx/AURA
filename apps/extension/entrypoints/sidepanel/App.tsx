export function App() {
  return (
    <main className="shell">
      <p className="eyebrow">Adaptive User-Responsive Accessibility</p>
      <h1>AURA</h1>
      <p className="lede">
        Personal web adaptations built around your capabilities and preferences.
      </p>
      <section className="status" aria-labelledby="status-title">
        <h2 id="status-title">Setup ready</h2>
        <p>The extension shell is installed. Capability setup comes next.</p>
      </section>
      <button type="button" disabled aria-describedby="phase-note">
        Start accessible setup
      </button>
      <p id="phase-note" className="note">
        Available after the profile phase is installed.
      </p>
    </main>
  );
}
