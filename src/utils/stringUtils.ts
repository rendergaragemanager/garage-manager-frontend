/**
 * Normalizes a string by converting it to lowercase, decomposing combined characters (like accented letters),
 * and removing the accent marks (diacritics).
 *
 * @param str The string to normalize.
 * @returns The normalized string, or an empty string if the input is null or undefined.
 */
export const normalizeString = (str: string | undefined | null): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD') // Decompone caracteres combinados (á -> a + ´)
    .replace(/[\u0300-\u036f]/g, '') // Elimina las tildes
    .trim();
};

/**
 * Capitalizes the first letter of each word in a string.
 *
 * @param str The string to capitalize.
 * @returns The capitalized string, or an empty string if the input is null or undefined.
 */
export const capitalizeWords = (str: string | undefined | null): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
};
