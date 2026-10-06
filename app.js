import { config } from "./config.js?v=20261006-1";
import { createApi, normalizeEntry, validateEntry, validateRows, sortEntries } from "./core.js";

const $ = id => document.getElementById(id);
const participants = ["Philipp der Schöne", "Ulli", "Axel", "Philipp der Kühne", "Küste", "Karsten", "Titte", "Jensi"].sort(new Intl.Collator("de").compare);
function populateNames(select, current = "") {
  const names = participants.includes(current) || !current ? participants : [...participants, current].sort(new Intl.Collator("de").compare);
  select.replaceChildren(new Option("Bitte auswählen …", ""), ...names.map(value => new Option(value, value)));
  select.value = current;
}
const api = createApi(config);
let name = "", rowCounter = 0, loadingVersion = 0, saving = false, editing = null, deleting = null, mutationBusy = false;
const views = { start: $("start"), uebersicht: $("overview"), name: $("name-step"), dinge: $("items-step") };

function notice(message, kind = "success") {
  $("notice").textContent = message;
  $("notice").dataset.kind = kind;
  $("notice").hidden = !message;
}

function addRow() {
  const number = ++rowCounter;
  const row = document.createElement("div");
  row.className = "item-row";
  for (const [field, label, placeholder, maxLength] of [["mitbringsel", "Bringe ich mit", "z. B. Pfeffi", 160], ["anzahl", "Menge", "2 Flaschen", 80]]) {
    const input = document.createElement("input");
    input.dataset.field = field;
    input.setAttribute("aria-label", `${label}, Zeile ${number}`);
    input.placeholder = placeholder;
    input.maxLength = maxLength;
    input.autocomplete = "off";
    row.append(input);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-row";
  remove.textContent = "×";
  remove.setAttribute("aria-label", `Zeile ${number} entfernen`);
  remove.addEventListener("click", () => { row.remove(); if (!$("item-rows").children.length) addRow(); });
  row.append(remove);
  $("item-rows").append(row);
  return row;
}

function resetRows() { $("item-rows").replaceChildren(); rowCounter = 0; for (let i = 0; i < 3; i++) addRow(); }

function renderEntries(entries) {
  $("entries").replaceChildren();
  for (const entry of sortEntries(entries)) {
    const row = document.createElement("tr");
    for (const key of ["nutzer", "mitbringsel", "anzahl"]) {
      const cell = document.createElement("td");
      cell.textContent = entry[key];
      row.append(cell);
    }
    const actionsCell = document.createElement("td"), actions = document.createElement("div");
    actions.className = "row-actions";
    for (const [label, action] of [["Bearbeiten", openEdit], ["Löschen", openDelete]]) {
      const button = document.createElement("button");
      button.type = "button";
      const icon = label === "Bearbeiten"
        ? '<path d="m16 3 5 5-12 12H4v-5L16 3Z"/><path d="m14 5 5 5"/>'
        : '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>';
      button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
      button.title = label;
      button.setAttribute("aria-label", `${label}: ${entry.mitbringsel} von ${entry.nutzer}`);
      button.addEventListener("click", () => action(entry));
      actions.append(button);
    }
    actionsCell.append(actions); row.append(actionsCell); $("entries").append(row);
  }
}

async function loadEntries() {
  const version = ++loadingVersion;
  $("refresh").disabled = true;
  $("table-wrap").hidden = true;
  $("list-status").textContent = "Die Liste wird geladen …";
  try {
    const entries = await api.list();
    if (version !== loadingVersion) return;
    renderEntries(entries);
    $("table-wrap").hidden = !entries.length;
    $("list-status").textContent = entries.length ? `${entries.length} Mitbringsel eingetragen` : "Noch ist die Liste leer. Mach den ersten Eintrag!";
  } catch (error) { if (version === loadingVersion) $("list-status").textContent = error.message; }
  finally { if (version === loadingVersion) $("refresh").disabled = false; }
}

function showView() {
  let route = location.hash.slice(1) || "start";
  if (!(route in views)) route = "start";
  if (route === "dinge" && !name) { location.hash = "name"; return; }
  document.body.classList.toggle("compact-overview", route === "uebersicht");
  Object.entries(views).forEach(([key, view]) => { view.hidden = key !== route; });
  if (route === "uebersicht") loadEntries();
  if (route === "name") $("person-name").value = name;
  if (route === "dinge") $("person-label").textContent = name;
  if (route !== "uebersicht") ++loadingVersion;
  const heading = views[route].querySelector("h2");
  heading.tabIndex = -1; heading.focus({ preventScroll: true });
}

$("name-form").addEventListener("submit", event => {
  event.preventDefault();
  name = $("person-name").value.trim();
  $("name-error").textContent = name ? "" : "Bitte wähle deinen Namen aus.";
  $("person-name").setAttribute("aria-invalid", String(!name));
  if (name) { notice(""); location.hash = "dinge"; }
});

$("add-row").addEventListener("click", () => addRow().querySelector("input").focus());
$("refresh").addEventListener("click", loadEntries);
$("items-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (saving) return;
  const rows = [...$("item-rows").children];
  const values = rows.map(row => Object.fromEntries([...row.querySelectorAll("input")].map(input => [input.dataset.field, input.value])));
  const { entries, invalidRows } = validateRows(name, values);
  rows.forEach((row, index) => row.querySelectorAll("input").forEach(input => input.setAttribute("aria-invalid", String(invalidRows.includes(index)))));
  $("items-error").textContent = invalidRows.length ? "Bitte fülle in den markierten Zeilen Mitbringsel und Menge aus." : !entries.length ? "Bitte trage mindestens ein Mitbringsel mit Menge ein." : "";
  if (invalidRows.length || !entries.length) { rows[invalidRows[0] ?? 0]?.querySelector("input").focus(); return; }
  saving = true;
  const controls = [...$("items-form").querySelectorAll("input,button")];
  controls.forEach(control => { control.disabled = true; });
  $("save-items").textContent = "Wird gespeichert …";
  try {
    await api.insert(entries);
    resetRows();
    notice("Gespeichert! Deine Mitbringsel stehen jetzt auf der Liste.");
    if (location.hash === "#uebersicht") loadEntries(); else location.hash = "uebersicht";
  } catch (error) { $("items-error").textContent = error.message; notice(error.message, "error"); }
  finally { saving = false; controls.forEach(control => { control.disabled = false; }); $("save-items").textContent = "Alles speichern"; }
});

