package com.srm.eventcompanion.api;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.util.Map;

/** Public QR entry: only the configured login URL, no student data or tokens. */
@RestController
@RequestMapping("/api/share")
public final class EventShareController {
    private final String publicUrl;

    public EventShareController(@Value("$" + "{event.public-url:}") String publicUrl) {
        this.publicUrl = publicUrl == null ? "" : publicUrl.strip();
    }

    @GetMapping
    public ResponseEntity<ShareDetails> details() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new ShareDetails(validatedLandingUrl(), "/api/share/qr.png"));
    }

    @GetMapping(value = "/qr.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> qr() throws WriterException, IOException {
        BitMatrix matrix = new QRCodeWriter().encode(
                validatedLandingUrl(), BarcodeFormat.QR_CODE, 480, 480,
                Map.of(EncodeHintType.CHARACTER_SET, "UTF-8",
                       EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H,
                       EncodeHintType.MARGIN, 3));
        ByteArrayOutputStream output = new ByteArrayOutputStream(32768);
        MatrixToImageWriter.writeToStream(matrix, "PNG", output);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .contentType(MediaType.IMAGE_PNG)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"srm-event-login-qr.png\"")
                .body(output.toByteArray());
    }

    @ExceptionHandler(PublicUrlMissingException.class)
    public ResponseEntity<Map<String, String>> missing(PublicUrlMissingException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .cacheControl(CacheControl.noStore())
                .body(Map.of("error", "PUBLIC_URL_NOT_CONFIGURED",
                        "message", "Set APP_PUBLIC_URL to the real deployed website URL, then restart the service."));
    }

    private String validatedLandingUrl() {
        if (publicUrl.isBlank() || publicUrl.length() > 2048) throw new PublicUrlMissingException();
        try {
            URI uri = URI.create(publicUrl);
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("https") && !scheme.equalsIgnoreCase("http"))
                || uri.getHost() == null || uri.getUserInfo() != null
                || uri.getQuery() != null || uri.getFragment() != null
                || (uri.getPath() != null && uri.getPath().contains(".."))) {
                throw new PublicUrlMissingException();
            }
            return publicUrl.endsWith("/") ? publicUrl : publicUrl + "/";
        } catch (IllegalArgumentException ex) {
            throw new PublicUrlMissingException();
        }
    }

    public record ShareDetails(String loginUrl, String qrImagePath) { }
    private static final class PublicUrlMissingException extends RuntimeException { }
}
