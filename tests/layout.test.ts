import { describe, expect, it } from "vitest";
import { computeLayout, measureText } from "../src/shared/layout.js";
import { RadioTrack } from "../src/shared/models.js";

describe("portrait radio layout", () => {
  it("keeps long tracks inside separated columns", () => {
    const tracks: RadioTrack[] = [
      { index: 1, artist: "STINA NORDENSTAM", title: "EVERYONE ELSE IN THE WORLD" },
      { index: 2, artist: "THE DETROIT ESCALATOR CO.", title: "POINT OF ENTRY" },
      { index: 3, artist: "XEPER", title: "CARCERES EX NOVUM" },
      { index: 4, artist: "MONOLAKE", title: "NORTH" },
      { index: 5, artist: "SEXURITAS", title: "MANI" },
      { index: 6, artist: "METAMATICS", title: "VANISHING POINT" },
      { index: 7, artist: "RIVAL CONSOLES", title: "LOOMING" },
      { index: 8, artist: "STINA NORDENSTAM", title: "CIRCUS" }
    ];

    const blocks = computeLayout(tracks, { width: 2160, height: 2880 });
    const rightColumnX = blocks.find((block) => block.track.index === 5)!.x;

    expect(blocks.filter((block) => block.track.index <= 4).every((block) => block.x + block.width < rightColumnX)).toBe(true);
    expect(blocks.every((block) => block.lines.every((line) => measureText(line, block.style) <= block.width))).toBe(true);
  });
});
