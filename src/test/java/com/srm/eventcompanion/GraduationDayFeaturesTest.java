package com.srm.eventcompanion;

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
class GraduationDayFeaturesTest {
    @Autowired MockMvc mvc;

    private MockHttpSession signIn(String id) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/session")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"studentId\":\"" + id + "\",\"username\":\"Vishva\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.event.name").value("SRM GRADUATION DAY"))
                .andExpect(jsonPath("$.event.registrationCounter.number").value("03"))
                .andReturn().getRequest().getSession(false);
    }

    @Test void supportsRegisterNumberOrDemoNetId() throws Exception {
        signIn("SRM2026001");
        signIn("vishva.demo");
    }

    @Test void attendeeCountsAreValidatedAndScopedToSession() throws Exception {
        mvc.perform(get("/api/attendees")).andExpect(status().isUnauthorized());
        MockHttpSession session = signIn("SRM2026001");
        mvc.perform(get("/api/attendees").session(session))
                .andExpect(jsonPath("$.accompanyingMembers").value(0))
                .andExpect(jsonPath("$.totalAttendees").value(1));
        mvc.perform(put("/api/attendees").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"accompanyingMembers\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAttendees").value(4));
        mvc.perform(get("/api/attendees").session(session))
                .andExpect(jsonPath("$.accompanyingMembers").value(3));
        mvc.perform(put("/api/attendees").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\"accompanyingMembers\":11}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/attendees").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/session").session(session)).andExpect(status().isNoContent());
        MockHttpSession another = signIn("SRM2026001");
        mvc.perform(get("/api/attendees").session(another))
                .andExpect(jsonPath("$.accompanyingMembers").value(0));
    }

    @Test void documentRequestsAreSessionOnly() throws Exception {
        mvc.perform(get("/api/documents")).andExpect(status().isUnauthorized());
        MockHttpSession session = signIn("SRM2026001");
        mvc.perform(post("/api/documents").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\\"type\\":\\"GRADUATION_CERTIFICATE\\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DEMO_SAVED"));
        mvc.perform(get("/api/documents").session(session))
                .andExpect(jsonPath("$.type").value("GRADUATION_CERTIFICATE"));
        mvc.perform(post("/api/documents").session(session).contentType(MediaType.APPLICATION_JSON)
                .content("{\\"type\\":\\"INVALID\\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void campusGuideAndDietFiltersExist() throws Exception {
        mvc.perform(get("/index.html")).andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("view-campus")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("data-filter=\"nonveg\"")));
    }
}
