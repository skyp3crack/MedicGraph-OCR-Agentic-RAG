"""
Unit tests for PHI (Protected Health Information) scrubbing logic.
Tests the clean_phi() function from the clinical graph module.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.Agents.clinical_graph import clean_phi


class TestCleanPhiPatientName:
    """Test patient name de-identification."""

    def test_full_name_replaced(self):
        text = "Patient: AHMAD BIN HASSAN was admitted."
        result = clean_phi(text, name="AHMAD BIN HASSAN", ic_number="")
        assert "AHMAD" not in result
        assert "[PATIENT_NAME]" in result

    def test_name_parts_replaced(self):
        """Individual name parts (excluding connectors like BIN) should be scrubbed."""
        text = "Dr. referred HASSAN for cardiology review."
        result = clean_phi(text, name="AHMAD BIN HASSAN", ic_number="")
        assert "HASSAN" not in result
        assert "[PATIENT_NAME_PART]" in result

    def test_connectors_preserved(self):
        """BIN, BINTI, A/L, A/P should NOT be replaced."""
        text = "This is BIN and BINTI notation."
        result = clean_phi(text, name="SITI BINTI RAZAK", ic_number="")
        # BIN and BINTI should remain (they are common connectors)
        assert "BIN" in result
        assert "BINTI" in result

    def test_case_insensitive(self):
        text = "ahmad bin hassan visited the clinic."
        result = clean_phi(text, name="AHMAD BIN HASSAN", ic_number="")
        assert "ahmad" not in result.lower() or "[PATIENT_NAME]" in result

    def test_empty_name(self):
        """Empty name should not cause errors."""
        text = "Patient was admitted on 2024-09-12."
        result = clean_phi(text, name="", ic_number="")
        assert result == text


class TestCleanPhiIcNumber:
    """Test IC number de-identification."""

    def test_specific_ic_with_dashes(self):
        text = "IC: 840921-14-5583"
        result = clean_phi(text, name="", ic_number="840921-14-5583")
        assert "840921-14-5583" not in result
        assert "[IC_NUMBER]" in result

    def test_specific_ic_without_dashes(self):
        """12-digit IC without dashes should also be scrubbed."""
        text = "IC: 840921145583"
        result = clean_phi(text, name="", ic_number="840921-14-5583")
        assert "840921145583" not in result
        assert "[IC_NUMBER]" in result

    def test_generic_ic_pattern(self):
        """Any YYMMDD-PB-#### pattern should be caught by generic regex."""
        text = "IC recorded: 950315-08-1234"
        result = clean_phi(text, name="", ic_number="")
        assert "950315-08-1234" not in result
        assert "[IC_NUMBER]" in result


class TestCleanPhiContactInfo:
    """Test phone and email scrubbing."""

    def test_malaysian_phone_with_country_code(self):
        text = "Contact: +6012-3456789"
        result = clean_phi(text, name="", ic_number="")
        assert "+6012-3456789" not in result
        assert "[PHONE_NUMBER]" in result

    def test_email_address(self):
        text = "Email: patient@hospital.com.my"
        result = clean_phi(text, name="", ic_number="")
        assert "patient@hospital.com.my" not in result
        assert "[EMAIL_ADDRESS]" in result


class TestCleanPhiMrn:
    """Test Medical Record Number scrubbing."""

    def test_mrn_standard_format(self):
        text = "MRN-2024-123456 registered."
        result = clean_phi(text, name="", ic_number="")
        assert "MRN-2024-123456" not in result
        assert "[MRN]" in result

    def test_registration_number(self):
        text = "REG-FULL-2024-0001"
        result = clean_phi(text, name="", ic_number="")
        assert "REG-FULL-2024-0001" not in result
        assert "[REGISTRATION_NO]" in result
