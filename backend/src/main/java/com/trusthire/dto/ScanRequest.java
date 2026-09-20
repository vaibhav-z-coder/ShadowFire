package com.trusthire.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ScanRequest {

    @NotBlank(message = "Offer text cannot be blank")
    @Size(min = 20, max = 20000, message = "Offer text must be between 20 and 20,000 characters")
    private String text;

    private OfferDetailsDto details;

    private String userEmail;

    public ScanRequest() {}

    public ScanRequest(String text, OfferDetailsDto details) {
        this.text = text;
        this.details = details;
    }

    public ScanRequest(String text, OfferDetailsDto details, String userEmail) {
        this.text = text;
        this.details = details;
        this.userEmail = userEmail;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public OfferDetailsDto getDetails() {
        return details;
    }

    public void setDetails(OfferDetailsDto details) {
        this.details = details;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }
}
