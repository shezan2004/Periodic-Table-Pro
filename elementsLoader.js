export async function loadElementsFromJson(url, fallbackElements = []) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return fallbackElements;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return fallbackElements;
    }

    return data;
  } catch {
    // Local file mode may block fetch; fallback keeps app functional.
    return fallbackElements;
  }
}
