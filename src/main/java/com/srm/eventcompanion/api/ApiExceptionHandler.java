package com.srm.eventcompanion.api;

import com.srm.eventcompanion.domain.EventModels.ApiError;
import com.srm.eventcompanion.service.DemoEventService.DemoAccessDeniedException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.server.ResponseStatusException;


@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
    @ExceptionHandler(DemoAccessDeniedException.class)
    public ResponseEntity<ApiError> demoAccess(DemoAccessDeniedException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .cacheControl(CacheControl.noStore())
                .body(new ApiError("DEMO_ACCOUNT_NOT_FOUND", exception.getMessage()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> unauthenticated(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .cacheControl(CacheControl.noStore())
                .body(new ApiError("NOT_SIGNED_IN", exception.getReason()));
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception exception, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.putAll(headers);
        responseHeaders.setCacheControl(CacheControl.noStore());
        ApiError error = switch (status.value()) {
            case 400 -> new ApiError("INVALID_INPUT",
                    "Send valid JSON with a student ID (3–32 characters) and username (2–40 characters).");
            case 404 -> new ApiError("NOT_FOUND", "The requested resource was not found.");
            case 405 -> new ApiError("METHOD_NOT_ALLOWED", "This HTTP method is not supported for this resource.");
            case 415 -> new ApiError("UNSUPPORTED_MEDIA_TYPE", "Send login details with Content-Type: application/json.");
            default -> new ApiError("REQUEST_FAILED", "The request could not be completed.");
        };
        return super.handleExceptionInternal(exception, error, responseHeaders, status, request);
    }
}
