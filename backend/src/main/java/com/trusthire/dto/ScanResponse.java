package com.trusthire.dto;

import java.time.Instant;
import java.util.List;

public class ScanResponse {
    private String id;
    private int score;
    private String band;
    private String confidence;
    private List<CheckResult> checks;
    private List<CheckResult> redFlags;
    private List<CheckResult> positives;
    private OfferDetailsDto details;
    private String text;
    private Instant createdAt;

    public ScanResponse() {}

    public ScanResponse(String id, int score, String band, String confidence,
                        List<CheckResult> checks, List<CheckResult> redFlags, List<CheckResult> positives,
                        OfferDetailsDto details, String text, Instant createdAt) {
        this.id = id;
        this.score = score;
        this.band = band;
        this.confidence = confidence;
        this.checks = checks;
        this.redFlags = redFlags;
        this.positives = positives;
        this.details = details;
        this.text = text;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public String getBand() {
        return band;
    }

    public void setBand(String band) {
        this.band = band;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }

    public List<CheckResult> getChecks() {
        return checks;
    }

    public void setChecks(List<CheckResult> checks) {
        this.checks = checks;
    }

    public List<CheckResult> getRedFlags() {
        return redFlags;
    }

    public void setRedFlags(List<CheckResult> redFlags) {
        this.redFlags = redFlags;
    }

    public List<CheckResult> getPositives() {
        return positives;
    }

    public void setPositives(List<CheckResult> positives) {
        this.positives = positives;
    }

    public OfferDetailsDto getDetails() {
        return details;
    }

    public void setDetails(OfferDetailsDto details) {
        this.details = details;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
