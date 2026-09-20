package com.trusthire.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class OfferDetailsDto {
    private String company;
    private String role;
    private String salary;

    @JsonProperty("recruiter_email")
    private String recruiterEmail;

    @JsonProperty("company_website")
    private String companyWebsite;

    @JsonProperty("interview_channel")
    private String interviewChannel;

    @JsonProperty("user_email")
    private String userEmail;

    public OfferDetailsDto() {}

    public OfferDetailsDto(String company, String role, String salary, String recruiterEmail, String companyWebsite, String interviewChannel) {
        this.company = company;
        this.role = role;
        this.salary = salary;
        this.recruiterEmail = recruiterEmail;
        this.companyWebsite = companyWebsite;
        this.interviewChannel = interviewChannel;
    }

    public OfferDetailsDto(String company, String role, String salary, String recruiterEmail, String companyWebsite, String interviewChannel, String userEmail) {
        this.company = company;
        this.role = role;
        this.salary = salary;
        this.recruiterEmail = recruiterEmail;
        this.companyWebsite = companyWebsite;
        this.interviewChannel = interviewChannel;
        this.userEmail = userEmail;
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

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }
}

