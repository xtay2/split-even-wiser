### Technologie
Dies ist eine Mobile First, Progressive Web App mit einem PHP 8.5, Laravel 12 Backend (REST Api), und einem React 19, Redux (Toolkit), Bootstrap 5 Frontend. PostgreSQL als Datenbank.
Die Anwendung läuft in Docker Compose und nutzt docker-mailserver für den E-Mail-Versand.

### Funktionalität
Die App ist eine simple gratis Alternative zu Splitwise, einer mobile App zum Aufteilen von Zahlungen.
- Account Erstellung (Username + E-Mail) (Kein Passwort, Anmeldung über E-Mail-Token)
- Angabe von Profilbild
- Freundesliste mit Freundschaftsanfragen (Push Notification)
- Erstellen von Gruppen
  - Jede Gruppe hat einen Namen und eine optionale Beschreibung
  - Jedes Mitglied einer Gruppe kann andere Personen zur Gruppe hinzufügen.
  - Innerhalb einer Gruppe wird alles versioniert
  - Jede Person in der Gruppe kann Ausgaben erstellen und verändern.
    - Eine Ausgabe hat einen Titel, einen Geldbetrag und eine Währung.
    - Es kann angegeben werden, welche Gruppenmitglieder zu welchem Anteil an der Ausgabe beteiligt sind.
    - Man kann angeben seine Schulden beglichen zu haben.
    - Schulden werden transitiv minifiziert. Wenn Person A, Person B 5€ schuldet, und Person B, Person C 5€ schuldet, schuldet nur Person A, Person C 5€.
    - Man kann die Gruppe erst verlassen, wenn man quit ist.