package com.trusthire.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${DATABASE_URL:#{null}}")
    private String databaseUrl;

    @Value("${spring.datasource.url:#{null}}")
    private String springDatasourceUrl;

    @Value("${spring.datasource.username:#{null}}")
    private String springDatasourceUsername;

    @Value("${spring.datasource.password:#{null}}")
    private String springDatasourcePassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        // Priority 1: Render DATABASE_URL (postgres://user:pass@host:port/db)
        if (databaseUrl != null && !databaseUrl.isBlank()) {
            log.info("Configuring PostgreSQL datasource from DATABASE_URL");
            return buildFromRenderDatabaseUrl(databaseUrl);
        }

        // Priority 2: Standard spring.datasource.* properties
        if (springDatasourceUrl != null && !springDatasourceUrl.isBlank()) {
            log.info("Configuring datasource from spring.datasource.url: {}", springDatasourceUrl);
            return DataSourceBuilder.create()
                    .url(springDatasourceUrl)
                    .username(springDatasourceUsername)
                    .password(springDatasourcePassword)
                    .build();
        }

        // Priority 3: Fallback to in-memory H2 database for local testing without Postgres
        log.warn("No PostgreSQL configuration found. Falling back to local in-memory H2 database.");
        return DataSourceBuilder.create()
                .driverClassName("org.h2.Driver")
                .url("jdbc:h2:mem:trusthiredb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL")
                .username("sa")
                .password("")
                .build();
    }

    private DataSource buildFromRenderDatabaseUrl(String rawUrl) {
        try {
            // Support both postgres:// and postgresql:// schemes
            String cleaned = rawUrl;
            if (cleaned.startsWith("postgres://")) {
                cleaned = "http://" + cleaned.substring("postgres://".length());
            } else if (cleaned.startsWith("postgresql://")) {
                cleaned = "http://" + cleaned.substring("postgresql://".length());
            }

            URI uri = URI.create(cleaned);
            String host = uri.getHost();
            int port = uri.getPort() == -1 ? 5432 : uri.getPort();
            String path = uri.getPath(); // e.g. /dbname
            String dbName = (path != null && path.length() > 1) ? path.substring(1) : "postgres";

            String username = "";
            String password = "";
            if (uri.getUserInfo() != null) {
                String[] parts = uri.getUserInfo().split(":", 2);
                username = parts[0];
                if (parts.length > 1) {
                    password = parts[1];
                }
            }

            String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", host, port, dbName);
            log.info("Resolved JDBC URL: {}", jdbcUrl);

            return DataSourceBuilder.create()
                    .driverClassName("org.postgresql.Driver")
                    .url(jdbcUrl)
                    .username(username)
                    .password(password)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse DATABASE_URL: {}. Falling back to standard builder.", e.getMessage());
            return DataSourceBuilder.create().url(rawUrl).build();
        }
    }
}
