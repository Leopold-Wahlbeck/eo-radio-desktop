export interface RadioTrack {
  index: number;
  artist: string;
  title: string;
}

export interface AppSettings {
  spotifyClientId: string;
  spotifyClientSecret: string;
  spotifyPlaylistId: string;
  spotifyMarket: string;
  templatePath: string;
  outputDirectory: string;
}

export interface GenerateRequest extends AppSettings {
  issue: string;
}

export interface GenerateResult {
  outputPath: string;
  trackCount: number;
}

export interface DesktopApi {
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  chooseTemplate(): Promise<string | null>;
  chooseOutputDirectory(): Promise<string | null>;
  generate(request: GenerateRequest): Promise<GenerateResult>;
  showOutputFile(path: string): Promise<void>;
}
