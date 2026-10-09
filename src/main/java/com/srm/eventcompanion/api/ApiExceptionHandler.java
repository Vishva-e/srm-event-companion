package com.srm.eventcompanion.api;

import com.srm.eventcompanion.domain.EventModels.ApiError;
import com.srm.eventcompanion.service.DemoEventService.DemoAccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;


@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(DemoAccessDeniedException.class)
    public ResponseEntity<ApiError> demoAccess(DemoAccessDeniedException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiError("DEMO_ACCOUNT_NOT_FOUND", exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> invalidInput(MethodArgumentNotValidException exception) {
        return ResponseEntity.badRequest().body(new ApiError("INVALID_INPUT",
                "Enter a student ID (3–32 characters) and username (2–40 characters)."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> unauthenticated(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(new ApiError("NOT_SIGNED_IN", exception.getReason()));
    }
}
