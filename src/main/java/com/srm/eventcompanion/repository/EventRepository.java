package com.srm.eventcompanion.repository;

import com.srm.eventcompanion.domain.EventModels.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class EventRepository {
    public record StudentAssignment(Student student, SeatAssignment seat, String gate, FoodCounter counter) { }

    private final JdbcTemplate jdbc;

    public EventRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<StudentAssignment> findAssignment(String studentId) {
        return jdbc.query("""
                SELECT student.student_id, student.student_name, student.entry_gate,
                       seat.row_label, seat.seat_number, seat.seat_code,
                       counter.counter_number, counter.floor, counter.zone, counter.near_gate
                FROM students student
                JOIN seats seat ON seat.seat_code = student.seat_code
                JOIN food_counters counter ON counter.counter_number = student.counter_number
                WHERE student.student_id = ?
                """, (rs, rowNum) -> new StudentAssignment(
                new Student(rs.getString("student_id"), rs.getString("student_name")),
                new SeatAssignment(rs.getString("row_label"), rs.getInt("seat_number"), rs.getString("seat_code")),
                rs.getString("entry_gate"),
                new FoodCounter(rs.getString("counter_number"), rs.getString("floor"),
                        rs.getString("zone"), rs.getString("near_gate"))), studentId).stream().findFirst();
    }

    public List<Seat> findSeats(String assignedSeat) {
        return jdbc.query("""
                SELECT seat.row_label, seat.seat_number, seat.seat_code,
                       CASE WHEN seat.seat_code = ? THEN 'YOURS'
                            WHEN seat.occupied OR EXISTS (
                                SELECT 1 FROM students student WHERE student.seat_code = seat.seat_code
                            ) THEN 'OCCUPIED'
                            ELSE 'AVAILABLE' END AS seat_status
                FROM seats seat
                ORDER BY seat.row_label, seat.seat_number
                """, (rs, rowNum) -> new Seat(rs.getString("row_label"), rs.getInt("seat_number"),
                rs.getString("seat_code"), rs.getString("seat_status")), assignedSeat);
    }

    public List<MenuItem> findMenu() {
        return jdbc.query("""
                SELECT item_id, name, description, category, diet_label, badge, art_style, price_inr
                FROM menu_items
                ORDER BY display_order, item_id
                """, (rs, rowNum) -> new MenuItem(rs.getString("item_id"), rs.getString("name"),
                rs.getString("description"), rs.getString("category"), rs.getString("diet_label"),
                rs.getString("badge"), rs.getString("art_style"), rs.getInt("price_inr")));
    }
}
