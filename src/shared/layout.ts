import { RadioTrack } from "./models.js";

export interface Dimensions {
  width: number;
  height: number;
}

export interface SafeArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface TrackBlock {
  track: RadioTrack;
  x: number;
  y: number;
  width: number;
  style: TextStyle;
  lines: string[];
  height: number;
}

export const SAFE_AREA: SafeArea = {
  left: 110,
  right: 90,
  top: 120,
  bottom: 190
};

export const TYPOGRAPHY = {
  fontFamily: "HelveticaNeueEO, Helvetica Neue, HelveticaNeue, Helvetica, Arial, sans-serif",
  color: "#111820",
  fontWeight: 700,
  minFontSize: 22,
  baseFontSize: 40,
  compactFontSize: 35,
  denseFontSize: 30,
  lineHeight: 1.08,
  blockGap: 54,
  columnGap: 108
} as const;

const averageGlyphWidth = 0.59;
const measurementSafetyFactor = 1.08;

export function measureText(text: string, style: TextStyle): number {
  let width = 0;

  for (const char of text) {
    if (char === " ") {
      width += style.fontSize * 0.34;
    } else if (/[I1!'.,:;]/u.test(char)) {
      width += style.fontSize * 0.28;
    } else if (/[MW@#%]/u.test(char)) {
      width += style.fontSize * 0.82;
    } else if (/[&/]/u.test(char)) {
      width += style.fontSize * 0.67;
    } else {
      width += style.fontSize * averageGlyphWidth;
    }
  }

  return (width + Math.max(0, text.length - 1) * style.letterSpacing) * measurementSafetyFactor;
}

export function wrapText(text: string, maxWidth: number, style: TextStyle): string[] {
  if (measureText(text, style) <= maxWidth) {
    return [text];
  }

  const tokens = text
    .replaceAll("/", " / ")
    .replaceAll("-", " - ")
    .split(/\s+/)
    .filter(Boolean);

  const lines: string[] = [];
  let current = "";

  for (const token of tokens) {
    const next = current ? `${current} ${token}` : token;

    if (measureText(next, style) <= maxWidth || !current) {
      current = next;
      continue;
    }

    lines.push(cleanWrappedLine(current));
    current = token;
  }

  if (current) {
    lines.push(cleanWrappedLine(current));
  }

  return lines.flatMap((line) => splitVeryLongLine(line, maxWidth, style));
}

export function fitTextBlock(track: RadioTrack, maxWidth: number, initialStyle: TextStyle) {
  let style = { ...initialStyle };

  while (style.fontSize >= TYPOGRAPHY.minFontSize) {
    const lines = [
      `A${track.index}`,
      ...wrapText(track.artist, maxWidth, style),
      ...wrapText(track.title, maxWidth, style)
    ];
    const height = lines.length * style.fontSize * style.lineHeight;
    const widest = Math.max(...lines.map((line) => measureText(line, style)));

    if (widest <= maxWidth) {
      return { lines, height, style };
    }

    style = { ...style, fontSize: style.fontSize - 1 };
  }

  const lines = [`A${track.index}`, track.artist, track.title];
  return {
    lines,
    height: lines.length * style.fontSize * style.lineHeight,
    style
  };
}

export function computeLayout(tracks: RadioTrack[], dimensions: Dimensions, safeArea = SAFE_AREA): TrackBlock[] {
  if (isPortraitFourThree(dimensions)) {
    return computePortraitRadioLayout(tracks, dimensions);
  }

  const scaledSafeArea = scaleSafeArea(safeArea, dimensions);
  const contentWidth = dimensions.width - scaledSafeArea.left - scaledSafeArea.right;
  const contentHeight = dimensions.height - scaledSafeArea.top - scaledSafeArea.bottom;
  const columnCount = getColumnCount(tracks.length);
  const columnGap = getColumnGap(dimensions.width, columnCount);
  const columnWidth = getColumnWidth(contentWidth, dimensions.width, columnCount, columnGap);
  const baseFontSize = getBaseFontSize(tracks.length);

  for (let pass = 0; pass < 5; pass += 1) {
    const fontSize = Math.max(TYPOGRAPHY.minFontSize, baseFontSize - pass * 2);
    const blockGap = Math.max(14, TYPOGRAPHY.blockGap - pass * 8 - Math.max(0, tracks.length - 12));
    const style: TextStyle = {
      fontFamily: TYPOGRAPHY.fontFamily,
      fontSize,
      fontWeight: TYPOGRAPHY.fontWeight,
      lineHeight: Math.max(1.02, TYPOGRAPHY.lineHeight - pass * 0.01),
      letterSpacing: 0
    };

    const columns = distributeTracks(tracks, columnCount);
    const blocks: TrackBlock[] = [];
    let fits = true;

    columns.forEach((columnTracks, columnIndex) => {
      const x = scaledSafeArea.left + columnIndex * (columnWidth + columnGap);
      const fitted = columnTracks.map((track) => fitTextBlock(track, columnWidth, style));
      const totalHeight = fitted.reduce((sum, block) => sum + block.height, 0) + blockGap * Math.max(0, fitted.length - 1);

      if (totalHeight > contentHeight) {
        fits = false;
      }

      const columnBias = columnIndex % 2 === 0 ? 0.1 : 0;
      let y = scaledSafeArea.top + Math.max(0, (contentHeight - totalHeight) * columnBias);

      fitted.forEach((block, itemIndex) => {
        blocks.push({
          track: columnTracks[itemIndex],
          x,
          y,
          width: columnWidth,
          style: block.style,
          lines: block.lines,
          height: block.height
        });

        y += block.height + blockGap;
      });
    });

    if (fits) {
      return blocks;
    }
  }

  return compactFallbackLayout(tracks, dimensions, scaledSafeArea);
}

function isPortraitFourThree(dimensions: Dimensions): boolean {
  return Math.abs(dimensions.width / dimensions.height - 0.75) < 0.03;
}

function computePortraitRadioLayout(tracks: RadioTrack[], dimensions: Dimensions): TrackBlock[] {
  const scale = dimensions.width / 2160;
  const columnCount = getPortraitColumnCount(tracks.length);
  const columns = distributeTracksPortrait(tracks, columnCount);
  const baseFontSize = getBaseFontSize(tracks.length) * scale;
  const minFontSize = TYPOGRAPHY.minFontSize * scale;
  const targetBottom = dimensions.height * getPortraitTextBottomRatio(tracks.length);

  const columnFrames = getPortraitColumnFrames(dimensions, columnCount);

  for (let pass = 0; pass < 7; pass += 1) {
    const fontSize = Math.max(minFontSize, baseFontSize - pass * 2 * scale);
    const style: TextStyle = {
      fontFamily: TYPOGRAPHY.fontFamily,
      fontSize,
      fontWeight: TYPOGRAPHY.fontWeight,
      lineHeight: Math.max(1.02, TYPOGRAPHY.lineHeight - pass * 0.01),
      letterSpacing: 0
    };

    const blocks: TrackBlock[] = [];
    let fits = true;

    columns.forEach((columnTracks, columnIndex) => {
      const frame = columnFrames[columnIndex];
      const fitted = columnTracks.map((track) => fitTextBlock(track, frame.width, style));
      const heights = fitted.map((block) => block.height);
      const totalHeight = heights.reduce((sum, height) => sum + height, 0);
      const available = targetBottom - frame.y;
      const naturalGap = getPortraitNaturalGap(tracks.length, scale, pass, columnIndex);
      const gap = columnTracks.length > 1
        ? Math.min(naturalGap, Math.max(14 * scale, (available - totalHeight) / (columnTracks.length - 1)))
        : 0;

      if (totalHeight + gap * Math.max(0, columnTracks.length - 1) > available + 1) {
        fits = false;
      }

      let y = frame.y;

      fitted.forEach((block, itemIndex) => {
        blocks.push({
          track: columnTracks[itemIndex],
          x: frame.x,
          y,
          width: frame.width,
          style: block.style,
          lines: block.lines,
          height: block.height
        });

        y += block.height + gap;
      });
    });

    if (fits) {
      return blocks.sort((a, b) => a.track.index - b.track.index);
    }
  }

  return computePortraitCompactFallback(tracks, dimensions);
}

function getPortraitColumnCount(trackCount: number): number {
  if (trackCount <= 3) {
    return 1;
  }

  if (trackCount <= 12) {
    return 2;
  }

  return 3;
}

function getPortraitColumnFrames(dimensions: Dimensions, columnCount: number) {
  const scale = dimensions.width / 2160;

  if (columnCount === 1) {
    return [
      {
        x: dimensions.width * 0.27,
        y: dimensions.height * 0.14,
        width: dimensions.width * 0.34
      }
    ];
  }

  if (columnCount === 2) {
    return [
      {
        x: dimensions.width * 0.138,
        y: dimensions.height * 0.132,
        width: dimensions.width * 0.245
      },
      {
        x: dimensions.width * 0.423,
        y: dimensions.height * 0.078,
        width: dimensions.width * 0.2
      }
    ];
  }

  return [
    {
      x: dimensions.width * 0.115,
      y: dimensions.height * 0.115,
      width: dimensions.width * 0.24
    },
    {
      x: dimensions.width * 0.39,
      y: dimensions.height * 0.085,
      width: dimensions.width * 0.24
    },
    {
      x: dimensions.width * 0.64,
      y: dimensions.height * 0.14,
      width: dimensions.width * 0.23
    }
  ].map((frame) => ({
    ...frame,
    width: Math.max(420 * scale, frame.width)
  }));
}

function getPortraitTextBottomRatio(trackCount: number): number {
  if (trackCount <= 7) {
    return 0.405;
  }

  if (trackCount <= 12) {
    return 0.44;
  }

  if (trackCount <= 20) {
    return 0.48;
  }

  return 0.56;
}

function getPortraitNaturalGap(trackCount: number, scale: number, pass: number, columnIndex: number): number {
  if (trackCount <= 7) {
    const firstColumnGap = 112 * scale;
    const laterColumnGap = 170 * scale;
    return Math.max(86 * scale, (columnIndex === 0 ? firstColumnGap : laterColumnGap) - pass * 12 * scale);
  }

  if (trackCount <= 12) {
    return Math.max(58 * scale, 118 * scale - pass * 12 * scale);
  }

  return Math.max(28 * scale, 74 * scale - pass * 9 * scale);
}

function distributeTracksPortrait<T>(items: T[], columnCount: number): T[][] {
  if (columnCount === 1) {
    return [items];
  }

  if (columnCount === 2) {
    const leftCount = Math.floor(items.length / 2);
    return [items.slice(0, leftCount), items.slice(leftCount)];
  }

  const base = Math.floor(items.length / columnCount);
  const remainder = items.length % columnCount;
  const columns: T[][] = [];
  let offset = 0;

  for (let index = 0; index < columnCount; index += 1) {
    const count = base + (index < remainder ? 1 : 0);
    columns.push(items.slice(offset, offset + count));
    offset += count;
  }

  return columns;
}

function computePortraitCompactFallback(tracks: RadioTrack[], dimensions: Dimensions): TrackBlock[] {
  const frames = getPortraitColumnFrames(dimensions, 3);
  const columns = distributeTracksPortrait(tracks, 3);
  const scale = dimensions.width / 2160;
  const style: TextStyle = {
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: TYPOGRAPHY.minFontSize * scale,
    fontWeight: TYPOGRAPHY.fontWeight,
    lineHeight: 1.02,
    letterSpacing: 0
  };
  const blocks: TrackBlock[] = [];
  const gap = 20 * scale;

  columns.forEach((columnTracks, columnIndex) => {
    const frame = frames[columnIndex];
    let y = frame.y;

    columnTracks.forEach((track) => {
      const fitted = fitTextBlock(track, frame.width, style);
      blocks.push({
        track,
        x: frame.x,
        y,
        width: frame.width,
        style: fitted.style,
        lines: fitted.lines,
        height: fitted.height
      });
      y += fitted.height + gap;
    });
  });

  return blocks.sort((a, b) => a.track.index - b.track.index);
}

function scaleSafeArea(safeArea: SafeArea, dimensions: Dimensions): SafeArea {
  const scale = dimensions.width / 1080;

  return {
    left: safeArea.left * scale,
    right: safeArea.right * scale,
    top: safeArea.top * scale,
    bottom: safeArea.bottom * scale
  };
}

function getColumnGap(width: number, columnCount: number): number {
  if (columnCount === 1) {
    return 0;
  }

  return Math.max(96, Math.min(172, width * 0.052));
}

function getColumnWidth(contentWidth: number, imageWidth: number, columnCount: number, columnGap: number): number {
  const geometricWidth = (contentWidth - columnGap * (columnCount - 1)) / columnCount;

  if (columnCount === 1) {
    return Math.min(geometricWidth, imageWidth * 0.48);
  }

  if (columnCount === 2) {
    return Math.min(geometricWidth, imageWidth * 0.27);
  }

  return Math.min(geometricWidth, imageWidth * 0.2);
}

function getColumnCount(trackCount: number): number {
  if (trackCount <= 6) {
    return 1;
  }

  if (trackCount <= 12) {
    return 2;
  }

  return 3;
}

function getBaseFontSize(trackCount: number): number {
  if (trackCount <= 6) {
    return TYPOGRAPHY.baseFontSize + 2;
  }

  if (trackCount <= 12) {
    return TYPOGRAPHY.baseFontSize;
  }

  if (trackCount <= 20) {
    return TYPOGRAPHY.compactFontSize;
  }

  return TYPOGRAPHY.denseFontSize;
}

function distributeTracks<T>(items: T[], columnCount: number): T[][] {
  const columns = Array.from({ length: columnCount }, () => [] as T[]);
  const perColumn = Math.ceil(items.length / columnCount);

  items.forEach((item, index) => {
    columns[Math.floor(index / perColumn)].push(item);
  });

  return columns;
}

function compactFallbackLayout(tracks: RadioTrack[], dimensions: Dimensions, safeArea: SafeArea): TrackBlock[] {
  const contentWidth = dimensions.width - safeArea.left - safeArea.right;
  const columnCount = 3;
  const columnGap = getColumnGap(dimensions.width, columnCount);
  const columnWidth = (contentWidth - columnGap * (columnCount - 1)) / columnCount;
  const style: TextStyle = {
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: TYPOGRAPHY.minFontSize,
    fontWeight: TYPOGRAPHY.fontWeight,
    lineHeight: 1.02,
    letterSpacing: 0
  };

  const columns = distributeTracks(tracks, columnCount);
  const gap = 10;
  const blocks: TrackBlock[] = [];

  columns.forEach((columnTracks, columnIndex) => {
    const x = safeArea.left + columnIndex * (columnWidth + columnGap);
    let y = safeArea.top;

    columnTracks.forEach((track) => {
      const fitted = fitTextBlock(track, columnWidth, style);
      blocks.push({
        track,
        x,
        y,
        width: columnWidth,
        style: fitted.style,
        lines: fitted.lines,
        height: fitted.height
      });
      y += fitted.height + gap;
    });
  });

  return blocks;
}

function cleanWrappedLine(line: string): string {
  return line
    .replace(/\s+([/-])\s+/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitVeryLongLine(line: string, maxWidth: number, style: TextStyle): string[] {
  if (measureText(line, style) <= maxWidth) {
    return [line];
  }

  const chunks: string[] = [];
  let current = "";

  for (const char of line) {
    const next = current + char;

    if (measureText(next, style) <= maxWidth || !current) {
      current = next;
      continue;
    }

    chunks.push(current);
    current = char;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
