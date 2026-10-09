package com.srm.eventcompanion;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="event.public-url=")
@AutoConfigureMockMvc
class EventShareUnconfiguredTest {
 @Autowired MockMvc mvc;
 @Test void noPublicUrlMeansNoMisleadingQrCode() throws Exception {
   mvc.perform(get("/api/share")).andExpect(status().isServiceUnavailable())
      .andExpect(jsonPath("$.error").value("PUBLIC_URL_NOT_CONFIGURED"));
   mvc.perform(get("/api/share/qr.png")).andExpect(status().isServiceUnavailable());
 }
}
