import { FontInfo } from '@/types/font';
import { invoke } from '@tauri-apps/api/core';

// Mock data for development until backend is ready
const MOCK_FONTS: FontInfo[] = [
  {
    id: '1',
    family: 'Arial',
    full_name: 'Arial Regular',
    postscript_name: 'ArialMT',
    style: 'Regular',
    path: 'C:\\Windows\\Fonts\\arial.ttf',
    fileSize: 524288,
    format: 'TrueType',
    is_variable: false,
    languages: ['English'],
    scripts: ['Latn'],
    metadata: {
      designer: 'Robin Nicholas, Patricia Saunders',
      manufacturer: 'Microsoft',
    },
    status: 'Enabled',
    created_at: Date.now(),
  },
  {
    id: '2',
    family: 'Microsoft YaHei',
    full_name: 'Microsoft YaHei Regular',
    postscript_name: 'MicrosoftYaHei',
    style: 'Regular',
    path: 'C:\\Windows\\Fonts\\msyh.ttc',
    fileSize: 1048576,
    format: 'TrueTypeCollection',
    is_variable: false,
    languages: ['Chinese', 'English'],
    scripts: ['Hans', 'Latn'],
    metadata: {
      designer: 'Monotype',
      manufacturer: 'Microsoft',
    },
    status: 'SystemFont',
    created_at: Date.now(),
  },
  {
    id: '3',
    family: 'Times New Roman',
    full_name: 'Times New Roman Regular',
    postscript_name: 'TimesNewRomanPSMT',
    style: 'Regular',
    path: 'C:\\Windows\\Fonts\\times.ttf',
    fileSize: 612352,
    format: 'TrueType',
    is_variable: false,
    languages: ['English'],
    scripts: ['Latn'],
    metadata: {
      designer: 'Stanley Morison',
      manufacturer: 'Microsoft',
    },
    status: 'Enabled',
    created_at: Date.now(),
  },
  {
    id: '4',
    family: 'Courier New',
    full_name: 'Courier New Regular',
    postscript_name: 'CourierNewPSMT',
    style: 'Regular',
    path: 'C:\\Windows\\Fonts\\cour.ttf',
    fileSize: 423456,
    format: 'TrueType',
    is_variable: false,
    languages: ['English'],
    scripts: ['Latn'],
    metadata: {
      designer: 'Adrian Frutiger',
      manufacturer: 'Microsoft',
    },
    status: 'Enabled',
    created_at: Date.now(),
  },
  {
    id: '5',
    family: 'Verdana',
    full_name: 'Verdana Regular',
    postscript_name: 'Verdana',
    style: 'Regular',
    path: 'C:\\Windows\\Fonts\\verdana.ttf',
    fileSize: 753664,
    format: 'TrueType',
    is_variable: false,
    languages: ['English'],
    scripts: ['Latn'],
    metadata: {
      designer: 'Matthew Carter',
      manufacturer: 'Microsoft',
    },
    status: 'Enabled',
    created_at: Date.now(),
  },
  {
    id: '6',
    family: 'Georgia',
    full_name: 'Georgia Regular',
    postscript_name: 'Georgia',
    style: 'Regular',
    path: 'C:\\Windows\\Fonts\\georgia.ttf',
    fileSize: 567808,
    format: 'TrueType',
    is_variable: false,
    languages: ['English'],
    scripts: ['Latn'],
    metadata: {
      designer: 'Matthew Carter',
      manufacturer: 'Microsoft',
    },
    status: 'Enabled',
    created_at: Date.now(),
  },
];

const USE_MOCK = false; // Toggle for development

export async function scanFonts(): Promise<FontInfo[]> {
  if (USE_MOCK) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_FONTS;
  }

  try {
    return await invoke<FontInfo[]>('scan_fonts');
  } catch (error) {
    console.error('Failed to scan fonts:', error);
    throw error;
  }
}

export async function refreshFonts(): Promise<FontInfo[]> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_FONTS;
  }

  try {
    return await invoke<FontInfo[]>('refresh_fonts');
  } catch (error) {
    console.error('Failed to refresh fonts:', error);
    throw error;
  }
}

export async function toggleFont(fontId: string, enable: boolean): Promise<void> {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Mock: ${enable ? 'Enabling' : 'Disabling'} font ${fontId}`);
    return;
  }

  try {
    await invoke('toggle_font', { fontId, enable });
  } catch (error) {
    console.error('Failed to toggle font:', error);
    throw error;
  }
}
