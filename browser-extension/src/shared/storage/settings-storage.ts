import { z } from "zod";

export const SETTINGS_STORAGE_KEY = "settings:v1";

export const SettingsSchema = z.object({
  skipScreenshoting: z.boolean(),
  skipSubmitForClassification: z.boolean(),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  skipScreenshoting: false,
  skipSubmitForClassification: false,
};

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
  const value = stored[SETTINGS_STORAGE_KEY];
  const result = SettingsSchema.safeParse(value);
  const settings = result.success ? result.data : DEFAULT_SETTINGS;

  if (!result.success) {
    await setSettings(settings);
  }

  return settings;
}

export async function setSettings(settings: Settings): Promise<void> {
  const serializedSettings = SettingsSchema.parse(settings);
  await browser.storage.local.set({
    [SETTINGS_STORAGE_KEY]: serializedSettings,
  });
}
