package com.srm.eventcompanion;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.awt.image.BufferedImage;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="event.public-url=https://events.example.org/")
@AutoConfigureMockMvc
class EventShareConfiguredTest {
 @Autowired MockMvc mvc;
 @Test void posterAndMetadataArePublic() throws Exception {
  mvc.perform(get("/share.html")).andExpect(status().isOk())
     .andExpect(content().string(org.hamcrest.Matchers.containsString("event-access-qr")));
  mvc.perform(get("/api/share")).andExpect(status().isOk())
     .andExpect(jsonPath("$.loginUrl").value("https://events.example.org/"));
 }
 @Test void imageIsScannableAndContainsOnlyLoginLink() throws Exception {
  byte[] png=mvc.perform(get("/api/share/qr.png")).andExpect(status().isOk())
     .andExpect(content().contentType(MediaType.IMAGE_PNG))
     .andReturn().getResponse().getContentAsByteArray();
  BufferedImage image=ImageIO.read(new ByteArrayInputStream(png));
  assertNotNull(image);assertEquals(480,image.getWidth());
  int[] pixels=image.getRGB(0,0,image.getWidth(),image.getHeight(),null,0,image.getWidth());
  String value=new MultiFormatReader().decode(new BinaryBitmap(new HybridBinarizer(
      new RGBLuminanceSource(image.getWidth(),image.getHeight(),pixels)))).getText();
  assertEquals("https://events.example.org/",value);
  assertFalse(value.contains("SRM2026001"));
 }
}
