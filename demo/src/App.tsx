import { useMemo, useState, useRef } from 'react';
import { retrace } from '@ctalau/offguard';
import JSZip from 'jszip';
import { fixtures } from './fixtures';
import './styles.css';

const defaultFixture = fixtures[0];

export const App = () => {
  const [selectedFixtureId, setSelectedFixtureId] = useState(defaultFixture.id);
  const [stackTrace, setStackTrace] = useState(defaultFixture.stack);
  const [mapping, setMapping] = useState(defaultFixture.mapping);
  const [output, setOutput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const mappingTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) {
      return;
    }

    const file = files[0];

    try {
      // Handle zip files
      if (file.name.endsWith('.zip')) {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Find the first .txt or .map file in the zip
        const mappingFile = Object.keys(zip.files).find(
          (filename) => filename.endsWith('.txt') || filename.endsWith('.map')
        );

        if (mappingFile) {
          const content = await zip.files[mappingFile].async('text');
          setMapping(content);
        } else {
          setErrorMessage('No .txt or .map file found in the zip archive');
        }
      } else {
        // Handle plain text files
        const text = await file.text();
        setMapping(text);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Error reading file: ${message}`);
    }
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
              <span>Mapping file (paste, or drag & drop a .txt or .zip file)</span>
              <textarea
                ref={mappingTextareaRef}
                value={mapping}
                onChange={(event) => setMapping(event.target.value)}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={isDragging ? 'drag-over' : ''}
                placeholder="Paste the ProGuard/R8 mapping file here, or drag & drop a file"
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
