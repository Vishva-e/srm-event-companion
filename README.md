# SRM Event Companion — Java Spring Boot Website

An **unofficial SRM-inspired student hackathon prototype** recreated from the four-screen Figma concept. Its interactive frontend demo runs independently with local sample data; an optional Java + Spring Boot 3 backend and H2 database are also included.

> **Important:** This is **not** an official SRM University portal. The university-inspired vector emblem is original placeholder artwork, **not** the official SRM logo. Student names, IDs, attendance, seat numbers and menus are fictitious demo data. **Never enter real SRM credentials.** This sample has *no* production authentication or integration with SRM services.

## 📦 Tech stack

- **Frontend demo:** Semantic HTML5, responsive CSS3, vanilla JavaScript and in-browser sample fixtures. No backend, Node or npm required.
- **Optional backend:** Java 17+, Spring Boot 3.5.6, Spring Web MVC, Spring JDBC, Jakarta Bean Validation, HTTP session
- **Optional database:** Embedded, file-backed H2 database for demo students, seats, food counters and menus
- **Testing:** JUnit 5 + Spring `MockMvc` integration tests with an isolated in-memory H2 database
- **Branding:** University-inspired blue `#084298` and heritage gold `#E1B052` from the concept design

## 🎨 Run the frontend-only demo

Open `src/main/resources/static/index.html` with VS Code Live Server or any static file server. The login, event pass, auditorium map, food menu, guest count, printable pass and campus guide run with sample data in the browser; no Java server or API is needed.

Demo logins:

| Register number | Net ID | Demo student |
|---|---|---|
| `SRM2026001` | `vishva.demo` | Vishva |
| `SRM2026002` | `sanjana.demo` | Sanjana |
| `SRM2026003` | `arun.demo` | Arun |

Guest-count changes are kept in the current browser tab only. Never enter real student credentials.

### Share the demo on WhatsApp

The repository includes a GitHub Pages workflow that publishes only the frontend demo (not the API-dependent share poster page). Push the changes to the `main` branch, then open the repository's **Actions** tab and wait for **Deploy frontend demo to GitHub Pages** to finish. The public demo URL is:

<https://vishva-e.github.io/srm-event-companion/>

Send that URL in WhatsApp. The page is public, so anyone with the link can open the sample demo. If GitHub Pages is not enabled for the repository, open **Settings → Pages**, choose **GitHub Actions** as the build and deployment source, then run the workflow again.

## ▶️ Run the optional Java backend

**Prerequisites:** JDK 17 or newer and Apache Maven 3.9+ (or open `pom.xml` in IntelliJ IDEA and run `EventCompanionApplication`).

```bash
git clone https://github.com/Vishva-e/srm-event-companion.git
cd srm-event-companion
mvn spring-boot:run
```

Open **http://localhost:8080** in your browser to use the optional Spring Boot-hosted site and API.

API integration tests:

```bash
mvn test
```

For a clean build, all integration tests, and the executable JAR, run `mvn clean verify`.

Package and run:

```bash
mvn clean package
java -jar target/srm-event-companion-1.0.0.jar
```

You can deploy the resulting executable JAR to any hosting platform supporting a Java server. Configure `PORT` when required (the default is 8080).

### Database setup and schema

H2 runs inside the application; no separate database installation is needed. The default database is stored at `./data/srm-event-companion`, relative to the directory where the app starts. Startup creates missing tables and inserts missing demo rows while preserving existing records and edits on subsequent starts. Student assignments, seat occupancy, food counters and menu items persist across restarts; HTTP sessions remain in memory, so users must sign in again after a restart.

| Table | Columns |
|---|---|
| `students` | `student_id`, `student_name`, `seat_code`, `entry_gate`, `counter_number` |
| `seats` | `seat_code`, `row_label`, `seat_number`, `occupied` |
| `food_counters` | `counter_number`, `floor`, `zone`, `near_gate` |
| `menu_items` | `item_id`, `name`, `description`, `category`, `diet_label`, `badge`, `art_style`, `price_inr`, `display_order` |

