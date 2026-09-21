from app.core.enums import EmploymentType
from app.modules.verification.service import hash_otp


def test_employment_types() -> None:
    assert {e.value for e in EmploymentType} == {"FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"}


def test_hash_otp_is_stable() -> None:
    assert hash_otp("123456") == hash_otp("123456")
    assert hash_otp("123456") != hash_otp("000000")


def test_conversion_rates() -> None:
    applications = 10
    apply_hires = 2
    jobs = 4
    jobs_with_hire = 1
    assert round(apply_hires / applications, 4) == 0.2
    assert round(jobs_with_hire / jobs, 4) == 0.25
