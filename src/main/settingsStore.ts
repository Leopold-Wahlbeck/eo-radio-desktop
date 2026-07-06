import fs from "node:fs/promises";
import path from "node:path";
import { app, safeStorage } from "electron";
import { AppSettings } from "../shared/models.js";

interface StoredSettings extends Omit<AppSettings, "spotifyClientSecret"> {
  encryptedSpotifyClientSecret: string;
}

export async function loadSettings(): Promise<AppSettings> {
  const defaults = getDefaultSettings();

  try {
    const raw = await fs.readFile(getSettingsPath(), "utf8");
    const stored = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      ...defaults,
      ...stored,
      spotifyClientSecret: decryptSecret(stored.encryptedSpotifyClientSecret ?? "")
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Could not load settings", error);
    return defaults;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const stored: StoredSettings = {
    spotifyClientId: settings.spotifyClientId.trim(),
    spotifyPlaylistId: settings.spotifyPlaylistId.trim(),
    spotifyMarket: settings.spotifyMarket.trim().toUpperCase() || "SE",
    templatePath: settings.templatePath,
    outputDirectory: settings.outputDirectory,
    encryptedSpotifyClientSecret: encryptSecret(settings.spotifyClientSecret)
  };

  await fs.mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await fs.writeFile(getSettingsPath(), JSON.stringify(stored, null, 2), "utf8");
}

function getDefaultSettings(): AppSettings {
  const assetsRoot = app.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.resolve(process.cwd(), "assets");

  return {
    spotifyClientId: "",
    spotifyClientSecret: "",
    spotifyPlaylistId: "",
    spotifyMarket: "SE",
    templatePath: path.join(assetsRoot, "templates", "empty-orchestra-base.png"),
    outputDirectory: path.join(app.getPath("pictures"), "Empty Orchestra Radio")
  };
}

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

function encryptSecret(secret: string): string {
  if (!secret) return "";
  return safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(secret).toString("base64")
    : Buffer.from(secret, "utf8").toString("base64");
}

function decryptSecret(secret: string): string {
  if (!secret) return "";
  try {
    const data = Buffer.from(secret, "base64");
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(data) : data.toString("utf8");
  } catch {
    return "";
  }
}
