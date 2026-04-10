import type { PackCategory, VisualAssetType } from "@/types/api";

export const visualAssetTypeOptions: Array<{
  value: VisualAssetType;
  label: string;
  description: string;
}> = [
  {
    value: "photography",
    label: "Photography",
    description: "AI-native photographic stills, editorial frames, and campaign-style scenes."
  },
  {
    value: "illustration",
    label: "Illustration",
    description: "Illustrated compositions, graphic treatments, and stylized artwork."
  },
  {
    value: "concept_art",
    label: "Concept Art",
    description: "Visual development scenes and early-stage creative world building."
  },
  {
    value: "character_design",
    label: "Character Design",
    description: "Character looks, pose systems, and identity-led visual design."
  },
  {
    value: "environment",
    label: "Environment",
    description: "Spatial scenes, locations, and world-building environments."
  },
  {
    value: "brand_visual",
    label: "Brand Visual",
    description: "Commercial brand imagery, campaign visuals, and branded compositions."
  }
];

const visualAssetTypeLabels = Object.fromEntries(
  visualAssetTypeOptions.map((option) => [option.value, option.label])
) as Record<VisualAssetType, string>;

export const formatVisualAssetType = (value: string | null | undefined) =>
  visualAssetTypeLabels[(value || "photography") as VisualAssetType] || "Photography";

export const getVisualAssetTypeDescription = (value: VisualAssetType) =>
  visualAssetTypeOptions.find((option) => option.value === value)?.description || "";

export const packCategoryOptions: Array<{
  value: Extract<
    PackCategory,
    | "photography"
    | "illustration"
    | "concept_art"
    | "character_design"
    | "environment"
    | "brand_visual"
    | "mixed_visuals"
  >;
  label: string;
}> = [
  { value: "photography", label: "Photography Pack" },
  { value: "illustration", label: "Illustration Pack" },
  { value: "concept_art", label: "Concept Art Pack" },
  { value: "character_design", label: "Character Design Pack" },
  { value: "environment", label: "Environment Pack" },
  { value: "brand_visual", label: "Brand Visual Pack" },
  { value: "mixed_visuals", label: "Mixed Visuals" }
];

const packCategoryLabels: Record<string, string> = {
  photography: "Photography Pack",
  illustration: "Illustration Pack",
  concept_art: "Concept Art Pack",
  character_design: "Character Design Pack",
  environment: "Environment Pack",
  brand_visual: "Brand Visual Pack",
  mixed_visuals: "Mixed Visuals",
  visual: "Visual Pack",
  brand: "Brand Pack",
  character: "Character Pack",
  concept: "Concept Pack",
  dataset: "Dataset Pack",
  prompt: "Prompt Pack",
  mixed: "Mixed Pack"
};

export const formatPackCategory = (value: string | null | undefined) =>
  packCategoryLabels[value || "mixed_visuals"] || "Mixed Visuals";