function setMutationBusy(busy, dialog) {
  mutationBusy = busy;
  dialog.querySelectorAll("input,select,button").forEach(control => { control.disabled = busy; });
}

function openEdit(entry) {
  editing = entry;
  populateNames($("edit-name"), entry.nutzer); $("edit-item").value = entry.mitbringsel; $("edit-amount").value = entry.anzahl;
  $("edit-error").textContent = "";
  $("edit-dialog").showModal();
}
function openDelete(entry) {
  deleting = entry;
  $("delete-description").textContent = `${entry.mitbringsel} · ${entry.anzahl} · von ${entry.nutzer}. Möchtest du diesen Eintrag wirklich löschen?`;
  $("delete-error").textContent = "";
  $("delete-dialog").showModal();
}
for (const type of ["edit", "delete"]) {
  $(`cancel-${type}`).addEventListener("click", () => $(`${type}-dialog`).close());
  $(`${type}-dialog`).addEventListener("cancel", event => { if (mutationBusy) event.preventDefault(); });
}
$("edit-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (mutationBusy) return;
  const entry = normalizeEntry({ nutzer: $("edit-name").value, mitbringsel: $("edit-item").value, anzahl: $("edit-amount").value });
  if (validateEntry(entry).length) { $("edit-error").textContent = "Bitte fülle alle drei Felder aus."; return; }
  setMutationBusy(true, $("edit-dialog"));
  try { await api.update(editing.id, entry); $("edit-dialog").close(); notice("Der Eintrag wurde geändert."); await loadEntries(); }
  catch (error) { $("edit-error").textContent = error.message; }
  finally { setMutationBusy(false, $("edit-dialog")); }
});
$("confirm-delete").addEventListener("click", async () => {
  if (mutationBusy) return;
  setMutationBusy(true, $("delete-dialog"));
  try { await api.remove(deleting.id); $("delete-dialog").close(); notice("Der Eintrag wurde gelöscht."); await loadEntries(); }
  catch (error) { $("delete-error").textContent = error.message; }
  finally { setMutationBusy(false, $("delete-dialog")); }
});
window.addEventListener("hashchange", showView);
$("easteregg").addEventListener("click", () => {
  const source = new URL("./assets/easteregg.gif", import.meta.url);
  source.searchParams.set("play", Date.now());
  $("easteregg-gif").src = source.href;
});
populateNames($("person-name"));
populateNames($("edit-name"));
resetRows(); showView();
