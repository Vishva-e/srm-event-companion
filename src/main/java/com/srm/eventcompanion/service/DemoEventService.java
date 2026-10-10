package com.srm.eventcompanion.service;

import com.srm.eventcompanion.domain.EventModels.*;
import com.srm.eventcompanion.repository.EventRepository;
import com.srm.eventcompanion.repository.EventRepository.StudentAssignment;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

/**
 * H2-backed, explicitly fake demo directory. A real implementation must use the
 * university-approved identity provider and authoritative attendance/seat records.
 * Do not connect this API to a public SRM identity page or accept real credentials.
 */
@Service
public final class DemoEventService {
    private final EventRepository events;

    public DemoEventService(EventRepository events) {
        this.events = events;
    }

    public Student signIn(LoginRequest login) {
        String key = login.studentId().strip().toUpperCase(Locale.ROOT);
        StudentAssignment demo = account(key);
        if (!demo.student().name().equalsIgnoreCase(login.username().strip())) {
            throw new DemoAccessDeniedException();
        }
        return demo.student();
    }

    public SessionResponse sessionFor(String studentId) {
        StudentAssignment account = account(studentId);
        return new SessionResponse(account.student(), passFor(account));
    }

    public EventPass passFor(String studentId) {
        return passFor(account(studentId));
    }

    private EventPass passFor(StudentAssignment a) {
        return new EventPass("SRM INNOVATE 2026", "08 October 2026",
                "Main Auditorium", "A", "01", a.gate(), a.seat(), a.counter());
    }

    public SeatMap seatsFor(String studentId) {
        SeatAssignment mine = account(studentId).seat();
        List<Seat> seats = events.findSeats(mine.code());
        List<String> rows = seats.stream().map(Seat::row).distinct().toList();
        int seatsPerRow = seats.stream().mapToInt(Seat::number).max().orElse(0);
        return new SeatMap("Main Auditorium", seatsPerRow, rows, seats);
    }

    public MenuResponse menuFor(String studentId) {
        FoodCounter counter = account(studentId).counter();
        return new MenuResponse(counter, events.findMenu());
    }

    private StudentAssignment account(String studentId) {
        return events.findAssignment(studentId).orElseThrow(DemoAccessDeniedException::new);
    }

    public static final class DemoAccessDeniedException extends RuntimeException {
        public DemoAccessDeniedException() {
            super("Demo account not found. Use the sample ID and username shown below the login form.");
        }
    }
}
