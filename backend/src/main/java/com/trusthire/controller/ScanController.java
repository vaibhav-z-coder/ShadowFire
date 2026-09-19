package com.trusthire.controller;

import com.trusthire.dto.ScanRequest;
import com.trusthire.dto.ScanResponse;
import com.trusthire.service.ScanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/scans")
public class ScanController {

    private final ScanService scanService;

    public ScanController(ScanService scanService) {
        this.scanService = scanService;
    }

    @PostMapping
    public ResponseEntity<ScanResponse> createScan(@Valid @RequestBody ScanRequest request) {
        ScanResponse response = scanService.createScan(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ScanResponse>> getScans(
            @RequestParam(required = false) String band,
            @RequestParam(required = false) String query
    ) {
        List<ScanResponse> scans = scanService.getAllScans(band, query);
        return ResponseEntity.ok(scans);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScanResponse> getScanById(@PathVariable String id) {
        return scanService.getScanById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteScan(@PathVariable String id) {
        boolean deleted = scanService.deleteScan(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Scan deleted successfully"));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", "Scan not found"));
        }
    }
}
