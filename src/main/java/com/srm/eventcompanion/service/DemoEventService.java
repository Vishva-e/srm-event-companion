package com.srm.eventcompanion.service;

import com.srm.eventcompanion.domain.EventModels.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * In-memory, explicitly fake demo directory. A real implementation must use the
 * university-approved identity provider and authoritative attendance/seat records.
 * Do not connect this API to a public SRM identity page or accept real credentials.
 */
@Service
public final class DemoEventService {
    private record DemoAccount(Student student, SeatAssignment seat, String gate, FoodCounter counter) { }

    private final Map<String, DemoAccount> demoAccounts = Map.of(
            "SRM2026001", new DemoAccount(new Student("SRM2026001", "Vishva"),
                    new SeatAssignment("E", 7, "E07"), "02",
                    new FoodCounter("03", "Ground Floor", "Zone B", "02")),
            "SRM2026002", new DemoAccount(new Student("SRM2026002", "Sanjana"),
                    new SeatAssignment("C", 4, "C04"), "01",
                    new FoodCounter("01", "Ground Floor", "Zone A", "01")),
            "SRM2026003", new DemoAccount(new Student("SRM2026003", "Arun"),
                    new SeatAssignment("F", 2, "F02"), "03",
                    new FoodCounter("02", "First Floor", "Zone C", "03"))
    );

    private static final Set<String> OCCUPIED = Set.of(
            "A02", "A08", "B06", "B07", "C01", "C03", "D05", "D08", "E01",
            "F04", "F09", "G02", "G06", "C04", "F02", "E07"
    );

    public Student signIn(LoginRequest login) {
        String key = login.studentId().strip().toUpperCase(Locale.ROOT);
        DemoAccount demo = demoAccounts.get(key);
        if (demo == null || !demo.student().name().equalsIgnoreCase(login.username().strip())) {
            throw new DemoAccessDeniedException();
        }
        return demo.student();
    }

    public SessionResponse sessionFor(String studentId) {
        DemoAccount account = demoAccounts.get(studentId);
        if (account == null) throw new DemoAccessDeniedException();
        return new SessionResponse(account.student(), passFor(studentId));
    }

    public EventPass passFor(String studentId) {
        DemoAccount a = account(studentId);
        return new EventPass("SRM INNOVATE 2026", "08 October 2026",
                "Main Auditorium", "A", "01", a.gate(), a.seat(), a.counter());
    }

    public SeatMap seatsFor(String studentId) {
        SeatAssignment mine = account(studentId).seat();
        List<String> rows = List.of("A", "B", "C", "D", "E", "F", "G");
        List<Seat> seats = new ArrayList<>();
        for (String row : rows) {
            for (int num = 1; num <= 9; num++) {
                String code = row + String.format(Locale.ROOT, "%02d", num);
                String status = code.equals(mine.code()) ? "YOURS" :
                        OCCUPIED.contains(code) ? "OCCUPIED" : "AVAILABLE";
                seats.add(new Seat(row, num, code, status));
            }
        }
        return new SeatMap("Main Auditorium", 9, rows, List.copyOf(seats));
    }

    public MenuResponse menuFor(String studentId) {
        FoodCounter counter = account(studentId).counter();
        List<MenuItem> menu = List.of(
                new MenuItem("veg-meals", "Veg meals", "Rice, sambar & traditional sides",
                        "meals", "VEGETARIAN · MEALS", "VEG", "veg", 120),
                new MenuItem("chicken-rice", "Chicken rice", "Spiced rice & chicken",
                        "meals", "NON-VEGETARIAN · MEALS", "NON-VEG", "nonveg", 150),
                new MenuItem("paneer-wrap", "Paneer wrap", "Fresh grilled wrap",
                        "snacks", "VEGETARIAN · SNACKS", "SNACK", "snack", 90),
                new MenuItem("lime-juice", "Fresh lime juice", "Chilled refreshment",
                        "drinks", "COLD BEVERAGE · DRINKS", "DRINK", "drink", 50)
        );
        return new MenuResponse(counter, menu);
    }

    private DemoAccount account(String studentId) {
        DemoAccount account = demoAccounts.get(studentId);
        if (account == null) throw new DemoAccessDeniedException();
        return account;
    }

    public static final class DemoAccessDeniedException extends RuntimeException {
        public DemoAccessDeniedException() {
            super("Demo account not found. Use the sample ID and username shown below the login form.");
        }
    }
}
