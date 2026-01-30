export function getCookie(name: string) {
  const entry = (document.cookie || "")
    .split("; ")
    .map((s) => s.trim())
    .find((row) => row.startsWith(name + "="));

  return entry ? decodeURIComponent(entry.substring(name.length + 1)) : null;
}

export function downloadData(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
