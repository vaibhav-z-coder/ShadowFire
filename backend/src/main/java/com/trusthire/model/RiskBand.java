package com.trusthire.model;

import com.fasterxml.jackson.annotation.JsonValue;

public enum RiskBand {
    LIKELY_LEGIT("likely_legit"),
    SUSPICIOUS("suspicious"),
    HIGH_RISK("high_risk");

    private final String value;

    RiskBand(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public static RiskBand fromString(String text) {
        for (RiskBand b : RiskBand.values()) {
            if (b.value.equalsIgnoreCase(text) || b.name().equalsIgnoreCase(text)) {
                return b;
            }
        }
        return SUSPICIOUS;
    }

    public static RiskBand fromScore(int score) {
        if (score >= 70) {
            return LIKELY_LEGIT;
        } else if (score >= 40) {
            return SUSPICIOUS;
        } else {
            return HIGH_RISK;
        }
    }
}
