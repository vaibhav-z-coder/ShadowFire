package com.trusthire.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trusthire.dto.GoogleAuthRequest;
import com.trusthire.dto.UserResponse;
import com.trusthire.model.UserRecord;
import com.trusthire.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AuthService(UserRepository userRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public UserResponse processGoogleLogin(GoogleAuthRequest request) {
        String email = request.getEmail();
        String name = request.getName();
        String picture = request.getPicture();
        String googleId = request.getGoogleId();

        // If JWT credential is provided, decode payload to extract verified claims
        if (request.getCredential() != null && !request.getCredential().isBlank()) {
            try {
                String[] parts = request.getCredential().split("\\.");
                if (parts.length >= 2) {
                    byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
                    JsonNode claims = objectMapper.readTree(new String(decoded, StandardCharsets.UTF_8));
                    if (claims.has("email")) email = claims.get("email").asText();
                    if (claims.has("name")) name = claims.get("name").asText();
                    if (claims.has("picture")) picture = claims.get("picture").asText();
                    if (claims.has("sub")) googleId = claims.get("sub").asText();
                }
            } catch (Exception e) {
                log.warn("Could not parse JWT credential payload: {}", e.getMessage());
            }
        }

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Valid email is required for authentication");
        }

        Optional<UserRecord> existingUserOpt = userRepository.findByEmail(email);

        UserRecord user;
        Instant now = Instant.now();
        if (existingUserOpt.isPresent()) {
            user = existingUserOpt.get();
            if (name != null && !name.isBlank()) user.setName(name);
            if (picture != null && !picture.isBlank()) user.setPictureUrl(picture);
            user.setLastLoginAt(now);
            log.info("Existing user logged in: {}", email);
        } else {
            String userId = (googleId != null && !googleId.isBlank()) ? googleId : UUID.randomUUID().toString();
            user = new UserRecord(userId, email, name, picture, "GOOGLE");
            user.setCreatedAt(now);
            user.setLastLoginAt(now);
            log.info("New user registered and saved to PostgreSQL: {}", email);
        }

        UserRecord saved = userRepository.save(user);

        return new UserResponse(
                saved.getId(),
                saved.getEmail(),
                saved.getName(),
                saved.getPictureUrl(),
                saved.getProvider(),
                saved.getCreatedAt(),
                saved.getLastLoginAt()
        );
    }
}
