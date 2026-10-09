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
cd srm-event-companion-java
mvn spring-boot:run
```

Open **http://localhost:8080** in your browser. This single Java service hosts the website *and* its API — there is no separate frontend server.

Tests:

```bash
mvn test
```

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

## 🔑 Demo student accounts

Use **only** these fictional identities. Names must match the corresponding sample ID (case-insensitive). The **Fill demo details** button populates the first account.

| Student ID | Username | Assigned seat | Gate | Food counter |
|---|---|---|---|---|
| `SRM2026001` | `Vishva` | **E07** | 02 | 03 |
| `SRM2026002` | `Sanjana` | **C04** | 01 | 01 |
| `SRM2026003` | `Arun` | **F02** | 03 | 02 |

## ✅ Functional features

1. **Student demo login:** Enter ID and username. Spring Boot validates input and matches it against an in-memory list of fictitious profiles.
2. **Session-backed dashboard:** Server responds with personalised event pass, assigned seat and food counter; refresh retains your server session for 30 minutes.
3. **Cinema-style seating:** Java API serves a 7-row × 9-seat auditorium map. Your seat is **highlighted gold**. Available and occupied seats are visually distinct. **Locate my seat** scrolls/highlights the assigned spot.
4. **Food counters:** Java API serves the assigned food counter and four menu items with prices in INR. Client-side filters and search work across the API data.
5. **Responsive layouts:** Desktop side navigation and mobile bottom navigation.
6. **Log out:** Invalidates the Java HTTP session and returns to sign-in. Protected APIs return 401 without a session.

## 🔌 REST API

All responses are JSON; session uses an HTTP-only browser cookie. `/api/session` is public for login; event resources require a demo session.

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

## 🗂️ Project structure

```text
srm-event-companion-java/
├── pom.xml
├── Dockerfile
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
