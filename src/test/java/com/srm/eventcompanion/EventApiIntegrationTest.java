package com.srm.eventcompanion;

import jakarta.servlet.http.HttpSession;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class EventApiIntegrationTest {
    @Autowired MockMvc mvc;

    @Test
    void servesHomepage() throws Exception {
        mvc.perform(get("/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("SRM Event Companion")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/session", "/api/event", "/api/seats", "/api/menu"})
    void rejectsUnauthenticatedApiCallsWithoutCreatingSession(String path) throws Exception {
        var result = mvc.perform(get(path))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.error").value("NOT_SIGNED_IN"))
                .andReturn();
        assertNull(result.getRequest().getSession(false));
    }

    @Test
    void rejectsUnknownDemoAccount() throws Exception {
        mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"12345\",\"username\":\"Unknown\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.error").value("DEMO_ACCOUNT_NOT_FOUND"));
    }

    @ParameterizedTest
    @MethodSource("invalidLoginBodies")
    void rejectsMalformedOrInvalidLoginWithJsonError(String body) throws Exception {
        var result = mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.error").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andReturn();
        assertNull(result.getRequest().getSession(false));
    }

    static Stream<String> invalidLoginBodies() {
        return Stream.of("", "{", "null", "[]", "{}",
                "{\"studentId\":{},\"username\":\"Vishva\"}",
                "{\"studentId\":\"SRM2026001\"}",
                "{\"studentId\":\"   \",\"username\":\"  \"}",
                "{\"studentId\":\"SRM2026001\",\"username\":\"V\"}",
                "{\"studentId\":\"" + "A".repeat(33) + "\",\"username\":\"Vishva\"}",
                "{\"studentId\":\"SRM2026001\",\"username\":\"" + "A".repeat(41) + "\"}");
    }

    @Test
    void frameworkErrorsUseJsonAndRetainHttpHeaders() throws Exception {
        mvc.perform(post("/api/session").contentType(MediaType.TEXT_PLAIN).content("demo"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.error").value("UNSUPPORTED_MEDIA_TYPE"))
                .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(put("/api/session"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.error").value("METHOD_NOT_ALLOWED"))
                .andExpect(header().string("Allow", containsString("POST")))
                .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get("/api/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    void loginExposesAssignedSeatCounterAndMenuThenLogout() throws Exception {
        HttpSession session = mvc.perform(post("/api/session")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"SRM2026001\",\"username\":\"Vishva\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.student.name").value("Vishva"))
                .andExpect(jsonPath("$.event.seat.code").value("E07"))
                .andExpect(jsonPath("$.event.foodCounter.number").value("03"))
                .andReturn().getRequest().getSession(false);

        MockHttpSession testSession = (MockHttpSession) session;
        mvc.perform(get("/api/session").session(testSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student.id").value("SRM2026001"));
        mvc.perform(get("/api/event").session(testSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seat.code").value("E07"));
        mvc.perform(get("/api/seats").session(testSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seats.length()").value(63))
                .andExpect(jsonPath("$.seats[42].status").value("YOURS"));
        mvc.perform(get("/api/menu").session(testSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counter.number").value("03"))
                .andExpect(jsonPath("$.items.length()").value(4));
        mvc.perform(delete("/api/session").session(testSession))
                .andExpect(status().isNoContent());
        assertThrows(IllegalStateException.class, () -> testSession.getAttribute("demoStudentId"));
        mvc.perform(get("/api/session"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/session"))
                .andExpect(status().isNoContent());
    }

    @ParameterizedTest
    @CsvSource({"SRM2026002,Sanjana,C04,01,01", "SRM2026003,Arun,F02,03,02"})
    void studentsReceiveTheirOwnAssignments(String id, String name, String seat, String gate, String counter)
            throws Exception {
        mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"" + id + "\",\"username\":\"" + name + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.event.seat.code").value(seat))
                .andExpect(jsonPath("$.event.entryGate").value(gate))
                .andExpect(jsonPath("$.event.foodCounter.number").value(counter));
    }

    @Test
    void signInNormalizesDemoDetailsAndReplacesAnExistingSession() throws Exception {
        MockHttpSession oldSession = new MockHttpSession();
        oldSession.setAttribute("unrelated", "old session data");
        var result = mvc.perform(post("/api/session").session(oldSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\" srm2026001 \",\"username\":\" vIsHvA \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student.id").value("SRM2026001"))
                .andExpect(jsonPath("$.student.name").value("Vishva"))
                .andReturn();
        HttpSession newSession = result.getRequest().getSession(false);
        assertNotNull(newSession);
        assertNotEquals(oldSession.getId(), newSession.getId());
        assertTrue(oldSession.isInvalid());
        assertNull(newSession.getAttribute("unrelated"));
        assertEquals(30 * 60, newSession.getMaxInactiveInterval());
    }
}
