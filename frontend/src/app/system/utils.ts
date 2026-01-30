export function getCookie(name: string) {
  const entry = document.cookie || ""
    .split("; ")
    .map(s => s.trim())
    .find(row => row.startsWith(name + "="));

    return entry ? decodeURIComponent(entry.substring(name.length + 1)) : null;
}

