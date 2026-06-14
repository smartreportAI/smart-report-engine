/**
 * Profile Icons — Base64 Data URI Loader
 *
 * Reads profile icon PNGs from disk and converts them to base64
 * data URIs for embedding directly into HTML (required for Puppeteer
 * PDF generation — external file:// references are blocked).
 *
 * Icon lookup:
 *   1. Exact match on profile name → icon filename
 *   2. Case-insensitive fuzzy match
 *   3. Returns empty string if no icon found (graceful fallback)
 *
 * Icons are cached on first load to avoid repeated disk reads.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

/* ───────────────────────────────────────────────────────────────
   Profile Name → Icon Filename mapping

   The key is the profile name (as it appears in ProfileResult.name).
   The value is the PNG filename inside the /profile-icons/ directory.
   ─────────────────────────────────────────────────────────────── */

const PROFILE_ICON_MAP: Record<string, string> = {
  'Allergy Panel':                  'Allergy Panel.png',
  'Anemia Studies':                 'Anemia Studies.png',
  'Arthritis Screening':            'Arthritis Screening.png',
  'Autoimmune Disorders':           'Autoimmune Disorder.png',
  'BMI & BP':                       'BMI & BP.png',
  'Bacterial Infections':           'Bacterial Infections.png',
  'Blood Clotting':                 'Blood Clotting.png',
  'Blood Counts':                   'Blood Counts.png',
  'Blood Disorder':                 'Blood Disorder.png',
  'Blood Group':                    'Blood Group.png',
  'Bone Health':                    'Bone Health.png',
  'COVID':                          'COVID.png',
  'Covid':                          'COVID.png',
  'Cancer Profile':                 'Cancer Profile.png',
  'Cardiac Profile':                'Cardiac Profile.png',
  'Diabetes Monitoring':            'Diabetes Monitoring.png',
  'Electrolyte Profile':            'Electrolyte Profile.png',
  'Heart Assure':                   'heart.png',
  'Hepatitis':                      'Hepatitis.png',
  'Hormones':                       'Hormones.png',
  'Hypertension':                   'Hypertension.png',
  'Immunity':                       'immune.png',
  'Infectious Diseases':            'Infectious Diseases.png',
  'Inflammation':                   'Inflammation.png',
  'Kidney Profile':                 'Kidney Profile.png',
  'Lipid Profile':                  'Lipid profile.png',
  'Liver Profile':                  'Liver Profile.png',
  'Malaria Profile':                'Malaria Profile.png',
  'Mineral Profile':                'Mineral Profile.png',
  'Neurological Disorders':         'Neurological Disorders.png',
  'Pancreas':                       'Pancreas.png',
  'STD Profile':                    'STD Profile.png',
  'Semen Analysis':                 'Semen Analysis.png',
  'Stool Analysis':                 'Stool Analysis.png',
  'Thyroid Profile':                'Thyroid Profile.png',
  'Toxic elements':                 'Toxic elements.png',
  'Tumour Marker Test':             'Tumour Marker Test.png',
  'Urinalysis':                     'Urinalysis.png',
  'Viral Infections':               'Viral Infections.png',
  'Vitamin Profile':                'Vitamin Profile.png',
};

/* ───────────────────────────────────────────────────────────────
   Cache + Loader
   ─────────────────────────────────────────────────────────────── */

/** Root directory where profile icon PNGs live */
const ICONS_DIR = resolve(__dirname, '../../profile-icons');

/** Cache: filename → data URI (or empty string if missing) */
const _dataUriCache = new Map<string, string>();

/**
 * Reads a PNG file and returns its base64 data URI.
 * Returns empty string if the file doesn't exist.
 */
function loadIconAsDataUri(filename: string): string {
  if (_dataUriCache.has(filename)) {
    return _dataUriCache.get(filename)!;
  }

  const filePath = join(ICONS_DIR, filename);

  if (!existsSync(filePath)) {
    _dataUriCache.set(filename, '');
    return '';
  }

  try {
    const buffer = readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64}`;
    _dataUriCache.set(filename, dataUri);
    return dataUri;
  } catch {
    _dataUriCache.set(filename, '');
    return '';
  }
}

/* ───────────────────────────────────────────────────────────────
   Public API
   ─────────────────────────────────────────────────────────────── */

/**
 * Returns the base64 data URI for a profile's icon.
 *
 * @param profileName - The profile name (e.g. "Lipid Profile")
 * @returns base64 data URI string, or empty string if no icon found
 */
export function getProfileIconDataUri(profileName: string): string {
  // 1. Exact match
  const exactFile = PROFILE_ICON_MAP[profileName];
  if (exactFile) {
    return loadIconAsDataUri(exactFile);
  }

  // 2. Case-insensitive match
  const lowerName = profileName.toLowerCase();
  for (const [key, filename] of Object.entries(PROFILE_ICON_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return loadIconAsDataUri(filename);
    }
  }

  // 3. No icon available
  return '';
}

/**
 * Returns an <img> tag for the profile icon, or empty string if no icon.
 * The img tag uses the `profile-icon` CSS class for sizing/positioning.
 *
 * @param profileName - The profile name
 * @param cssClass - Optional additional CSS class (default: 'profile-icon')
 */
export function renderProfileIconImg(
  profileName: string,
  cssClass: string = 'profile-icon',
): string {
  const dataUri = getProfileIconDataUri(profileName);
  if (!dataUri) return '';

  return `<img src="${dataUri}" alt="" class="${cssClass}" />`;
}
