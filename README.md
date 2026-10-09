# SRM Event Companion — Java Spring Boot Website

An **unofficial SRM-inspired student hackathon prototype** recreated from the four-screen Figma concept. The user interface is responsive HTML/CSS/JavaScript; the application backend, session handling, event details, seat map and menu APIs are **Java + Spring Boot 3**.

> **Important:** This is **not** an official SRM University portal. The university-inspired vector emblem is original placeholder artwork, **not** the official SRM logo. Student names, IDs, attendance, seat numbers and menus are fictitious demo data. **Never enter real SRM credentials.** This sample has *no* production authentication or integration with SRM services.

## 📦 Tech stack

- **Backend:** Java 17+, Spring Boot 3.5.6, Spring Web MVC, Jakarta Bean Validation, HTTP session
- **Frontend:** Semantic HTML5, responsive CSS3, vanilla JavaScript (`fetch`, DOM rendering). No Node/npm required.
- **Data:** In-memory demo accounts and event/menu fixtures; no external database
- **Testing:** JUnit 5 + Spring `MockMvc` integration tests
- **Branding:** University-inspired blue `#084298` and heritage gold `#E1B052` from the concept design

## ▶️ Run locally

**Prerequisites:** JDK 17 or newer and Apache Maven 3.9+ (or open `pom.xml` in IntelliJ IDEA and run `EventCompanionApplication`).

```bash
git clone https://github.com/Vishva-e/srm-event-companion.git
cd srm-event-companion
mvn spring-boot:run
```

Open **http://localhost:8080** in your browser. This single Java service hosts the website *and* its API — there is no separate frontend server.

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

### Docker

```bash
docker build -t srm-event-companion .
docker run --rm -p 8080:8080 srm-event-companion
```

## 🛠 Troubleshooting: index.html does not load

**Use the Spring Boot server, not VS Code Live Server**. Open the terminal in the directory containing `pom.xml`:

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
- **Blank UI / assets missing**: Open browser Developer Tools (F12) → Console and Network. Confirm `/app.js`, `/styles.css`, and `/assets/srm-inspired-mark.svg` return HTTP 200. Run `mvn clean spring-boot:run`, then reload with Ctrl+Shift+R.
- **Java build errors**: Run `mvn clean test` and inspect the **first** error. The first build requires internet access to download dependencies.
- **Do not open `index.html` via `file://`**: Login and seat/menu features require `/api/` endpoints on the Spring Boot server.

You can verify the server from a second terminal:

```bash
curl -I http://localhost:8080/
curl -I http://localhost:8080/index.html
curl -I http://localhost:8080/styles.css
curl -I http://localhost:8080/app.js
```

When all four return HTTP 200, try the demo account: `SRM2026001` / `Vishva`.

## 🔑 Demo student accounts

Use **only** these fictional identities. Names must match the corresponding sample ID (case-insensitive). The **Fill demo details** button populates the first account.

| Student ID | Username | Assigned seat | Gate | Food counter |
|---|---|---|---|---|
| `SRM2026001` | `Vishva` | **E07** | 02 | 03 |
| `SRM2026002` | `Sanjana` | **C04** | 01 | 01 |
| `SRM2026003` | `Arun` | **F02** | 03 | 02 |

## ✅ Functional features

1. **Student demo login:** Enter ID and username. Spring Boot validates input and matches it against an in-memory list of fictitious profiles.
2. **Session-backed dashboard:** Server responds with personalised event pass, assigned seat and food counter; refresh restores your server session until it expires after 30 minutes of inactivity.
3. **Cinema-style seating:** Java API serves a 7-row × 9-seat auditorium map. Your seat is **highlighted gold**. Available and occupied seats are visually distinct. **Locate my seat** scrolls/highlights the assigned spot.
4. **Food counters:** Java API serves the assigned food counter and four menu items with prices in INR. Client-side filters and search work across the API data.
5. **Responsive layouts:** Desktop side navigation and mobile bottom navigation.
6. **Log out:** Invalidates the Java HTTP session and returns to sign-in. Protected APIs return 401 without a session.

