import { useShortsStore } from './shortsStore';
import SetupStep from './steps/SetupStep';
import ContentStep from './steps/ContentStep';
import AssetsStep from './steps/AssetsStep';
import ExportStep from './steps/ExportStep';

interface ShortsWorkflowProps {
  shortId: string;
}

const STEPS = [
  { id: 'setup', label: 'Setup' },
  { id: 'content', label: 'Content' },
  { id: 'assets', label: 'Assets' },
  { id: 'export', label: 'Export' },
];

export default function ShortsWorkflow({ shortId }: ShortsWorkflowProps) {
  const { currentStep, setCurrentStep, state } = useShortsStore();

  const canNavigateTo = (stepId: string): boolean => {
    if (!state) return stepId === 'setup';
    const stepOrder = STEPS.findIndex((s) => s.id === stepId);
    const currentOrder = STEPS.findIndex((s) => s.id === state.current_step);
    return stepOrder <= currentOrder;
  };

  return (
    <div>
      {/* Step navigation bar */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 16,
        padding: '8px 0',
        borderBottom: '1px solid var(--border-color)',
      }}>
        {STEPS.map((step, i) => {
          const isActive = currentStep === step.id;
          const canNav = canNavigateTo(step.id);
          return (
            <span key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => canNav && setCurrentStep(step.id)}
                disabled={!canNav}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  cursor: canNav ? 'pointer' : 'default',
                  padding: '2px 8px',
                  color: isActive
                    ? 'var(--accent)'
                    : canNav
                      ? 'var(--text-secondary)'
                      : 'var(--text-dim)',
                  borderBottom: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                }}
              >
                {step.label}
              </button>
              {i < STEPS.length - 1 && (
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{'>'}</span>
              )}
            </span>
          );
        })}
      </div>

      {/* Step content */}
      {currentStep === 'setup' && <SetupStep shortId={shortId} />}
      {currentStep === 'content' && <ContentStep shortId={shortId} />}
      {currentStep === 'assets' && <AssetsStep shortId={shortId} />}
      {currentStep === 'export' && <ExportStep shortId={shortId} />}
    </div>
  );
}
