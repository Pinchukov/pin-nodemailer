export function convertTextToHtml(text) {
  if (!text) return '';
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
}
