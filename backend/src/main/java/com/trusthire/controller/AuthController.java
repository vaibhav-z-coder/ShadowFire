package com.trusthire.controller;

import com.trusthire.dto.GoogleAuthRequest;
import com.trusthire.dto.UserResponse;
import com.trusthire.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/google")
    public ResponseEntity<UserResponse> authenticateWithGoogle(@RequestBody GoogleAuthRequest request) {
        UserResponse user = authService.processGoogleLogin(request);
        return ResponseEntity.ok(user);
    }
}
