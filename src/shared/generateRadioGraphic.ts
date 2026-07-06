import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { RadioTrack } from "./models.js";
import { formatTimestamp } from "./date.js";
import { computeLayout, TYPOGRAPHY } from "./layout.js";
import { escapeXml } from "./textUtils.js";

interface GenerateRadioGraphicInput {
  tracks: RadioTrack[];
  issue: string;
  templatePath: string;
  outputDir: string;
}

export async function generateRadioGraphic(input: GenerateRadioGraphicInput): Promise<string> {
  await fs.mkdir(input.outputDir, { recursive: true });

  const template = sharp(input.templatePath);
  const metadata = await template.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read template dimensions.");
  }

  const dimensions = { width: metadata.width, height: metadata.height };
  const blocks = computeLayout(input.tracks, dimensions);
  const fontFaceCss = await getEmbeddedFontFaceCss(input.templatePath);
  const svg = buildOverlaySvg(blocks, dimensions, input.issue, fontFaceCss);
  const outputPath = path.join(input.outputDir, `eoradio-${formatTimestamp()}.png`);

  await sharp(input.templatePath)
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0
      }
    ])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  return outputPath;
}

function buildOverlaySvg(
  blocks: ReturnType<typeof computeLayout>,
  dimensions: { width: number; height: number },
  issue: string,
  fontFaceCss: string
): string {
  const textNodes = blocks.map((block) => {
    const lineHeight = block.style.fontSize * block.style.lineHeight;
    const tspans = block.lines.map((line, lineIndex) => {
      const dy = lineIndex === 0 ? 0 : lineHeight;
      return `<tspan x="${round(block.x)}" dy="${round(dy)}">${escapeXml(line)}</tspan>`;
    }).join("");

    return [
      `<text x="${round(block.x)}" y="${round(block.y + block.style.fontSize)}"`,
      `font-family="${escapeXml(block.style.fontFamily)}"`,
      `font-size="${round(block.style.fontSize)}"`,
      `font-weight="${block.style.fontWeight}"`,
      `letter-spacing="${block.style.letterSpacing}"`,
      `fill="${TYPOGRAPHY.color}">${tspans}</text>`
    ].join(" ");
  }).join("\n");

  return [
    `<svg width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}" xmlns="http://www.w3.org/2000/svg">`,
    fontFaceCss ? `<defs><style>${fontFaceCss}</style></defs>` : "",
    buildIssueText(issue, dimensions),
    textNodes,
    "</svg>"
  ].join("\n");
}

function buildIssueText(issue: string, dimensions: { width: number; height: number }): string {
  const scale = dimensions.width / 2160;
  const x = dimensions.width * 0.972;
  const y = dimensions.height * 0.245;
  const fontSize = 40 * (dimensions.width / 2160);
  const lineHeight = fontSize * 1.08;
  const fontFamily = "HelveticaNeueEO, Helvetica Neue, HelveticaNeue, Helvetica, Arial, sans-serif";
  const color = "#E8E9E2";
  const safeIssue = issue.replace(/^issue\s+/i, "").trim();

  return [
    `<text x="${round(x)}" y="${round(y)}"`,
    `text-anchor="end"`,
    `font-family="${escapeXml(fontFamily)}"`,
    `font-size="${round(fontSize)}"`,
    `font-weight="700"`,
    `fill="${color}">`,
    `<tspan x="${round(x)}" dy="0">${escapeXml("EMPTY ORCHESTRA")}</tspan>`,
    `<tspan x="${round(x)}" dy="${round(lineHeight)}">${escapeXml(`RADIO ISSUE ${safeIssue}`)}</tspan>`,
    `</text>`
  ].join(" ");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

async function getEmbeddedFontFaceCss(templatePath: string): Promise<string> {
  const fontPath = await findHelveticaNeueBoldFont(templatePath);

  if (!fontPath) {
    return "";
  }

  const font = await fs.readFile(fontPath);
  const ext = path.extname(fontPath).toLowerCase();
  const mime = ext === ".ttf" ? "font/ttf" : "font/otf";

  return [
    "@font-face {",
    "font-family: 'HelveticaNeueEO';",
    `src: url('data:${mime};base64,${font.toString("base64")}') format('${ext === ".ttf" ? "truetype" : "opentype"}');`,
    "font-weight: 700;",
    "font-style: normal;",
    "}"
  ].join("");
}

async function findHelveticaNeueBoldFont(templatePath: string): Promise<string | null> {
  const fontDir = path.join(path.dirname(templatePath), "..", "fonts");
  const candidates = [
    "HelveticaNeue-Bold.otf",
    "HelveticaNeue-Bold.ttf",
    "Helvetica Neue Bold.otf",
    "Helvetica Neue Bold.ttf",
    "HelveticaNeueLTStd-Bd.otf",
    "HelveticaNeueLTStd-Bd.ttf"
  ];

  for (const candidate of candidates) {
    const candidatePath = path.join(fontDir, candidate);

    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch {
      // Try the next common filename.
    }
  }

  return null;
}
