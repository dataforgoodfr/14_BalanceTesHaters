/** A promisifyied version of setTimeout */
export async function sleep(delay: number) {
  await new Promise((resolve) => setTimeout(() => resolve(undefined), delay));
}
