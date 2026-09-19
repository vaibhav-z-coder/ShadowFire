package com.trusthire.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class UserRecord {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "full_name")
    private String name;

    @Column(name = "picture_url", length = 1024)
    private String pictureUrl;

    @Column(length = 50)
    private String provider = "GOOGLE";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_login_at", nullable = false)
    private Instant lastLoginAt;

    public UserRecord() {}

    public UserRecord(String id, String email, String name, String pictureUrl, String provider) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.pictureUrl = pictureUrl;
        this.provider = provider;
        this.createdAt = Instant.now();
        this.lastLoginAt = Instant.now();
    }

    @PrePersist
    public void onPrePersist() {
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.lastLoginAt == null) {
            this.lastLoginAt = now;
        }
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPictureUrl() {
        return pictureUrl;
    }

    public void setPictureUrl(String pictureUrl) {
        this.pictureUrl = pictureUrl;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
}
