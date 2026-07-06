import { DesktopApi } from "../shared/models.js";

declare global {
  interface Window {
    eoRadio: DesktopApi;
  }
}

export {};