`students.seat_code` is unique and references `seats.seat_code`; `students.counter_number` references `food_counters.counter_number`. A seat is occupied when it is assigned to another student or its `occupied` flag is set. The current student's assignment appears as `YOURS`.

Set `APP_DB_URL` to override the H2 database location. Optional database authentication overrides are read from `APP_DB_USERNAME` and `APP_DB_PASSWORD` environment variables; keep their values outside source files and documentation. The H2 console is disabled by default.

Run one application process per file database. On hosts with an ephemeral filesystem, mount a persistent volume for the `data` directory so deployments retain database records.

### Docker

```bash
docker build -t srm-event-companion .
docker run --rm -p 8080:8080 -v srm-event-data:/app/data srm-event-companion
```

The named Docker volume retains the H2 database when the container is replaced.

## 🛠 Troubleshooting: index.html does not load

For the frontend-only demo, use VS Code Live Server or another static file server with `src/main/resources/static/index.html`. To run the optional API backend, open the terminal in the directory containing `pom.xml`:

```bash
git clone https://github.com/Vishva-e/srm-event-companion.git
cd srm-event-companion
java -version
mvn -version
mvn spring-boot:run
```

Wait for `Started EventCompanionApplication` in the terminal and open
**http://localhost:8080/** (or **http://localhost:8080/index.html**).

- **`cd: no such file or directory`**: After cloning the repository, the folder is named `srm-event-companion` by default. Do **not** use `srm-event-companion-java` unless you renamed it yourself.
- **`mvn: command not found` / `mvn is not recognized`**: Install Apache Maven 3.9+ and add its `bin` directory to your PATH. Reopen the terminal, then run `mvn -version`.
- **Wrong Java version**: Set `JAVA_HOME` to JDK 17+; check `java -version` and `mvn -version`.
- **Port 8080 already in use**: Shut down the existing server or use `mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=8081` and browse to `http://localhost:8081/`.
- **404 Not Found**: Confirm you started the Java application from the repository root. The HTML is at `src/main/resources/static/index.html`, and Spring Boot serves it at the root path `/`.
- **Blank UI / assets missing**: Open browser Developer Tools (F12) → Console and Network. Confirm `/app.js`, `/styles.css`, and `/assets/srm-online-logo.png` return HTTP 200. Run `mvn clean spring-boot:run`, then reload with Ctrl+Shift+R.
- **Java build errors**: Run `mvn clean test` and inspect the **first** error. The first build requires internet access to download dependencies.
- The frontend-only demo does not call `/api/` endpoints. Use the Spring Boot server only when you specifically want to run the optional backend features.

You can verify the server from a second terminal:

```bash
curl -I http://localhost:8080/
curl -I http://localhost:8080/index.html
curl -I http://localhost:8080/styles.css
curl -I http://localhost:8080/app.js
```

When all four return HTTP 200, try the demo ID: `SRM2026001`.

### Open the standalone demo

[`graduation-day-standalone.html`](./graduation-day-standalone.html) is the complete single-file app. Open it directly in a browser (`file://`) without starting Spring Boot. Its HTML, CSS, JavaScript, sample data, offline QR generator, and poster are all embedded in that file.

The demo login, pass, seat map, sample food menu, and accompanying-member details work locally; member details are saved only in that browser's local storage. Creating a QR poster also works offline. To make its QR open on another device, enter a public website URL; map links need internet when opened. The separate Spring Boot application remains available at `http://localhost:8080/` when you want server-backed demo data.

## 🔑 Demo student accounts

Use **only** these fictional register numbers or Net IDs. Names below are displayed in the app and are not requested at sign-in. The **Fill demo ID** button populates the first account.

| Register number | Display name | Net ID | Assigned seat | Gate | Food counter |
|---|---|---|---|---|
| `SRM2026001` | `Vishva` | `vishva.demo` | **E07** | 02 | 03 |
| `SRM2026002` | `Sanjana` | `sanjana.demo` | **C04** | 01 | 01 |
| `SRM2026003` | `Arun` | `arun.demo` | **F02** | 03 | 02 |

## ✅ Functional features

