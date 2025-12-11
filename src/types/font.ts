// Font data types matching Rust backend
export interface FontInfo {
  id: string;
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  path: string;
  fileSize: number;
  format: FontFormat;
  isVariable: boolean;
  languages: string[];
  scripts: string[];
  metadata: FontMetadata;
  status: FontStatus;
  createdAt: number;
}

export type FontFormat = 'TrueType' | 'OpenType' | 'TrueTypeCollection' | 'Woff' | 'Woff2';
export type FontStatus = 'Enabled' | 'Disabled' | 'SystemFont';

export interface FontMetadata {
  version?: string;
  designer?: string;
  manufacturer?: string;
  license?: string;
  copyright?: string;
  description?: string;
}

export interface FontCategory {
  languages: string[];
  fontType: FontType;
  familyGroup: string;
}

export type FontType = 'Serif' | 'SansSerif' | 'Monospace' | 'Handwriting' | 'Decorative';
