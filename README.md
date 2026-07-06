# Empty Orchestra Radio Desktop

En lokal Windows-app som hämtar låtar från en Spotify-playlist och genererar färdig Empty Orchestra Radio-grafik som PNG. Ingen Discord-bot eller server behöver vara igång.

## Snabbstart

1. Ladda ner `Empty-Orchestra-Radio-1.0.0-portable-x64.exe` från GitHub Releases.
2. Starta filen. Windows kan visa SmartScreen eftersom appen inte är kodsignerad; välj **Mer information** och sedan **Kör ändå** om du laddat ner den från detta repo.
3. Öppna inställningarna med kugghjulet.
4. Fyll i Spotify Client ID, Client Secret och playlist-länk.
5. Skriv veckans nummer och klicka **Generera PNG**.

Den färdiga bilden sparas som standard i `Bilder\Empty Orchestra Radio`. Appen kommer med Empty Orchestras bakgrundsbild, men en annan PNG kan väljas i inställningarna.

## Skapa Spotify-nycklar

1. Öppna [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Skapa en app och välj **Web API**.
3. Kopiera appens **Client ID** och **Client Secret** till desktop-appen.
4. Se till att spellistan är publik.

Client Credentials-flödet behöver ingen Redirect URI och kräver inte att användaren loggar in i appen. Spotify-hemligheten sparas lokalt med Windows krypterade lagring via Electron `safeStorage`. Nycklarna skickas endast till Spotifys API.

## Felmeddelanden

Appen visar konkreta fel för bland annat:

- saknat Client ID eller Client Secret
- ogiltig playlist-länk
- privat eller otillgänglig playlist
- saknad bakgrund eller output-mapp
- nätverks- och Spotify-fel

## Utveckling

Kräver Node.js 20 eller senare.

```powershell
npm.cmd install
npm.cmd run dev
```

Tester och TypeScript-build:

```powershell
npm.cmd test
npm.cmd run build
```

Bygg den portabla `.exe`-filen:

```powershell
npm.cmd run dist:win
```

Filerna hamnar i `release/`.

## Konfiguration

Inställningar sparas i Electrons vanliga appdatamapp för användaren. API-nycklar och personliga inställningar ligger inte i repot och någon `.env`-fil behövs inte.
