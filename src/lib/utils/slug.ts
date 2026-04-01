/**
 * Converts a text string into a URL-safe slug.
 *
 * Handles Hungarian accented characters (á, é, í, ó, ö, ő, ú, ü, ű)
 * by normalizing to NFD and stripping diacritics.
 *
 * @example
 * toSlug("Nyári Pólók") // => "nyari-polok"
 * toSlug("  Hello World!  ") // => "hello-world"
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
