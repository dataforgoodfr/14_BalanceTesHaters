type AttemptPhase = "waiting" | "running" | "completed";

export class SoakControllerStateGuard {
  private controllerConnected = false;
  private readonly attemptPhases: Map<string, AttemptPhase>;

  constructor(attemptIds: string[]) {
    this.attemptPhases = new Map(
      attemptIds.map((attemptId) => [attemptId, "waiting"]),
    );
  }

  claimController(): void {
    if (this.controllerConnected) {
      throw new Error(
        "A soak controller is already connected. The extension or controller page may have reloaded; aborting to avoid restarting attempts.",
      );
    }
    this.controllerConnected = true;
  }

  startAttempt(attemptId: string): void {
    this.transitionAttempt(attemptId, "waiting", "running");
  }

  completeAttempt(attemptId: string): void {
    this.transitionAttempt(attemptId, "running", "completed");
  }

  private transitionAttempt(
    attemptId: string,
    expectedPhase: AttemptPhase,
    nextPhase: AttemptPhase,
  ): void {
    const phase = this.attemptPhases.get(attemptId);
    if (phase === undefined) {
      throw new Error(`Unknown soak-test attempt: ${attemptId}.`);
    }
    if (phase !== expectedPhase) {
      throw new Error(
        `Cannot move soak-test attempt ${attemptId} from ${phase} to ${nextPhase}.`,
      );
    }
    this.attemptPhases.set(attemptId, nextPhase);
  }
}
