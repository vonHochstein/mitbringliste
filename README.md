# Wer bringt was mit?

Kleine gemeinsame Wochenendliste, ohne Anmeldung. Alle Besucher dürfen alle Einträge lesen, ergänzen, bearbeiten und löschen.

## Einrichtung

1. In der bestehenden Supabase-Organisation **Testprojekte** ein kostenloses Projekt **mitbringliste** in Frankfurt anlegen. Vorher tatsächliche Kosten prüfen.
2. `supabase/schema.sql` im SQL-Editor dieses neuen Projekts ausführen. Das Skript ist für die erstmalige Einrichtung gedacht.
3. In `config.js` die Projekt-URL und einen aktiven `sb_publishable_…`-Key einsetzen. Niemals einen Secret- oder Service-Role-Key verwenden.
4. Dateien in das öffentliche Repository `vonHochstein/mitbringliste` auf `main` übertragen. In Settings → Pages „Deploy from a branch“, `main`, `/ (root)` einstellen.

Die Website wird unter https://vonhochstein.github.io/mitbringliste/ erreichbar, sobald Pages erfolgreich veröffentlicht hat. Ohne konfigurierte Datenbank zeigt sie einen Hinweis; sie verwendet keine Beispieldaten.

## Lokal prüfen

`python3 -m http.server 8000` im Projektordner starten, dann http://localhost:8000 öffnen. `npm test` führt die Tests für Formularvalidierung, Sortierung und Datenzugriff aus. Kein Build und keine Laufzeitabhängigkeiten nötig.

Browserprüfungen sind in `tests/QA.md` dokumentiert. Nach der Einrichtung prüft `node tests/verify-supabase.js` die echte Datenbank mit eindeutig markierten Testzeilen und entfernt diese anschließend wieder.

## Daten und Verhalten

`mitbringsel`: `id` (UUID), `nutzer`, `mitbringsel`, `anzahl` (Text; in der Oberfläche „Menge“). Leerzeilen werden ignoriert, Teilzeilen blockieren das Speichern. Neue Zeilen gehen gemeinsam in einen Request. Alle Nutzereingaben werden als Text angezeigt. Aktualisierung beim Öffnen der Übersicht oder über „Aktualisieren“; keine automatische Synchronisierung.

Die öffentliche Liste ist keine Zugangsbeschränkung: Jeder kann die Seite und die freigegebene Tabelle aufrufen. `noindex` ist nur ein Hinweis für Suchmaschinen. Die Daten gehören ausschließlich in das separate Projekt.

Bei einem Verbindungsabbruch kann das Ergebnis eines Speichervorgangs unklar sein. Die Eingaben bleiben erhalten; die Oberfläche weist darauf hin, vor erneutem Speichern die Übersicht zu prüfen.