## 🔌 REST API

Responses with a body are JSON; successful sign-out returns `204 No Content`. Sessions use an HTTP-only, SameSite=Strict browser cookie. `POST /api/session` is public for login; `GET /api/session` and event resources require a demo session. Signing out is safe to repeat even when no session exists.

| HTTP | URL | Function |
|---|---|---|
| `POST` | `/api/session` | Demo sign in with `{ "studentId": "SRM2026001", "username": "Vishva" }` |
| `GET` | `/api/session` | Read current session and event pass |
| `DELETE` | `/api/session` | Sign out |
| `GET` | `/api/event` | Current user's event/seat/counter assignment |
| `GET` | `/api/seats` | Cinema seat map with `YOURS`, `OCCUPIED`, `AVAILABLE` statuses |
| `GET` | `/api/menu` | Assigned food counter details + item/price catalog |

Example:

```bash
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"studentId":"SRM2026001","username":"Vishva"}' \
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

This demo checks *known sample values*, but **ID + username alone are not secure authentication**. A real deployment must have university-approved SSO/OIDC (and permission to use institutional marks), TLS/HTTPS, a persistent user/enrolment database, server-side authorization, CSRF protection, rate limits, audit logging, and verified seat/counter assignments. The demo must never be advertised as an official SRM login site.

## Notes

- CSS uses Google Fonts if reachable, with system-font fallbacks.
- Each server restart clears demo sessions but not hardcoded fixtures.
- The sample event date and prices are illustrative, not a verified event listing.
- Maven builds require an internet connection the first time to download Spring dependencies.

## Troubleshooting

- **The page opens but sign-in does not work:** Start the Spring Boot server and open `http://localhost:8080`; opening `index.html` directly does not provide the API. JavaScript must be enabled.
- **Demo account not found:** Use a matching ID and username from the table above. Leading/trailing spaces and letter case are ignored.
- **The server port is already in use:** Stop the other server or run `PORT=8081 mvn spring-boot:run`, then open `http://localhost:8081`.
- **Maven cannot download dependencies:** Check your internet connection and Maven proxy/repository settings, then retry `mvn clean verify`.

## 📲 QR entry: scan to open student login

QR codes **open the website login page**, but do not log students in automatically. Never encode student IDs, usernames, passwords, or session tokens. This is an educational SRM-inspired demo only, not an authorised SRM identity service.

The default value in `application.properties` is an intentionally non-working sample: `https://srm-event-companion.example/`. The QR endpoints deliberately refuse placeholder/sample and localhost addresses (503), so no invalid QR is shared. Set `APP_PUBLIC_URL` to the real HTTPS deployment URL to enable the QR.

**Important:** `localhost` and GitHub repository URLs are NOT public website links. Deploy this Spring Boot application to a publicly reachable HTTPS domain, then set its external URL using the `APP_PUBLIC_URL` environment variable. Until then the QR page shows a configuration message rather than a misleading QR.

PowerShell:

```powershell
$env:APP_PUBLIC_URL="https://your-real-deployed-domain.example/"
mvn spring-boot:run
```

Linux/macOS:

```bash
APP_PUBLIC_URL="https://your-real-deployed-domain.example/" mvn spring-boot:run
```

On hosting, configure `APP_PUBLIC_URL` to the **actual** domain and restart the app. The above domain is only a placeholder.

After deployment visit `/share.html` for a branded, print-ready poster with **Download PNG**, **Copy login link**, and **Print poster** controls.

Endpoints:
- `GET /share.html` — public share/print poster page.
- `GET /api/share` — configured login URL metadata.
- `GET /api/share/qr.png` — server-generated 480×480 scannable PNG using ZXing.

If the public URL isn't configured, both API endpoints return 503 `PUBLIC_URL_NOT_CONFIGURED`. The QR image is created locally in Java with no third-party QR web service. Scan-test on a separate phone before distributing.
