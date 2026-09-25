import { useSyncExternalStore } from "react";
import type {
  CurrentAttemptViewState,
  SoakControllerRunStatus,
  SoakControllerStore,
} from "@/shared/soak-test/SoakControllerStore";

const RUN_STATUS_LABELS: Record<SoakControllerRunStatus, string> = {
  starting: "Starting...",
  "waiting-for-server": "Waiting for pnpm test:soak:server...",
  running: "Running an attempt",
  completed: "Complete. You can close this browser.",
  aborted: "Run aborted",
};

export function App({ store }: { store: SoakControllerStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 p-8 text-foreground">
      <h1 className="text-2xl font-semibold">Scraping soak test</h1>
      <p role="status" aria-live="polite" className="text-muted-foreground">
        {RUN_STATUS_LABELS[state.runStatus]}
      </p>

      {state.totalAttempts > 0 && (
        <section aria-labelledby="attempt-progress-title" className="space-y-2">
          <h2 id="attempt-progress-title" className="font-medium">
            Progress
          </h2>
          <p className="text-sm tabular-nums">
            {state.completedAttempts} / {state.totalAttempts} attempts completed
          </p>
          <progress
            className="w-full"
            value={state.completedAttempts}
            max={state.totalAttempts}
            aria-label={`${state.completedAttempts} of ${state.totalAttempts} attempts completed`}
          />
        </section>
      )}

      {state.currentAttempt && <RunningAttempt state={state.currentAttempt} />}

      {state.runError && (
        <pre
          role="alert"
          className="whitespace-pre-wrap text-sm text-destructive"
        >
          {state.runError}
        </pre>
      )}
    </main>
  );
}

function RunningAttempt({ state }: { state: CurrentAttemptViewState }) {
  const observation = state.observation;
  return (
    <section aria-labelledby="current-attempt-title" className="space-y-1">
      <h2 id="current-attempt-title" className="font-medium">
        Current attempt
      </h2>
      <p className="text-sm text-muted-foreground">
        {state.attempt.platform} · {state.attempt.scenarioId} · repetition{" "}
        {state.attempt.repetition}
      </p>
      <a
        href={state.attempt.url}
        target="_blank"
        rel="noreferrer"
        className="block break-all text-sm underline"
      >
        {state.attempt.url}
      </a>
      <p className="text-sm">
        {formatAttemptStatus(state)}
        {observation && ` · ${formatDuration(observation.elapsedMs)} elapsed`}
      </p>
    </section>
  );
}

function formatAttemptStatus(state: CurrentAttemptViewState): string {
  const status = state.observation?.status;
  if (!status || status.type === "not-started") return "Preparing page";
  if (status.type === "running") {
    return `Scraping ${Math.round(status.progress)}%`;
  }
  if (status.type === "succeeded") return "Finalizing result";
  if (status.type === "failed") return "Scraper failed";
  if (status.type === "canceling") return "Canceling";
  return "Canceled";
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)} s`;
}
