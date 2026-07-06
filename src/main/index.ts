import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { readableError, UserFacingError } from "../shared/errors.js";
import { generateRadioGraphic } from "../shared/generateRadioGraphic.js";
import { AppSettings, GenerateRequest } from "../shared/models.js";
import { getPlaylistTracks } from "../shared/spotify.js";
import { loadSettings, saveSettings } from "./settingsStore.js";

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 920,
    height: 760,
    minWidth: 760,
    minHeight: 650,
    backgroundColor: "#f4f4ef",
    show: false,
    title: "Empty Orchestra Radio",
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(import.meta.dirname, "../renderer/index.html"));
  mainWindow.once("ready-to-show", () => mainWindow?.show());

}

function registerIpcHandlers() {
  ipcMain.handle("settings:get", () => loadSettings());
  ipcMain.handle("settings:save", (_event, settings: AppSettings) => saveSettings(settings));

  ipcMain.handle("dialog:template", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Välj bakgrundsbild",
      properties: ["openFile"],
      filters: [{ name: "PNG-bilder", extensions: ["png"] }]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("dialog:output", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Välj output-mapp",
      properties: ["openDirectory", "createDirectory"]
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("radio:generate", async (_event, request: GenerateRequest) => {
    try {
      validateRequest(request);
      await saveSettings(request);
      const tracks = await getPlaylistTracks(request);
      const outputPath = await generateRadioGraphic({
        tracks,
        issue: request.issue.trim(),
        templatePath: request.templatePath,
        outputDir: request.outputDirectory
      });
      return { ok: true, value: { outputPath, trackCount: tracks.length } };
    } catch (error) {
      console.error(error);
      return { ok: false, error: readableError(error) };
    }
  });

  ipcMain.handle("output:show", (_event, outputPath: string) => shell.showItemInFolder(outputPath));
}

function validateRequest(request: GenerateRequest) {
  if (!request.issue.trim()) throw new UserFacingError("Vecka/issue saknas. Skriv exempelvis 163.");
  if (!request.templatePath.trim()) throw new UserFacingError("Ingen bakgrundsbild är vald.");
  if (!request.outputDirectory.trim()) throw new UserFacingError("Ingen output-mapp är vald.");
}
