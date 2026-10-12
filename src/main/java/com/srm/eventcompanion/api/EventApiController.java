package com.srm.eventcompanion.api;

import com.srm.eventcompanion.domain.EventModels.*;
import com.srm.eventcompanion.service.DemoEventService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api")
public final class EventApiController {
    private static final String SESSION_KEY = "demoStudentId";
    private final DemoEventService demo;

    public EventApiController(DemoEventService demo) {
        this.demo = demo;
    }

    @PostMapping("/session")
    public ResponseEntity<SessionResponse> login(@Valid @RequestBody LoginRequest request,
                                                 HttpServletRequest http) {
        Student student = demo.signIn(request);
        HttpSession oldSession = http.getSession(false);
        if (oldSession != null) oldSession.invalidate();
        HttpSession session = http.getSession(true);
        session.setAttribute(SESSION_KEY, student.id());
        session.setMaxInactiveInterval(60 * 30);
        return noStore(demo.sessionFor(student.id()));
    }

    @GetMapping("/session")
    public ResponseEntity<SessionResponse> whoAmI(HttpServletRequest request) {
        return noStore(demo.sessionFor(requireUser(request)));
    }

    @DeleteMapping("/session")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @GetMapping("/event")
    public ResponseEntity<EventPass> event(HttpServletRequest request) {
        return noStore(demo.passFor(requireUser(request)));
    }

    @GetMapping("/seats")
    public ResponseEntity<SeatMap> seats(HttpServletRequest request) {
        return noStore(demo.seatsFor(requireUser(request)));
    }

    @GetMapping("/menu")
    public ResponseEntity<MenuResponse> menu(HttpServletRequest request) {
        return noStore(demo.menuFor(requireUser(request)));
    }

    @GetMapping("/attendees")
    public ResponseEntity<AttendeeDetails> attendees(HttpServletRequest request) {
        String studentId = requireUser(request);
        HttpSession session = request.getSession(false);
        int count = session.getAttribute("accompanyingMembers") instanceof Integer n ? n : 0;
        return noStore(new AttendeeDetails(count, count + 1,
                demo.passFor(studentId).registrationCounter().number()));
    }

    @PutMapping("/attendees")
    public ResponseEntity<AttendeeDetails> updateAttendees(
            @Valid @RequestBody AttendeeUpdateRequest update, HttpServletRequest request) {
        String studentId = requireUser(request);
        HttpSession session = request.getSession(false);
        int count = update.accompanyingMembers();
        session.setAttribute("accompanyingMembers", count);
        return noStore(new AttendeeDetails(count, count + 1,
                demo.passFor(studentId).registrationCounter().number()));
    }

    /** Session-only document interest request: not submitted to an SRM university service. */
    @GetMapping("/documents")
    public ResponseEntity<DocumentRequestDetails> documentRequest(HttpServletRequest request) {
        requireUser(request);
        HttpSession session = request.getSession(false);
        String type = session.getAttribute("demoDocumentType") instanceof String text ? text : "";
        return noStore(new DocumentRequestDetails(type, type.isEmpty() ? "NOT_REQUESTED" : "DEMO_SAVED"));
    }

    @PostMapping("/documents")
    public ResponseEntity<DocumentRequestDetails> saveDocumentRequest(
            @Valid @RequestBody DocumentRequestInput input, HttpServletRequest request) {
        requireUser(request);
        HttpSession session = request.getSession(false);
        session.setAttribute("demoDocumentType", input.type());
        return noStore(new DocumentRequestDetails(input.type(), "DEMO_SAVED"));
    }

    public record DocumentRequestInput(
            @jakarta.validation.constraints.NotBlank
            @jakarta.validation.constraints.Pattern(regexp = "EVENT_PASS|GRADUATION_CERTIFICATE|OTHER")
            String type) { }
    public record DocumentRequestDetails(String type, String status) { }

    private String requireUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object value = session == null ? null : session.getAttribute(SESSION_KEY);
        if (!(value instanceof String studentId)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Sign in with a demo account first.");
        }
        return studentId;
    }

    private static <T> ResponseEntity<T> noStore(T value) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);
    }
}
