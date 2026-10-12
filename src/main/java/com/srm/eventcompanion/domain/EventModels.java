package com.srm.eventcompanion.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Only illustrative test records. None represents an SRM student information system. */
public final class EventModels {
    private EventModels() { }

    public record LoginRequest(
            @NotBlank @Size(min = 3, max = 32) String studentId,
            @NotBlank @Size(min = 2, max = 40) String username) { }

    public record Student(String id, String name, String netId) { }
    public record AttendeeUpdateRequest(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Min(0) @jakarta.validation.constraints.Max(10) Integer accompanyingMembers) { }
    public record AttendeeDetails(int accompanyingMembers, int totalAttendees, String registrationCounter) { }
    public record RegistrationCounter(String number, String floor, String zone) { }
    public record SeatAssignment(String row, int number, String code) { }
    public record FoodCounter(String number, String floor, String zone, String nearGate) { }

    public record EventPass(
            String name,
            String date,
            String venue,
            String block,
            String level,
            String entryGate,
            SeatAssignment seat,
            FoodCounter foodCounter,
            RegistrationCounter registrationCounter) { }

    public record SessionResponse(Student student, EventPass event) { }

    /** status is one of YOURS, OCCUPIED, AVAILABLE. */
    public record Seat(String row, int number, String code, String status) { }
    public record SeatMap(String venue, int seatsPerRow, List<String> rows, List<Seat> seats) { }

    public record MenuItem(
            String id,
            String name,
            String description,
            String category,
            String dietLabel,
            String badge,
            String artStyle,
            int priceInr) { }

    public record MenuResponse(FoodCounter counter, List<MenuItem> items) { }
    public record ApiError(String error, String message) { }
}
