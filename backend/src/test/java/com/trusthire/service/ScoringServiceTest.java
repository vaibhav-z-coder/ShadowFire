package com.trusthire.service;

import com.trusthire.dto.OfferDetailsDto;
import com.trusthire.model.RiskBand;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ScoringServiceTest {

    private ScoringService scoringService;

    @BeforeEach
    void setUp() {
        scoringService = new ScoringService();
    }

    @Test
    @DisplayName("Sample scam offer triggers C4 payment cap and results in HIGH_RISK")
    void testSampleScamOffer() {
        String scamText = """
                Congratulations! You have been selected for a work-from-home Data Entry role at BrightPath Solutions.
                Salary: ₹60,000 per month. No experience required.
                To confirm your seat, pay the refundable ₹1,500 registration fee today.
                Our interview is only on Telegram — message @brightpath_hr within 1 hour.
                Regards,
                BrightPath Hiring Team
                brightpath.hr2024@gmail.com
                """;

        OfferDetailsDto details = scoringService.extractDetails(scamText, null);
        assertEquals("BrightPath Solutions", details.getCompany());
        assertEquals("brightpath.hr2024@gmail.com", details.getRecruiterEmail());
        assertEquals("Telegram", details.getInterviewChannel());

        ScoringService.AnalysisResult result = scoringService.analyze(scamText, details);

        // C4 upfront payment must cap score <= 39 and classify as HIGH_RISK
        assertTrue(result.score() <= 39, "Score should be capped at 39 or below");
        assertEquals(RiskBand.HIGH_RISK, result.band());
        assertTrue(result.redFlags().stream().anyMatch(c -> "C4".equals(c.getId())));
        assertTrue(result.redFlags().stream().anyMatch(c -> "C5".equals(c.getId())));
    }

    @Test
    @DisplayName("Legitimate corporate offer yields likely_legit band")
    void testLegitimateOffer() {
        String legitText = """
                Hi Vaibhav, We were impressed by your profile and would like to offer you the Frontend Intern role at Northstar Labs.
                Salary is ₹25,000 per month. The official onboarding call will be hosted on Google Meet.
                Careers portal: https://northstarlabs.com
                """;

        OfferDetailsDto overrides = new OfferDetailsDto(
                "Northstar Labs",
                "Frontend Intern",
                "₹25,000/month",
                "careers@northstarlabs.com",
                "northstarlabs.com",
                "Google Meet"
        );

        OfferDetailsDto details = scoringService.extractDetails(legitText, overrides);
        ScoringService.AnalysisResult result = scoringService.analyze(legitText, details);

        assertTrue(result.score() >= 70, "Score should be 70 or higher for legitimate signals");
        assertEquals(RiskBand.LIKELY_LEGIT, result.band());
        assertTrue(result.redFlags().isEmpty(), "Should have 0 red flags");
        assertTrue(result.positives().stream().anyMatch(c -> "C1".equals(c.getId())));
        assertTrue(result.positives().stream().anyMatch(c -> "C2".equals(c.getId())));
    }
}
