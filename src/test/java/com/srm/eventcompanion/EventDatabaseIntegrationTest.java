package com.srm.eventcompanion;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.contains;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EventDatabaseIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    @Test
    void existingSessionAndNewSignInReadUpdatedStudentSeatAndCounter() throws Exception {
        MockHttpSession session = signIn("Vishva");
        jdbc.update("""
                UPDATE students
                SET student_name = ?, seat_code = ?, entry_gate = ?, counter_number = ?
                WHERE student_id = ?
                """, "Vishva Updated", "A01", "04", "01", "SRM2026001");
        jdbc.update("UPDATE food_counters SET zone = ?, near_gate = ? WHERE counter_number = ?",
                "Updated Zone", "04", "01");

        mvc.perform(get("/api/session").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student.name").value("Vishva Updated"));
        mvc.perform(get("/api/event").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seat.code").value("A01"))
                .andExpect(jsonPath("$.seat.row").value("A"))
                .andExpect(jsonPath("$.seat.number").value(1))
                .andExpect(jsonPath("$.entryGate").value("04"))
                .andExpect(jsonPath("$.foodCounter.number").value("01"))
                .andExpect(jsonPath("$.foodCounter.zone").value("Updated Zone"))
                .andExpect(jsonPath("$.foodCounter.nearGate").value("04"));
        mvc.perform(get("/api/seats").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seats[?(@.code == 'A01')].status", contains("YOURS")))
                .andExpect(jsonPath("$.seats[?(@.code == 'E07')].status", contains("AVAILABLE")))
                .andExpect(jsonPath("$.seats[?(@.code == 'C04')].status", contains("OCCUPIED")))
                .andExpect(jsonPath("$.seats[?(@.code == 'A02')].status", contains("OCCUPIED")));
        mvc.perform(get("/api/menu").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counter.number").value("01"))
                .andExpect(jsonPath("$.counter.zone").value("Updated Zone"));

        mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"SRM2026001\",\"username\":\"Vishva\"}"))
                .andExpect(status().isUnauthorized());
        signIn("Vishva Updated");
    }

    @Test
    void menuReadsDatabaseValuesAndDisplayOrder() throws Exception {
        MockHttpSession session = signIn("Vishva");
        jdbc.update("""
                UPDATE menu_items SET name = ?, price_inr = ?, display_order = ?
                WHERE item_id = ?
                """, "Fresh lemon cooler", 65, -1, "lime-juice");

        mvc.perform(get("/api/menu").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(4))
                .andExpect(jsonPath("$.items[0].id").value("lime-juice"))
                .andExpect(jsonPath("$.items[0].name").value("Fresh lemon cooler"))
                .andExpect(jsonPath("$.items[0].priceInr").value(65));
    }

    @Test
    void assignmentsRequireExistingSeatAndCounterAndCannotReuseAnotherStudentsSeat() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "UPDATE students SET seat_code = ? WHERE student_id = ?", "Z99", "SRM2026001"));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "UPDATE students SET counter_number = ? WHERE student_id = ?", "99", "SRM2026001"));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "UPDATE students SET seat_code = ? WHERE student_id = ?", "C04", "SRM2026001"));

        assertEquals("E07", jdbc.queryForObject(
                "SELECT seat_code FROM students WHERE student_id = ?", String.class, "SRM2026001"));
        assertEquals("03", jdbc.queryForObject(
                "SELECT counter_number FROM students WHERE student_id = ?", String.class, "SRM2026001"));
    }

    @Test
    void rerunningSeedScriptPreservesExistingRecordsWithoutDuplicatingThem() {
        jdbc.update("UPDATE students SET student_name = ?, seat_code = ? WHERE student_id = ?",
                "Edited Student", "A01", "SRM2026001");
        jdbc.update("UPDATE food_counters SET zone = ? WHERE counter_number = ?", "Edited Zone", "03");
        jdbc.update("UPDATE seats SET occupied = ? WHERE seat_code = ?", false, "A02");
        jdbc.update("UPDATE menu_items SET price_inr = ? WHERE item_id = ?", 175, "veg-meals");

        jdbc.execute((ConnectionCallback<Void>) connection -> {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("data.sql"));
            return null;
        });

        assertEquals("Edited Student", jdbc.queryForObject(
                "SELECT student_name FROM students WHERE student_id = ?", String.class, "SRM2026001"));
        assertEquals("A01", jdbc.queryForObject(
                "SELECT seat_code FROM students WHERE student_id = ?", String.class, "SRM2026001"));
        assertEquals("Edited Zone", jdbc.queryForObject(
                "SELECT zone FROM food_counters WHERE counter_number = ?", String.class, "03"));
        assertFalse(jdbc.queryForObject("SELECT occupied FROM seats WHERE seat_code = ?", Boolean.class, "A02"));
        assertEquals(175, jdbc.queryForObject(
                "SELECT price_inr FROM menu_items WHERE item_id = ?", Integer.class, "veg-meals"));
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM students", Integer.class));
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM food_counters", Integer.class));
        assertEquals(63, jdbc.queryForObject("SELECT COUNT(*) FROM seats", Integer.class));
        assertEquals(4, jdbc.queryForObject("SELECT COUNT(*) FROM menu_items", Integer.class));
    }

    @Test
    void rerunningSeedScriptPreservesRenamedKeysWithoutReusingSeats() {
        jdbc.update("UPDATE seats SET seat_code = ? WHERE seat_code = ?", "A1", "A01");
        jdbc.update("UPDATE students SET student_id = ? WHERE student_id = ?",
                "SRM2026099", "SRM2026001");

        jdbc.execute((ConnectionCallback<Void>) connection -> {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("data.sql"));
            return null;
        });

        assertEquals("A1", jdbc.queryForObject(
                "SELECT seat_code FROM seats WHERE row_label = ? AND seat_number = ?", String.class, "A", 1));
        assertEquals("SRM2026099", jdbc.queryForObject(
                "SELECT student_id FROM students WHERE seat_code = ?", String.class, "E07"));
        assertEquals(0, jdbc.queryForObject(
                "SELECT COUNT(*) FROM students WHERE student_id = ?", Integer.class, "SRM2026001"));
        assertEquals(0, jdbc.queryForObject(
                "SELECT COUNT(*) FROM seats WHERE seat_code = ?", Integer.class, "A01"));
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM students", Integer.class));
        assertEquals(63, jdbc.queryForObject("SELECT COUNT(*) FROM seats", Integer.class));
    }

    private MockHttpSession signIn(String name) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"SRM2026001\",\"username\":\"" + name + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student.name").value(name))
                .andReturn().getRequest().getSession(false);
    }
}
