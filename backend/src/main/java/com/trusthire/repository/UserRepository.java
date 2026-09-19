package com.trusthire.repository;

import com.trusthire.model.UserRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserRecord, String> {

    Optional<UserRecord> findByEmail(String email);
}
