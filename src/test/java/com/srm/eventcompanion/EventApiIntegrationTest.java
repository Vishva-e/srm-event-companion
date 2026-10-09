package com.srm.eventcompanion;

import jakarta.servlet.http.HttpSession;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

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

    @Test
    void rejectsUnauthenticatedApiCalls() throws Exception {
        mvc.perform(get("/api/event")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/menu")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsUnknownDemoAccount() throws Exception {
        mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"12345\",\"username\":\"Unknown\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("DEMO_ACCOUNT_NOT_FOUND"));
    }

    @Test
    void loginExposesAssignedSeatCounterAndMenuThenLogout() throws Exception {
        HttpSession session = mvc.perform(post("/api/session")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"SRM2026001\",\"username\":\"Vishva\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.student.name").value("Vishva"))
                .andExpect(jsonPath("$.event.seat.code").value("E07"))
                .andExpect(jsonPath("$.event.foodCounter.number").value("03"))
                .andReturn().getRequest().getSession(false);

        MockHttpSession testSession = (MockHttpSession) session;
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
    }

    @Test
    void secondStudentReceivesDistinctSeatAndCounter() throws Exception {
        mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"SRM2026002\",\"username\":\"Sanjana\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.event.seat.code").value("C04"))
                .andExpect(jsonPath("$.event.foodCounter.number").value("01"));
    }
}
