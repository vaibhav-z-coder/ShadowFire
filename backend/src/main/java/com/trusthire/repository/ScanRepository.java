package com.trusthire.repository;

import com.trusthire.model.RiskBand;
import com.trusthire.model.ScanRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScanRepository extends JpaRepository<ScanRecord, String> {

    List<ScanRecord> findAllByOrderByCreatedAtDesc();

    List<ScanRecord> findByBandOrderByCreatedAtDesc(RiskBand band);

    List<ScanRecord> findByCompanyContainingIgnoreCaseOrRoleContainingIgnoreCaseOrderByCreatedAtDesc(String company, String role);

    List<ScanRecord> findByBandAndCompanyContainingIgnoreCaseOrBandAndRoleContainingIgnoreCaseOrderByCreatedAtDesc(
            RiskBand b1, String company, RiskBand b2, String role
    );
}
