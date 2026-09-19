package com.trusthire.service;

import com.trusthire.dto.CheckResult;
import com.trusthire.dto.OfferDetailsDto;
import com.trusthire.model.RiskBand;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ScoringService {

    private static final Set<String> FREE_EMAIL_DOMAINS = Set.of(
            "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com", "icloud.com"
    );

    private static final Pattern PAYMENT_PATTERN = Pattern.compile(
            "registration fee|security deposit|training fee|kit charge|refundable (?:amount|fee|deposit)|pay .*?(?:confirm|seat)|payment to confirm",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern TELEGRAM_PATTERN = Pattern.compile(
            "telegram|whatsapp.*?(?:only|interview)|interview.*?(?:telegram|whatsapp)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern URGENCY_PATTERN = Pattern.compile(
            "reply (?:in|within) \\d+|within \\d+\\s*(?:hour|hours|minute|minutes)|limited seats|confirm today|urgent|immediately|last chance",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern EMAIL_PATTERN = Pattern.compile("[\\w.+-]+@([\\w.-]+\\.[a-z]{2,})", Pattern.CASE_INSENSITIVE);
    private static final Pattern SALARY_PATTERN = Pattern.compile("(?:₹|Rs\\.?\\s?)(?:\\s?\\d[\\d,]*(?:\\s?(?:LPA|lakh|/month|per month))?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern URL_PATTERN = Pattern.compile("(?:https?://|www\\.)[\\w-]+\\.(?:com|in|org|io|co)(?:/\\S*)?", Pattern.CASE_INSENSITIVE);
    private static final Pattern COMPANY_PATTERN = Pattern.compile("(?:at|from|with)\\s+([A-Z][A-Za-z0-9& .'-]{2,40}?)(?:\\.|\\n|,|\\s+(?:for|as|role|salary|has))");
    private static final Pattern ROLE_PATTERN = Pattern.compile("\\b(Data Entry(?: Executive)?|Frontend Intern|Software Engineer|Marketing Intern|Sales Executive)\\b|(?:role(?: of)?|position(?: of)?)\\s+([A-Z][A-Za-z ]{2,38})(?:\\.|\\n|,)", Pattern.CASE_INSENSITIVE);
    private static final Pattern HUGE_SALARY_PATTERN = Pattern.compile("(?:₹|rs\\.?\\s?)(?:[5-9]\\d,?\\d{3}|[1-9]\\d{5,})", Pattern.CASE_INSENSITIVE);
    private static final Pattern LOW_EXP_PATTERN = Pattern.compile("no experience|data entry|work from home", Pattern.CASE_INSENSITIVE);

    public record AnalysisResult(
            int score,
            RiskBand band,
            String confidence,
            List<CheckResult> checks,
            List<CheckResult> redFlags,
            List<CheckResult> positives,
            OfferDetailsDto details
    ) {}

    public OfferDetailsDto extractDetails(String text, OfferDetailsDto overrides) {
        OfferDetailsDto details = new OfferDetailsDto();

        // Email
        String email = (overrides != null && overrides.getRecruiterEmail() != null && !overrides.getRecruiterEmail().isBlank())
                ? overrides.getRecruiterEmail().trim()
                : findFirst(text, EMAIL_PATTERN);
        details.setRecruiterEmail(email);

        // Salary
        String salary = (overrides != null && overrides.getSalary() != null && !overrides.getSalary().isBlank())
                ? overrides.getSalary().trim()
                : findFirst(text, SALARY_PATTERN);
        details.setSalary(salary);

        // Website
        String website = (overrides != null && overrides.getCompanyWebsite() != null && !overrides.getCompanyWebsite().isBlank())
                ? overrides.getCompanyWebsite().trim()
                : findFirst(text, URL_PATTERN);
        details.setCompanyWebsite(website);

        // Company
        String company = (overrides != null && overrides.getCompany() != null && !overrides.getCompany().isBlank())
                ? overrides.getCompany().trim()
                : findGroup(text, COMPANY_PATTERN, 1);
        details.setCompany(company != null && !company.isBlank() ? company : "Unknown company");

        // Role
        String role = (overrides != null && overrides.getRole() != null && !overrides.getRole().isBlank())
                ? overrides.getRole().trim()
                : findFirstGroup(text, ROLE_PATTERN);
        details.setRole(role != null && !role.isBlank() ? role : "Role not provided");

        // Interview channel
        boolean hasTelegram = TELEGRAM_PATTERN.matcher(text).find();
        if (hasTelegram) {
            details.setInterviewChannel(text.toLowerCase().contains("telegram") ? "Telegram" : "WhatsApp");
        } else {
            details.setInterviewChannel("Not stated");
        }

        return details;
    }

    public AnalysisResult analyze(String text, OfferDetailsDto details) {
        List<CheckResult> checks = new ArrayList<>();

        String recruiterEmail = details.getRecruiterEmail();
        String domain = domainFrom(recruiterEmail);
        String host = hostFrom(details.getCompanyWebsite());
        String normalCompany = details.getCompany().toLowerCase().replaceAll("[^a-z0-9]", "");
        String domainStem = extractStem(host.isBlank() ? domain : host);

        // C1: Official company email
        if (domain.isBlank()) {
            checks.add(new CheckResult("C1", "Official company email", 20, "not_evaluated",
                    "No recruiter email supplied", "A work email can help establish that a recruiter represents the company."));
        } else if (FREE_EMAIL_DOMAINS.contains(domain.toLowerCase())) {
            checks.add(new CheckResult("C1", "Official company email", 20, "not_triggered",
                    "Free email domain: " + domain, "Legitimate employers usually communicate from a company domain."));
        } else {
            checks.add(new CheckResult("C1", "Official company email", 20, "triggered",
                    "Recruiter domain: " + domain, "A company-domain email is a positive signal."));
        }

        // C2: Domain matches company
        boolean matchable = details.getCompany() != null && !details.getCompany().equals("Unknown company")
                && (!domain.isBlank() || !host.isBlank());
        boolean domainMatch = false;
        if (matchable) {
            String companyPrefix = normalCompany.length() >= 5 ? normalCompany.substring(0, 5) : normalCompany;
            String stemPrefix = domainStem.length() >= 5 ? domainStem.substring(0, 5) : domainStem;
            domainMatch = (!companyPrefix.isBlank() && domainStem.contains(companyPrefix))
                    || (!stemPrefix.isBlank() && normalCompany.contains(stemPrefix));
        }

        String activeDomain = !host.isBlank() ? host : domain;
        if (!matchable) {
            checks.add(new CheckResult("C2", "Domain matches company", 15, "not_evaluated",
                    "Company or domain was not available", "A matching website or email domain helps confirm a company identity."));
        } else if (domainMatch) {
            checks.add(new CheckResult("C2", "Domain matches company", 15, "triggered",
                    activeDomain + " appears to match " + details.getCompany(), "The stated company and contact domain are consistent."));
        } else {
            checks.add(new CheckResult("C2", "Domain matches company", 15, "not_triggered",
                    activeDomain + " does not clearly match " + details.getCompany(), "A mismatch should be independently verified."));
        }

        // C3: Unrealistic salary
        boolean hugeSalary = HUGE_SALARY_PATTERN.matcher(text).find() && LOW_EXP_PATTERN.matcher(text).find();
        if (hugeSalary) {
            String sal = details.getSalary().isBlank() ? "High salary stated for an entry-level role" : details.getSalary();
            checks.add(new CheckResult("C3", "Unrealistic salary", -20, "triggered",
                    sal, "Unusually high pay for a low-experience role is commonly used to create pressure."));
        } else {
            checks.add(new CheckResult("C3", "Unrealistic salary", -20, "not_evaluated",
                    "No clear role-and-pay mismatch detected in this demo", "Pay should be evaluated against the role and experience level."));
        }

        // C4: Upfront payment mentioned
        String paymentEvidence = findMatch(text, PAYMENT_PATTERN);
        if (paymentEvidence != null) {
            checks.add(new CheckResult("C4", "Upfront payment mentioned", -35, "triggered",
                    "“" + paymentEvidence + "”", "Real employers do not ask candidates to pay to secure a job."));
        } else {
            checks.add(new CheckResult("C4", "Upfront payment mentioned", -35, "not_triggered",
                    "No payment language found", "Requests for fees, deposits, or kits are a strong warning sign."));
        }

        // C5: Chat-only interview
        String channelEvidence = findMatch(text, TELEGRAM_PATTERN);
        if (channelEvidence != null) {
            checks.add(new CheckResult("C5", "Chat-only interview", -25, "triggered",
                    "“" + channelEvidence + "”", "A recruiter using only chat apps gives you little way to verify who they are."));
        } else {
            checks.add(new CheckResult("C5", "Chat-only interview", -25, "not_triggered",
                    "No chat-only interview language found", "A credible process normally offers a verifiable call, video, or official contact."));
        }

        // C6: Pressure or urgency
        String urgencyEvidence = findMatch(text, URGENCY_PATTERN);
        if (urgencyEvidence != null) {
            checks.add(new CheckResult("C6", "Pressure or urgency", -10, "triggered",
                    "“" + urgencyEvidence + "”", "Scammers often make deadlines feel urgent so you have less time to check."));
        } else {
            checks.add(new CheckResult("C6", "Pressure or urgency", -10, "not_triggered",
                    "No strong pressure language found", "Poor writing or pressure language can be a sign to slow down."));
        }

        // C7: Missing company website
        boolean hasLegitDomain = (!domain.isBlank() && !FREE_EMAIL_DOMAINS.contains(domain.toLowerCase()));
        if (!host.isBlank() || hasLegitDomain) {
            String ev = !host.isBlank() ? "Website: " + host : "Company domain: " + domain;
            checks.add(new CheckResult("C7", "Missing company website", -15, "not_triggered",
                    ev, "A verifiable company website gives you an independent contact route."));
        } else {
            checks.add(new CheckResult("C7", "Missing company website", -15, "triggered",
                    "No company website or company email domain found", "Without a website or official domain, it is harder to verify the offer independently."));
        }

        // Score calculation
        int deltaSum = checks.stream()
                .filter(c -> "triggered".equals(c.getStatus()))
                .mapToInt(CheckResult::getDelta)
                .sum();

        int rawScore = 50 + deltaSum;
        int score = Math.max(0, Math.min(100, rawScore));

        // Enforce upfront payment trigger cap at 39
        boolean c4Triggered = checks.stream().anyMatch(c -> "C4".equals(c.getId()) && "triggered".equals(c.getStatus()));
        if (c4Triggered) {
            score = Math.min(score, 39);
        }

        RiskBand band = RiskBand.fromScore(score);

        List<CheckResult> redFlags = checks.stream()
                .filter(c -> "triggered".equals(c.getStatus()) && c.getDelta() < 0)
                .toList();

        List<CheckResult> positives = checks.stream()
                .filter(c -> "triggered".equals(c.getStatus()) && c.getDelta() > 0)
                .toList();

        long evaluatedCount = checks.stream().filter(c -> !"not_evaluated".equals(c.getStatus())).count();
        String confidence = evaluatedCount >= 6 ? "High" : (evaluatedCount >= 4 ? "Medium" : "Low");

        return new AnalysisResult(score, band, confidence, checks, redFlags, positives, details);
    }

    private String domainFrom(String email) {
        if (email == null) return "";
        Matcher matcher = EMAIL_PATTERN.matcher(email);
        return matcher.find() ? matcher.group(1).toLowerCase() : "";
    }

    private String hostFrom(String url) {
        if (url == null || url.isBlank()) return "";
        String cleaned = url.replaceAll("^https?://", "").replaceAll("^www\\.", "");
        return cleaned.split("/")[0].toLowerCase();
    }

    private String extractStem(String hostOrDomain) {
        if (hostOrDomain == null || hostOrDomain.isBlank()) return "";
        String first = hostOrDomain.split("\\.")[0];
        return first.replaceAll("[^a-z0-9]", "").toLowerCase();
    }

    private String findFirst(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(0).trim() : "";
    }

    private String findGroup(String text, Pattern pattern, int group) {
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(group).trim() : "";
    }

    private String findFirstGroup(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            for (int i = 1; i <= matcher.groupCount(); i++) {
                if (matcher.group(i) != null && !matcher.group(i).isBlank()) {
                    return matcher.group(i).trim();
                }
            }
            return matcher.group(0).trim();
        }
        return "";
    }

    private String findMatch(String text, Pattern pattern) {
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(0) : null;
    }
}
