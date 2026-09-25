import type {
  SoakControllerAttempt,
  SoakControllerObservation,
  SoakControllerResult,
} from "./SoakTestProtocol";

export type AttemptPhase =
  "waiting" | "running" | "completed" | "aborted" | "not-run";

export type SoakControllerRunStatus =
  "starting" | "waiting-for-server" | "running" | "completed" | "aborted";

export type AttemptViewState = {
  attempt: SoakControllerAttempt;
  phase: AttemptPhase;
  expectedComments?: number;
  observation?: SoakControllerObservation;
  result?: SoakControllerResult;
  error?: string;
};

export type SoakControllerViewState = {
  attempts: AttemptViewState[];
  runStatus: SoakControllerRunStatus;
  runError?: string;
};

type Listener = () => void;

export class SoakControllerStore {
  private state: SoakControllerViewState = {
    attempts: [],
    runStatus: "starting",
  };
  private readonly listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): SoakControllerViewState => this.state;

  configure(attempts: SoakControllerAttempt[]): void {
    this.update({
      attempts: attempts.map((attempt) => ({ attempt, phase: "waiting" })),
      runError: undefined,
    });
  }

  setRunStatus(runStatus: SoakControllerRunStatus): void {
    this.update({ runStatus });
  }

  markRunning(attemptId: string): void {
    this.updateAttempt(attemptId, (attempt) => ({
      ...attempt,
      phase: "running",
      error: undefined,
    }));
  }

  setExpectedComments(
    attemptId: string,
    expectedComments: number | undefined,
  ): void {
    this.updateAttempt(attemptId, (attempt) => ({
      ...attempt,
      expectedComments,
    }));
  }

  updateObservation(
    attemptId: string,
    observation: SoakControllerObservation,
  ): void {
    this.updateAttempt(attemptId, (attempt) => ({
      ...attempt,
      observation,
    }));
  }

  markCompleted(result: SoakControllerResult): void {
    this.updateAttempt(result.attempt.attemptId, (attempt) => ({
      ...attempt,
      phase: "completed",
      expectedComments: result.expectedComments ?? attempt.expectedComments,
      result,
    }));
  }

  markAborted(message: string): void {
    this.state = {
      ...this.state,
      runStatus: "aborted",
      runError: message,
      attempts: this.state.attempts.map((attempt) => {
        if (attempt.phase === "running") {
          return { ...attempt, phase: "aborted", error: message };
        }
        return attempt.phase === "completed"
          ? attempt
          : { ...attempt, phase: "not-run" };
      }),
    };
    this.emit();
  }

  private update(partial: Partial<SoakControllerViewState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private updateAttempt(
    attemptId: string,
    update: (attempt: AttemptViewState) => AttemptViewState,
  ): void {
    let found = false;
    const attempts = this.state.attempts.map((attempt) => {
      if (attempt.attempt.attemptId !== attemptId) return attempt;
      found = true;
      return update(attempt);
    });
    if (!found) throw new Error(`Missing attempt row for ${attemptId}.`);
    this.update({ attempts });
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const soakControllerStore = new SoakControllerStore();
