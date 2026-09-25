import { useSyncExternalStore } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  AttemptViewState,
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
  const completedAttempts = state.attempts.filter(
    (attempt) => attempt.phase === "completed",
  ).length;
  const totalAttempts = state.attempts.length;
  const runningAttempt = state.attempts.find(
    (attempt) => attempt.phase === "running",
  );
  const globalProgressPercent =
    totalAttempts === 0 ? 0 : (completedAttempts / totalAttempts) * 100;

  const runningOrDone =
    state.runStatus === "running" ||
    state.runStatus === "aborted" ||
    state.runStatus === "completed";
  return (
    <main className="flex min-h-screen items-start justify-center bg-muted/40 p-4 text-foreground md:p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Scraping soak test</CardTitle>
          <CardDescription role="status" aria-live="polite">
            {RUN_STATUS_LABELS[state.runStatus]}
          </CardDescription>
          {state.runError && (
            <p
              role="alert"
              className="whitespace-pre-wrap text-sm text-destructive"
            >
              {state.runError}
            </p>
          )}
        </CardHeader>

        {runningOrDone && (
          <CardContent className="space-y-6">
            <section aria-labelledby="attempt-progress-title">
              <div className="flex items-baseline justify-between gap-4">
                <h2>Soak test progress</h2>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {completedAttempts} / {totalAttempts} attempts done
                </span>
              </div>
              <Progress
                value={globalProgressPercent}
                aria-label={`${completedAttempts} of ${totalAttempts} attempts done`}
              />
            </section>

            {runningAttempt && <RunningAttempt state={runningAttempt} />}
          </CardContent>
        )}
      </Card>
    </main>
  );
}

function RunningAttempt({ state }: { state: AttemptViewState }) {
  const observation = state.observation;

  return (
    <section aria-labelledby="current-attempt-title">
      <h2 id="current-attempt-title mb-0">Running attempt</h2>

      <p className="mt-1text-sm text-muted-foreground">
        {state.attempt.platform} · {state.attempt.scenarioId} · repetition{" "}
        {state.attempt.repetition}
        <br />
        Post url:{" "}
        <a href={state.attempt.url} target="_blank" rel="noreferrer">
          {state.attempt.url}
        </a>
        <br />
        {formatAttemptStatus(state)}{" "}
        {observation && ` · ${formatDuration(observation.elapsedMs)} elapsed`}
      </p>
    </section>
  );
}

function formatAttemptStatus(state: AttemptViewState): string {
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
