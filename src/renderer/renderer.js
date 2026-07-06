const elements = {
  form: document.querySelector("#generate-form"),
  issue: document.querySelector("#issue"),
  generateButton: document.querySelector("#generate-button"),
  settingsToggle: document.querySelector("#settings-toggle"),
  settings: document.querySelector("#settings"),
  clientId: document.querySelector("#client-id"),
  clientSecret: document.querySelector("#client-secret"),
  playlistId: document.querySelector("#playlist-id"),
  market: document.querySelector("#market"),
  templatePath: document.querySelector("#template-path"),
  outputDirectory: document.querySelector("#output-directory"),
  chooseTemplate: document.querySelector("#choose-template"),
  chooseOutput: document.querySelector("#choose-output"),
  saveSettings: document.querySelector("#save-settings"),
  saveConfirmation: document.querySelector("#save-confirmation"),
  status: document.querySelector("#status"),
  statusTitle: document.querySelector("#status-title"),
  statusMessage: document.querySelector("#status-message"),
  showFile: document.querySelector("#show-file")
};

let lastOutputPath = "";

init();

async function init() {
  const settings = await window.eoRadio.getSettings();
  fillSettings(settings);
  bindEvents();
  elements.issue.focus();
}

function bindEvents() {
  elements.settingsToggle.addEventListener("click", () => {
    elements.settings.hidden = !elements.settings.hidden;
    if (!elements.settings.hidden) elements.clientId.focus();
  });

  elements.chooseTemplate.addEventListener("click", async () => {
    const selected = await window.eoRadio.chooseTemplate();
    if (selected) elements.templatePath.value = selected;
  });

  elements.chooseOutput.addEventListener("click", async () => {
    const selected = await window.eoRadio.chooseOutputDirectory();
    if (selected) elements.outputDirectory.value = selected;
  });

  elements.saveSettings.addEventListener("click", async () => {
    await window.eoRadio.saveSettings(readSettings());
    elements.saveConfirmation.textContent = "Sparat lokalt";
    setTimeout(() => { elements.saveConfirmation.textContent = ""; }, 2200);
  });

  elements.form.addEventListener("submit", generate);
  elements.showFile.addEventListener("click", () => window.eoRadio.showOutputFile(lastOutputPath));
}

async function generate(event) {
  event.preventDefault();
  setLoading(true);
  showStatus("working", "Hämtar spellistan", "Spotify och bildmotorn arbetar...", false);

  try {
    const result = await window.eoRadio.generate({ ...readSettings(), issue: elements.issue.value });
    lastOutputPath = result.outputPath;
    showStatus("success", "Grafiken är klar", `${result.trackCount} låtar sparades som PNG.`, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Något oväntat gick fel.";
    showStatus("error", "Kunde inte generera", message, false);
    if (message.includes("saknas")) elements.settings.hidden = false;
  } finally {
    setLoading(false);
  }
}

function readSettings() {
  return {
    spotifyClientId: elements.clientId.value,
    spotifyClientSecret: elements.clientSecret.value,
    spotifyPlaylistId: elements.playlistId.value,
    spotifyMarket: elements.market.value || "SE",
    templatePath: elements.templatePath.value,
    outputDirectory: elements.outputDirectory.value
  };
}

function fillSettings(settings) {
  elements.clientId.value = settings.spotifyClientId;
  elements.clientSecret.value = settings.spotifyClientSecret;
  elements.playlistId.value = settings.spotifyPlaylistId;
  elements.market.value = settings.spotifyMarket;
  elements.templatePath.value = settings.templatePath;
  elements.outputDirectory.value = settings.outputDirectory;
}

function setLoading(loading) {
  elements.generateButton.disabled = loading;
  elements.generateButton.classList.toggle("loading", loading);
}

function showStatus(kind, title, message, showFile) {
  elements.status.hidden = false;
  elements.status.className = `status ${kind}`;
  elements.statusTitle.textContent = title;
  elements.statusMessage.textContent = message;
  elements.showFile.hidden = !showFile;
}
