/**
 * Track progress.
 * Progress is always from 0 to 100
 */
export class ProgressManager {
  private progress: number = 0;
  constructor(
    private readonly progressUpdateCallback: (progress: number) => void,
  ) {}

  /**
   * Set progress for this Progress Manager.
   * If progress is < 0: 0 is used instead
   * IF progress is > 100: 100 is used instead
   * @param progress
   */
  setProgress(progress: number) {
    this.progress = constrainToRange(progress);
    this.progressUpdateCallback(this.progress);
  }

  getProgress(): number {
    return this.progress;
  }

  /**
   * Creates a Progress Manager for a sub task.
   * This is useful to decompose progress in sub tasks/functions
   * While keeping at each decomposition level the knowledge of what % of completion each subtask represents
   * Behavior:
   * * When sub task progress is 0% parent progress manager is set to subTaskRange.from
   * * When sub task progress is 100% parent progress is set to subTaskRange.to
   * * When sub task progress is somewhere in between parent progrss is set proportionally
   * @param inParentProgressRange the progress range that should be covered in parent progress by subtask
   * @returns
   */
  subTaskProgressManager(
    inParentProgressRange: ProgressRange,
  ): ProgressManager {
    if (!isValidProgressRange(inParentProgressRange)) {
      throw new Error("Invalid range " + JSON.stringify(inParentProgressRange));
    }

    const subProgressCallback = (subProgress: number) => {
      this.setProgress(
        convertToParentProgress(subProgress, inParentProgressRange),
      );
    };
    return new ProgressManager(subProgressCallback);
  }
}

function convertToParentProgress(
  subTaskProgress: number,
  inParentProgressRange: ProgressRange,
): number {
  const progressLength = inParentProgressRange.to - inParentProgressRange.from;
  const parentProgress =
    inParentProgressRange.from + (subTaskProgress / 100) * progressLength;
  return parentProgress;
}

function isValidProgressRange(progressRange: ProgressRange): boolean {
  return (
    isValidProgress(progressRange.from) &&
    isValidProgress(progressRange.to) &&
    progressRange.from < progressRange.to
  );
}

function constrainToRange(progress: number): number {
  return Math.max(Math.min(progress, 100), 0);
}
function isValidProgress(progress: number): boolean {
  return !isNaN(progress) && progress >= 0 && progress <= 100;
}

export type ProgressRange = Readonly<{
  from: number;
  to: number;
}>;
