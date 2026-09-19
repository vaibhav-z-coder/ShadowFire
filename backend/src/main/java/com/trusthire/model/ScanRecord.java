package com.trusthire.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "scans")
public class ScanRecord {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "company")
    private String company;

    @Column(name = "role_name")
    private String role;

    @Column(name = "salary")
    private String salary;

    @Column(name = "recruiter_email")
    private String recruiterEmail;

    @Column(name = "company_website")
    private String companyWebsite;

    @Column(name = "interview_channel")
    private String interviewChannel;

    @Column(nullable = false)
    private int score;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private RiskBand band;

    @Column(length = 20)
    private String confidence;

    @Lob
    @Column(name = "offer_text", columnDefinition = "TEXT")
    private String offerText;

    @Lob
    @Column(name = "checks_json", columnDefinition = "TEXT")
    private String checksJson;

    @Lob
    @Column(name = "red_flags_json", columnDefinition = "TEXT")
    private String redFlagsJson;

    @Lob
    @Column(name = "positives_json", columnDefinition = "TEXT")
    private String positivesJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public ScanRecord() {}

    @PrePersist
    public void onPrePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCompany() {
        return company;
    }

    public void setCompany(String company) {
        this.company = company;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getSalary() {
        return salary;
    }

    public void setSalary(String salary) {
        this.salary = salary;
    }

    public String getRecruiterEmail() {
        return recruiterEmail;
    }

    public void setRecruiterEmail(String recruiterEmail) {
        this.recruiterEmail = recruiterEmail;
    }

    public String getCompanyWebsite() {
        return companyWebsite;
    }

    public void setCompanyWebsite(String companyWebsite) {
        this.companyWebsite = companyWebsite;
    }

    public String getInterviewChannel() {
        return interviewChannel;
    }

    public void setInterviewChannel(String interviewChannel) {
        this.interviewChannel = interviewChannel;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public RiskBand getBand() {
        return band;
    }

    public void setBand(RiskBand band) {
        this.band = band;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }

    public String getOfferText() {
        return offerText;
    }

    public void setOfferText(String offerText) {
        this.offerText = offerText;
    }

    public String getChecksJson() {
        return checksJson;
    }

    public void setChecksJson(String checksJson) {
        this.checksJson = checksJson;
    }

    public String getRedFlagsJson() {
        return redFlagsJson;
    }

    public void setRedFlagsJson(String redFlagsJson) {
        this.redFlagsJson = redFlagsJson;
    }

    public String getPositivesJson() {
        return positivesJson;
    }

    public void setPositivesJson(String positivesJson) {
        this.positivesJson = positivesJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
