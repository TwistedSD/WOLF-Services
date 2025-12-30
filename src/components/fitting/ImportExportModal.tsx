import React, { useState } from 'react';
import { Fitting } from './FittingTab';
import { Ship, Module } from '../../hooks/useFittingData';
import { exportFitting, importFitting } from '../../utils/fittingImportExport';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export';
  fitting: Fitting;
  ships: Ship[];
  modules: Module[];
  onImport: (fitting: Fitting) => void;
}

export function ImportExportModal({
  isOpen,
  onClose,
  mode,
  fitting,
  ships,
  modules,
  onImport
}: ImportExportModalProps) {
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const text = exportFitting(fitting);
      setExportText(text);
      setErrors([]);
      setSuccess(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Export failed']);
      setSuccess(false);
    }
  };

  const handleImport = () => {
    setErrors([]);
    setSuccess(false);

    const result = importFitting(importText, ships, modules);

    if (result.fitting) {
      onImport(result.fitting);
      setSuccess(true);

      if (result.errors.length > 0) {
        setErrors(result.errors);
      } else {
        // Close modal on successful import with no errors
        setTimeout(() => {
          onClose();
          setImportText('');
        }, 1500);
      }
    } else {
      setErrors(result.errors);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportText);
    alert('Copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="border-2 w-full max-w-2xl max-h-[80vh] flex flex-col"
        style={{
          borderColor: "var(--primary)",
          backgroundColor: "var(--background)"
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b-2 flex justify-between items-center"
          style={{
            borderColor: "var(--primary)",
            backgroundColor: "var(--background-light)"
          }}
        >
          <h2 className="text-lg font-bold text-primary">
            {mode === 'import' ? 'Import Fitting' : 'Export Fitting'}
          </h2>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'export' ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground-muted mb-2">
                  Click "Generate Export" to create a text format compatible with EVE Frontier
                </p>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 border-2 border-primary bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  Generate Export
                </button>
              </div>

              {exportText && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-foreground">
                      Export Text:
                    </label>
                    <button
                      onClick={handleCopyToClipboard}
                      className="px-3 py-1 text-xs border border-secondary hover:border-primary hover:bg-primary/10 text-foreground transition-colors"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                  <textarea
                    value={exportText}
                    readOnly
                    className="w-full h-96 p-3 border-2 font-mono text-sm"
                    style={{
                      borderColor: "var(--secondary)",
                      backgroundColor: "var(--background-light)",
                      color: "var(--foreground)"
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Paste fitting text from EVE Frontier:
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`[TADES, *Combat]\nCoated Armor Plates II\n...\n\nAdaptive Nanitic Armor Weave IV\n...\n\nTier 3 Coilgun (S)\n...\n\nVelocity CD82\n\n\nCoilgun Ammo 1 (S) x120`}
                  className="w-full h-96 p-3 border-2 font-mono text-sm"
                  style={{
                    borderColor: "var(--secondary)",
                    backgroundColor: "var(--background-light)",
                    color: "var(--foreground)"
                  }}
                />
              </div>

              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="px-4 py-2 border-2 border-primary bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Fitting
              </button>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mt-4 p-3 border-2 border-green-500 bg-green-500/10 text-green-400">
              {mode === 'export' ? 'Export generated successfully!' : 'Fitting imported successfully!'}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-4 p-3 border-2 border-red-500 bg-red-500/10">
              <div className="text-red-400 font-semibold mb-2">
                {mode === 'import' ? 'Import Warnings/Errors:' : 'Export Error:'}
              </div>
              <ul className="text-sm text-red-300 list-disc list-inside space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t-2 flex justify-end"
          style={{ borderColor: "var(--primary)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 border border-secondary hover:border-primary text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
