import type { CSSProperties } from "react";

const typePalette = {
  normal: { primary: "#9a8e7c", deep: "#574e46" },
  fire: { primary: "#f07835", deep: "#a72f29" },
  water: { primary: "#168de0", deep: "#0754ad" },
  electric: { primary: "#e9bd24", deep: "#9c7010" },
  grass: { primary: "#45a95e", deep: "#17633e" },
  ice: { primary: "#56c7d6", deep: "#267eaa" },
  fighting: { primary: "#d34c43", deep: "#742a32" },
  poison: { primary: "#a64bc2", deep: "#592d83" },
  ground: { primary: "#c18a3d", deep: "#70472d" },
  flying: { primary: "#7299dd", deep: "#6656a6" },
  psychic: { primary: "#ec6b9d", deep: "#9e377c" },
  bug: { primary: "#a4bd35", deep: "#4a7628" },
  rock: { primary: "#a99763", deep: "#61503b" },
  ghost: { primary: "#7960c4", deep: "#38275f" },
  dragon: { primary: "#5968dc", deep: "#292d78" },
  dark: { primary: "#66505a", deep: "#302630" },
  steel: { primary: "#7d9aaa", deep: "#42566c" },
  fairy: { primary: "#df82b8", deep: "#95508e" },
} as const;

export type PokemonType = keyof typeof typePalette;

export type TypeArtworkStyle = CSSProperties & {
  "--art-primary": string;
  "--art-deep": string;
  "--art-secondary": string;
};

const fallback = typePalette.normal;

export function typeArtworkStyle(types: readonly string[]): TypeArtworkStyle {
  const primary = typePalette[types[0] as PokemonType] ?? fallback;
  const secondary = typePalette[types[1] as PokemonType] ?? primary;

  return {
    "--art-primary": primary.primary,
    "--art-deep": primary.deep,
    "--art-secondary": secondary.primary,
  };
}

export type TypeCardStyle = CSSProperties & { "--card-type": string };

export function typeCardStyle(types: readonly string[]): TypeCardStyle {
  const primary = typePalette[types[0] as PokemonType] ?? fallback;
  return { "--card-type": primary.primary };
}
