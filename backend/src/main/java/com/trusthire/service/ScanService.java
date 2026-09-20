package com.trusthire.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trusthire.dto.CheckResult;
import com.trusthire.dto.OfferDetailsDto;
import com.trusthire.dto.ScanRequest;
import com.trusthire.dto.ScanResponse;
import com.trusthire.model.RiskBand;
import com.trusthire.model.ScanRecord;
import com.trusthire.repository.ScanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ScanService {

    private static final Logger log = LoggerFactory.getLogger(ScanService.class);

    private final ScoringService scoringService;
    private final ScanRepository scanRepository;
    private final ObjectMapper objectMapper;

    public ScanService(ScoringService scoringService, ScanRepository scanRepository, ObjectMapper objectMapper) {
        this.scoringService = scoringService;
        this.scanRepository = scanRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ScanResponse createScan(ScanRequest request) {
        String text = request.getText();
        OfferDetailsDto extractedDetails = scoringService.extractDetails(text, request.getDetails());
        ScoringService.AnalysisResult analysis = scoringService.analyze(text, extractedDetails);

        String id = UUID.randomUUID().toString();
        Instant now = Instant.now();

        ScanRecord record = new ScanRecord();
        record.setId(id);
        record.setCompany(extractedDetails.getCompany());
        record.setRole(extractedDetails.getRole());
        record.setSalary(extractedDetails.getSalary());
        record.setRecruiterEmail(extractedDetails.getRecruiterEmail());
        record.setCompanyWebsite(extractedDetails.getCompanyWebsite());
        record.setInterviewChannel(extractedDetails.getInterviewChannel());
        record.setScore(analysis.score());
        record.setBand(analysis.band());
        record.setConfidence(analysis.confidence());
        record.setOfferText(text);
        record.setCreatedAt(now);

        String userEmail = request.getUserEmail();
        if ((userEmail == null || userEmail.isBlank()) && request.getDetails() != null) {
            userEmail = request.getDetails().getUserEmail();
        }
        record.setUserEmail(userEmail);

        try {
            record.setChecksJson(objectMapper.writeValueAsString(analysis.checks()));
            record.setRedFlagsJson(objectMapper.writeValueAsString(analysis.redFlags()));
            record.setPositivesJson(objectMapper.writeValueAsString(analysis.positives()));
        } catch (Exception e) {
            log.error("Failed to serialize scan checks to JSON: {}", e.getMessage());
        }

        scanRepository.save(record);

        return new ScanResponse(
                id,
                analysis.score(),
                analysis.band().getValue(),
                analysis.confidence(),
                analysis.checks(),
                analysis.redFlags(),
                analysis.positives(),
                extractedDetails,
                text,
                now,
                userEmail
        );
    }

    @Transactional(readOnly = true)
    public List<ScanResponse> getAllScans(String bandFilter, String searchQuery) {
        return getAllScans(null, bandFilter, searchQuery);
    }

    @Transactional(readOnly = true)
    public List<ScanResponse> getAllScans(String userEmail, String bandFilter, String searchQuery) {
        RiskBand band = null;
        if (bandFilter != null && !bandFilter.isBlank() && !"all".equalsIgnoreCase(bandFilter)) {
            band = RiskBand.fromString(bandFilter);
        }

        String query = (searchQuery != null && !searchQuery.isBlank()) ? searchQuery.trim() : null;

        List<ScanRecord> records;
        if (userEmail != null && !userEmail.isBlank()) {
            String u = userEmail.trim();
            if (band == null && query == null) {
                records = scanRepository.findByUserEmailIgnoreCaseOrderByCreatedAtDesc(u);
            } else if (band != null && query == null) {
                records = scanRepository.findByUserEmailIgnoreCaseAndBandOrderByCreatedAtDesc(u, band);
            } else if (band == null) {
                records = scanRepository.findByUserEmailIgnoreCaseAndCompanyContainingIgnoreCaseOrUserEmailIgnoreCaseAndRoleContainingIgnoreCaseOrderByCreatedAtDesc(u, query, u, query);
            } else {
                records = scanRepository.findByUserEmailIgnoreCaseAndBandAndCompanyContainingIgnoreCaseOrUserEmailIgnoreCaseAndBandAndRoleContainingIgnoreCaseOrderByCreatedAtDesc(u, band, query, u, band, query);
            }
        } else {
            if (band == null && query == null) {
                records = scanRepository.findAllByOrderByCreatedAtDesc();
            } else if (band != null && query == null) {
                records = scanRepository.findByBandOrderByCreatedAtDesc(band);
            } else if (band == null) {
                records = scanRepository.findByCompanyContainingIgnoreCaseOrRoleContainingIgnoreCaseOrderByCreatedAtDesc(query, query);
            } else {
                records = scanRepository.findByBandAndCompanyContainingIgnoreCaseOrBandAndRoleContainingIgnoreCaseOrderByCreatedAtDesc(band, query, band, query);
            }
        }
        return records.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public Optional<ScanResponse> getScanById(String id) {
        return scanRepository.findById(id).map(this::toResponse);
    }

    @Transactional
    public boolean deleteScan(String id) {
        if (scanRepository.existsById(id)) {
            scanRepository.deleteById(id);
            return true;
        }
        return false;
    }

    private ScanResponse toResponse(ScanRecord record) {
        OfferDetailsDto details = new OfferDetailsDto(
                record.getCompany(),
                record.getRole(),
                record.getSalary(),
                record.getRecruiterEmail(),
                record.getCompanyWebsite(),
                record.getInterviewChannel(),
                record.getUserEmail()
        );

        List<CheckResult> checks = deserializeChecks(record.getChecksJson());
        List<CheckResult> redFlags = deserializeChecks(record.getRedFlagsJson());
        List<CheckResult> positives = deserializeChecks(record.getPositivesJson());

        return new ScanResponse(
                record.getId(),
                record.getScore(),
                record.getBand().getValue(),
                record.getConfidence(),
                checks,
                redFlags,
                positives,
                details,
                record.getOfferText(),
                record.getCreatedAt(),
                record.getUserEmail()
        );

    }

    private List<CheckResult> deserializeChecks(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<CheckResult>>() {});
        } catch (Exception e) {
            log.warn("Error deserializing checks json: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
