// Font data types matching Rust backend
export interface FontInfo {
  id: string;
  family: string;
  full_name: string;
  postscript_name: string;
  style: string;
  path: string;
  fileSize: number;
  format: FontFormat;
  is_variable: boolean;
  languages: string[];
  scripts: string[];
  metadata: FontMetadata;
  status: FontStatus;
  created_at: number;
  // Localized names
  family_zh?: string;              // Chinese (PRC) family name
  full_name_zh?: string;            // Chinese (PRC) full name
}

export type FontFormat = 'TrueType' | 'OpenType' | 'TrueTypeCollection' | 'Woff' | 'Woff2';
export type FontStatus = 'Enabled' | 'Disabled' | 'SystemFont';

export interface FontMetadata {
  // OpenType Name IDs (0-20)
  copyright?: string;             // ID 0
  familyName?: string;            // ID 1
  subfamilyName?: string;         // ID 2
  uniqueIdentifier?: string;      // ID 3
  fullName?: string;              // ID 4
  version?: string;               // ID 5
  postscriptName?: string;        // ID 6
  trademark?: string;             // ID 7
  manufacturer?: string;          // ID 8
  designer?: string;              // ID 9
  description?: string;           // ID 10
  vendorUrl?: string;             // ID 11
  designerUrl?: string;           // ID 12
  license?: string;               // ID 13
  licenseUrl?: string;            // ID 14
  typographicFamily?: string;     // ID 16
  typographicSubfamily?: string;  // ID 17
  compatibleFull?: string;        // ID 18
  sampleText?: string;            // ID 19
  postscriptCid?: string;         // ID 20
}

export interface FontCategory {
  languages: string[];
  fontType: FontType;
  familyGroup: string;
}

export type FontType = 'Serif' | 'SansSerif' | 'Monospace' | 'Handwriting' | 'Decorative';
