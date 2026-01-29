import { useMemo, useState } from 'react';
import { retrace } from '@ctalau/offguard';
import { fixtures } from './fixtures';
import './styles.css';

const defaultFixture = fixtures[0];

export const App = () => {
  const [selectedFixtureId, setSelectedFixtureId] = useState(defaultFixture.id);
  const [stackTrace, setStackTrace] = useState(defaultFixture.stack);
  const [mapping, setMapping] = useState(defaultFixture.mapping);
  const [output, setOutput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedFixture = useMemo(
    () => fixtures.find((fixture) => fixture.id === selectedFixtureId),
    [selectedFixtureId],
  );

  const handleLoadFixture = () => {
    if (!selectedFixture) {
      return;
    }

    setStackTrace(selectedFixture.stack);
    setMapping(selectedFixture.mapping);
    setOutput('');
    setErrorMessage('');
  };

  const handleRetrace = () => {
    setErrorMessage('');

    try {
      const result = retrace(stackTrace, mapping);
      setOutput(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOutput('');
      setErrorMessage(message);
    }
  };

  const handleClear = () => {
    setStackTrace('');
    setMapping('');
    setOutput('');
    setErrorMessage('');
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">@ctalau/offguard playground</p>
          <h1>Retrace a stack trace in the browser</h1>
          <p className="subtitle">
            Paste an obfuscated stack trace and its mapping file, or load one of the test
            fixtures to see the retrace output instantly.
          </p>
        </div>
        <div className="controls">
          <label className="field">
            <span>Fixture</span>
            <select
              value={selectedFixtureId}
              onChange={(event) => setSelectedFixtureId(event.target.value)}
            >
              {fixtures.map((fixture) => (
                <option key={fixture.id} value={fixture.id}>
                  {fixture.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button secondary" onClick={handleLoadFixture}>
            Load fixture
          </button>
        </div>
      </header>

      <main className="grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Input</h2>
            <div className="panel-actions">
              <button type="button" className="button" onClick={handleRetrace}>
                Retrace
              </button>
              <button type="button" className="button ghost" onClick={handleClear}>
                Clear
              </button>
            </div>
          </div>
          <div className="field-group">
            <label className="field">
              <span>Obfuscated stack trace</span>
              <textarea
                value={stackTrace}
                onChange={(event) => setStackTrace(event.target.value)}
                placeholder="Paste an obfuscated stack trace here"
                rows={10}
              />
            </label>
            <label className="field">
              <span>Mapping file</span>
              <textarea
                value={mapping}
                onChange={(event) => setMapping(event.target.value)}
                placeholder="Paste the ProGuard/R8 mapping file here"
                rows={10}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Retraced output</h2>
            <p className="panel-subtitle">
              Output updates only when you click <strong>Retrace</strong> to make it easier to
              compare runs.
            </p>
          </div>
          {errorMessage ? <div className="error">{errorMessage}</div> : null}
          <pre className="output" aria-live="polite">
            {output || 'Run retrace to see the deobfuscated stack trace.'}
          </pre>
        </section>
      </main>
    </div>
  );
};
