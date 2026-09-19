package com.trusthire.dto;

public class CheckResult {
    private String id;
    private String name;
    private int delta;
    private String status; // "triggered", "not_triggered", "not_evaluated"
    private String evidence;
    private String why;

    public CheckResult() {}

    public CheckResult(String id, String name, int delta, String status, String evidence, String why) {
        this.id = id;
        this.name = name;
        this.delta = delta;
        this.status = status;
        this.evidence = evidence;
        this.why = why;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getDelta() {
        return delta;
    }

    public void setDelta(int delta) {
        this.delta = delta;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getEvidence() {
        return evidence;
    }

    public void setEvidence(String evidence) {
        this.evidence = evidence;
    }

    public String getWhy() {
        return why;
    }

    public void setWhy(String why) {
        this.why = why;
    }
}
