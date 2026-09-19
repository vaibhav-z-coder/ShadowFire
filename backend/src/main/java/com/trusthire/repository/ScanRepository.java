package com.trusthire.repository;

import com.trusthire.model.RiskBand;
import com.trusthire.model.ScanRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScanRepository extends JpaRepository<ScanRecord, String> {

    List<ScanRecord> findAllByOrderByCreatedAtDesc();

    List<ScanRecord> findByBandOrderByCreatedAtDesc(RiskBand band);

    @Query("SELECT s FROM ScanRecord s WHERE " +
           "(:band IS NULL OR s.band = :band) AND " +
           "(:query IS NULL OR LOWER(s.company) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(s.role) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY s.createdAt DESC")
    List<ScanRecord> searchScans(@Param("band") RiskBand band, @Param("query") String query);
}