1. **Student demo login:** Enter a sample register number or Net ID. Spring Boot matches it against the fictitious profiles stored in H2.
2. **Session-backed dashboard:** Server responds with personalised event pass, assigned seat and food counter; refresh restores your server session until it expires after 30 minutes of inactivity.
3. **Cinema-style seating:** Java API serves a 7-row × 9-seat auditorium map. Your seat is **highlighted gold**. Available and occupied seats are visually distinct. **Locate my seat** scrolls/highlights the assigned spot.
4. **Food counters:** Java API serves the assigned food counter and four menu items with prices in INR. Client-side filters and search work across the API data.
5. **Campus guide:** Embedded Kattankulathur campus map, place searches and optional live directions.
6. **Sample pass download:** Download a personalized PDF copy of the demo event pass. It is clearly marked as not valid for entry.
7. **Responsive layouts:** Desktop side navigation and mobile bottom navigation.
8. **Log out:** Invalidates the Java HTTP session and returns to sign-in. Protected APIs return 401 without a session.

## 🔌 REST API

Responses with a body are JSON; successful sign-out returns `204 No Content`. Sessions use an HTTP-only, SameSite=Strict browser cookie. `POST /api/session` is public for login; `GET /api/session` and event resources require a demo session. Signing out is safe to repeat even when no session exists.

| HTTP | URL | Function |
|---|---|---|
| `POST` | `/api/session` | Demo sign in with `{ "studentId": "SRM2026001" }` (register number or Net ID) |
| `GET` | `/api/session` | Read current session and event pass |
| `DELETE` | `/api/session` | Sign out |
| `GET` | `/api/event` | Current user's event/seat/counter assignment |
| `GET` | `/api/seats` | Cinema seat map with `YOURS`, `OCCUPIED`, `AVAILABLE` statuses |
| `GET` | `/api/menu` | Assigned food counter details + item/price catalog |

Example:

```bash
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"studentId":"SRM2026001"}' \
  http://localhost:8080/api/session

curl -b cookies.txt http://localhost:8080/api/seats
curl -b cookies.txt http://localhost:8080/api/menu
```

API errors have a consistent shape, for example:

```json
{"error":"NOT_SIGNED_IN","message":"Sign in with a demo account first."}
```

Invalid or malformed login bodies return `400`; unknown demo accounts or missing sessions return `401`. Unsupported methods return `405`, and unsupported request content types return `415`. API responses use `Cache-Control: no-store`.

## Browser regression checks

The optional browser checks exercise all three demo accounts, seat location, menu search/filtering, navigation, session restoration, and recovery from failed requests. They require Chrome/Chromium and Python 3 with `websocket-client`; these are test tools only, not application requirements.

With the Spring Boot server running in another terminal:

```bash
python3 -m venv .venv
.venv/bin/pip install websocket-client
.venv/bin/python scripts/browser-smoke.py http://localhost:8080
```

Use `--chrome /path/to/chrome` if Chrome is not on your path. Add `--screenshots target/browser-smoke` to save desktop and mobile views, or `--timeout 60` for a slow machine. Checks run in a temporary browser profile and use only the fictional accounts above.

## 🗂️ Project structure

```text
srm-event-companion/
├── pom.xml
├── Dockerfile
├── .dockerignore
├── scripts/browser-smoke.py
├── src/
│   ├── main/
│   │   ├── java/com/srm/eventcompanion/
│   │   │   ├── EventCompanionApplication.java
│   │   │   ├── api/EventApiController.java
│   │   │   ├── api/ApiExceptionHandler.java
│   │   │   ├── domain/EventModels.java
│   │   │   └── service/DemoEventService.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── static/
│   │           ├── index.html
│   │           ├── styles.css
│   │           ├── app.js
│   │           └── assets/
│   └── test/java/com/srm/eventcompanion/EventApiIntegrationTest.java
└── README.md
```

## 🛡️ Before real use

This demo accepts a *known sample register number or Net ID only*; this is not secure authentication. A real deployment must have university-approved SSO/OIDC (and permission to use institutional marks), TLS/HTTPS, a persistent user/enrolment database, server-side authorization, CSRF protection, rate limits, audit logging, and verified seat/counter assignments. The demo must never be advertised as an official SRM login site.

