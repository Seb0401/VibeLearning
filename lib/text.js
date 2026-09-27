// Quita emojis (y el selector de variación que los acompaña) de texto generado por la IA,
// para que la interfaz use solo los iconos propios de la app.
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

export function stripEmoji(text) {
  if (typeof text !== "string") return text;
  // Solo colapsa espacios dentro de la línea: la sangría inicial (listas del mapa mental) se conserva.
  return text.replace(EMOJI_RE, "").replace(/(\S)[ \t]{2,}/g, "$1 ").replace(/(^|\n)([ \t]*[-*#]+)[ \t]+(?=\S)/g, "$1$2 ");
}
