/** Case and accent insensitive search key (« Pâtes » matches « pates »). */
export function searchKey(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
