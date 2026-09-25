import type {
  SoakControllerAttempt,
  SoakControllerObservation,
} from "./SoakTestProtocol";

export type SoakControllerRunStatus =
  "starting" | "waiting-for-server" | "running" | "completed" | "aborted";

export type CurrentAttemptViewState = {
  attempt: SoakControllerAttempt;
  observation?: SoakControllerObservation;
};

export type SoakControllerViewState = {
  runStatus: SoakControllerRunStatus;
  totalAttempts: number;
  completedAttempts: number;
  currentAttempt?: CurrentAttemptViewState;
  runError?: string;
};

type Listener = () => void;

export class SoakControllerStore {
  private state: SoakControllerViewState = {
    runStatus: "starting",
    totalAttempts: 0,
    completedAttempts: 0,
  };
  private readonly listeners = new Set<Listener>();

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): SoakControllerViewState => this.state;

  configure(totalAttempts: number): void {
    this.update({
      runStatus: "starting",
      totalAttempts,
      completedAttempts: 0,
      currentAttempt: undefined,
      runError: undefined,
    });
  }

  waitForServer(): void {
    this.update({ runStatus: "waiting-for-server" });
  }

  startAttempt(attempt: SoakControllerAttempt): void {
    this.update({ runStatus: "running", currentAttempt: { attempt } });
  }

  updateObservation(observation: SoakControllerObservation): void {
    if (!this.state.currentAttempt) {
      throw new Error("Cannot update an attempt before it starts.");
    }
    this.update({
      currentAttempt: { ...this.state.currentAttempt, observation },
    });
  }

  completeAttempt(): void {
    if (!this.state.currentAttempt) {
      throw new Error("Cannot complete an attempt before it starts.");
    }
    this.update({
      completedAttempts: this.state.completedAttempts + 1,
      currentAttempt: undefined,
    });
  }

  completeRun(): void {
    this.update({ runStatus: "completed", currentAttempt: undefined });
  }

  markAborted(runError: string): void {
    this.update({
      runStatus: "aborted",
      runError,
      currentAttempt: undefined,
    });
  }

  private update(partial: Partial<SoakControllerViewState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) listener();
  }
}

export const soakControllerStore = new SoakControllerStore();
