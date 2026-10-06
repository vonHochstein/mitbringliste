export const limits = { nutzer: 80, mitbringsel: 160, anzahl: 80 };

export function normalizeEntry(entry) {
  return Object.fromEntries(Object.keys(limits).map(key => [key, String(entry[key] ?? "").trim()]));
}

export function validateEntry(entry) {
  const clean = normalizeEntry(entry);
  return Object.keys(limits).filter(key => !clean[key] || clean[key].length > limits[key]);
}

export function validateRows(name, rows) {
  const entries = [], invalidRows = [];
  rows.forEach((row, index) => {
    const entry = normalizeEntry({ ...row, nutzer: name });
    if (!entry.mitbringsel && !entry.anzahl) return;
    if (validateEntry(entry).length) invalidRows.push(index);
    else entries.push(entry);
  });
  return { entries, invalidRows };
}

export function sortEntries(entries) {
  const collator = new Intl.Collator("de", { sensitivity: "base", numeric: true });
  return [...entries].sort((a, b) => collator.compare(a.nutzer, b.nutzer) || collator.compare(a.mitbringsel, b.mitbringsel) || a.id.localeCompare(b.id));
}

export function createApi(config, fetchFn = globalThis.fetch.bind(globalThis)) {
  let url;
  try { url = new URL(config.supabaseUrl); } catch { /* configuration is incomplete */ }
  const configured = !!url && url.protocol === "https:" && /^sb_publishable_/.test(config.publishableKey);
  const endpoint = url ? `${url.origin}/rest/v1/mitbringsel` : "";
  async function request(query, method = "GET", body) {
    if (!configured) throw new Error("Die Liste ist noch nicht eingerichtet. Bitte versuche es später erneut.");
    let response;
    try {
      response = await fetchFn(endpoint + query, {
        method,
        headers: { apikey: config.publishableKey, "Content-Type": "application/json", Prefer: "return=representation" },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
    } catch { throw new Error("Die Verbindung ist unterbrochen. Deine Eingaben bleiben erhalten. Bitte prüfe vor erneutem Speichern die Übersicht."); }
    if (!response.ok) throw new Error("Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut.");
    return response.json();
  }
  const idQuery = id => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Dieser Eintrag ist ungültig.");
    return `?id=eq.${encodeURIComponent(id)}`;
  };
  return {
    configured,
    list: () => request("?select=id,nutzer,mitbringsel,anzahl"),
    insert: entries => request("", "POST", entries),
    async update(id, entry) {
      const result = await request(idQuery(id), "PATCH", normalizeEntry(entry));
      if (!result.length) throw new Error("Dieser Eintrag wurde inzwischen gelöscht. Bitte aktualisiere die Übersicht.");
      return result;
    },
    async remove(id) { return request(idQuery(id), "DELETE"); },
  };
}
