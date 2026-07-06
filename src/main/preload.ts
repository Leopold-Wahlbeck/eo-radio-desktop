import { contextBridge, ipcRenderer } from "electron";
import { AppSettings, DesktopApi, GenerateRequest } from "../shared/models.js";

const api: DesktopApi = {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke("settings:save", settings),
  chooseTemplate: () => ipcRenderer.invoke("dialog:template"),
  chooseOutputDirectory: () => ipcRenderer.invoke("dialog:output"),
  async generate(request: GenerateRequest) {
    const result = await ipcRenderer.invoke("radio:generate", request);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  },
  showOutputFile: (outputPath: string) => ipcRenderer.invoke("output:show", outputPath)
};

contextBridge.exposeInMainWorld("eoRadio", api);