## Notes

- CSS uses Google Fonts if reachable, with system-font fallbacks.
- Each server restart clears demo sessions and retains database records when the database files are preserved.
- The sample event date and prices are illustrative, not a verified event listing.
- Maven builds require an internet connection the first time to download Spring dependencies.

## Troubleshooting

- **The page opens but sign-in does not work:** Start the Spring Boot server and open `http://localhost:8080`; opening `index.html` directly does not provide the API. JavaScript must be enabled.
- **Demo account not found:** Use a matching register number or Net ID from the table above. Leading/trailing spaces and letter case are ignored.
- **The server port is already in use:** Stop the other server or run `PORT=8081 mvn spring-boot:run`, then open `http://localhost:8081`.
- **Maven cannot download dependencies:** Check your internet connection and Maven proxy/repository settings, then retry `mvn clean verify`.

## 📲 QR entry: scan to open student login

QR codes **open the website login page**, but do not log students in automatically. Never encode student IDs, passwords, or session tokens. This is an educational SRM-inspired demo only, not an authorised SRM identity service.

By default, the app generates a local QR for `http://localhost:8080/` so you can try the feature during development. That QR only opens on the computer running the app; a phone cannot use its own `localhost` to reach your computer.

To scan from another device, set `APP_PUBLIC_URL` to an address that device can reach. For deployment, use the real public HTTPS domain; never use `localhost` or a GitHub repository URL as the deployed address.

PowerShell:

```powershell
$env:APP_PUBLIC_URL="https://your-real-deployed-domain.example/"
mvn spring-boot:run
```

Linux/macOS:

```bash
APP_PUBLIC_URL="https://your-real-deployed-domain.example/" mvn spring-boot:run
```

On hosting, configure `APP_PUBLIC_URL` to the **actual** domain and restart the app. The above domain is only a placeholder. If the URL is missing or is a placeholder/sample domain, the QR endpoints return 503 `PUBLIC_URL_NOT_CONFIGURED`.

After deployment visit `/share.html` for a branded, print-ready poster with **Download Full Poster PNG**, **Copy login link**, and **Print poster** controls.

Endpoints:
- `GET /share.html` — public share/print poster page.
- `GET /api/share` — configured login URL metadata.
- `GET /api/share/qr.png` — server-generated 480×480 scannable PNG using ZXing.

If the URL isn't configured or is a placeholder, both API endpoints return 503 `PUBLIC_URL_NOT_CONFIGURED`. The QR image is created locally in Java with no third-party QR web service. Scan-test on a separate phone before distributing.

## Updated SRM Online Education branding

The supplied SRM Online Education (KTR – Chennai) horizontal logo is stored as `src/main/resources/static/assets/srm-online-logo.png` and used in the sign-in hero, sidebar, mobile header, digital pass, and public QR page. It is a user-provided transparent PNG; avoid recreating the seal as text. The older SRM-inspired graphic remains an unused legacy asset. The prototype is not an official SRM authentication service; university branding/public use still requires appropriate organizer permission.

## Auditorium seating plan update (reference-inspired)

The Graduation Day **My Seat** page now uses an interactive bird's-eye-view 52-row (`A-Z`, `AA-ZZ`) teal/blue/purple auditorium **schematic**, a gold highlighted assigned demo seat, a stage/screen label, horizontal/vertical panning, zoom in/out/reset buttons, and a details panel. The supplied [auditorium Google Maps location reference](https://maps.app.goo.gl/oLcbroDsNHGUFbi67?g_st=ic) is linked from this screen. This map link was user-supplied and has not been independently verified for venue identity.

**Critical accuracy limit:** The uploaded seating photo is design inspiration, not a verified seat registry. The existing backend's 7x9 demo seats (`A01-G09`) remain the *only* known records and continue to drive user assignment and sample occupancy. The hundreds of extra colored indicators are deliberately non-interactive schematic markers; color indicates illustration zones **only**, not ticket availability or real occupancy. Replace with an approved seating file and real assigned-seat data before publishing to attendees. No bogus map coordinates or reservation availability are inferred.
