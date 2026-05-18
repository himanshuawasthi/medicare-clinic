# Feature Specification: Patient Registration

**Feature Branch**: `001-patient-registration`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Patient Registration"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New Patient Self-Registration (Priority: P1)

A new patient visits the clinic for the first time and needs to be registered in the system. Clinic staff (or the patient via a self-service kiosk/portal) enters the patient's demographic and insurance information so the patient can receive care and be billed appropriately.

**Why this priority**: Registration is the entry point for all clinic services. Without a patient record, no appointment, treatment, or billing can occur. This is the foundational capability.

**Independent Test**: Can be fully tested by entering a new patient's details (name, date of birth, contact, insurance) and verifying that a patient record is created, retrievable, and ready for appointment booking.

**Acceptance Scenarios**:

1. **Given** a new patient has no existing record, **When** staff enters all required personal and insurance details and submits, **Then** a unique patient record is created and a patient ID is assigned.
2. **Given** a duplicate patient is detected (same name + date of birth), **When** staff attempts to register, **Then** the system warns of a potential duplicate and prompts staff to confirm or merge before creating a new record.
3. **Given** required fields are missing, **When** staff attempts to submit the registration form, **Then** the system highlights the missing fields and prevents submission until they are completed.

---

### User Story 2 - Patient Insurance Verification (Priority: P2)

During or after registration, staff needs to capture the patient's insurance provider and policy details so that billing can be prepared ahead of or following the appointment.

**Why this priority**: Insurance information is critical for billing accuracy and pre-authorization. Without it, the clinic risks claim rejection and delayed revenue.

**Independent Test**: Can be fully tested by adding insurance details to an existing patient record and verifying the information is saved and retrievable for billing workflows.

**Acceptance Scenarios**:

1. **Given** a registered patient, **When** staff adds insurance provider name, policy number, and group number, **Then** the insurance details are saved to the patient record.
2. **Given** a patient has multiple insurance plans, **When** staff enters a secondary insurance, **Then** both primary and secondary plans are stored and labelled accordingly.
3. **Given** a patient has no insurance, **When** staff marks the patient as self-pay, **Then** the record reflects self-pay status and no insurance fields are required.

---

### User Story 3 - Patient Record Update (Priority: P3)

An existing patient's demographic or contact information changes (e.g., new address, new phone number, new insurance). Staff needs to update the record while preserving the history of changes.

**Why this priority**: Outdated contact and insurance information leads to failed communications and claim rejections. Record maintenance keeps data accurate over time.

**Independent Test**: Can be fully tested by locating an existing patient, updating a field (e.g., phone number), saving, and verifying the new value is displayed while the prior value is retained in history.

**Acceptance Scenarios**:

1. **Given** an existing patient record, **When** staff updates the phone number and saves, **Then** the new phone number is displayed and the previous value is logged in the change history.
2. **Given** a patient changes insurance providers, **When** staff updates the insurance details, **Then** the new insurance is marked active and the previous plan is archived with the date of change.

---

### Edge Cases

- What happens when two patients share the same name and date of birth (twins, or coincidence)?
- How does the system handle a patient who is a minor — does a guardian need to be recorded?
- What happens if the registration form is partially completed and the user navigates away?
- How does the system behave when insurance policy numbers contain special characters or exceed expected length?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow staff to create a new patient record by entering required demographic information (full name, date of birth, sex, contact details).
- **FR-002**: System MUST assign a unique patient identifier to each registered patient.
- **FR-003**: System MUST validate that all required fields are present and in the correct format before saving a patient record.
- **FR-004**: System MUST detect potential duplicate patients (same full name and date of birth) and alert staff before creating a new record.
- **FR-005**: System MUST allow staff to record a patient's primary insurance provider, policy number, and group number.
- **FR-006**: System MUST support the addition of a secondary insurance plan on a patient record.
- **FR-007**: System MUST allow a patient to be marked as self-pay when no insurance is held.
- **FR-008**: System MUST allow staff to search for existing patients by name, date of birth, or patient ID.
- **FR-009**: System MUST allow staff to update patient demographic and insurance information on existing records.
- **FR-010**: System MUST retain a change history log for any modifications made to a patient record, capturing what changed, when, and by whom.
- **FR-011**: System MUST support recording of a guardian or emergency contact for minor patients or patients who require a representative.
- **FR-012**: System MUST allow an in-progress registration to be saved as a draft so staff can resume it without data loss.

### Key Entities *(include if feature involves data)*

- **Patient**: The individual receiving care. Key attributes: unique patient ID, full name, date of birth, sex, address, phone, email, registration date.
- **Insurance Plan**: Coverage associated with a patient. Key attributes: provider name, policy number, group number, plan type (primary/secondary), effective dates, self-pay flag.
- **Guardian / Emergency Contact**: A person associated with a patient for contact or consent purposes. Key attributes: name, relationship, phone.
- **Change Log Entry**: A record of a field-level change on a patient record. Key attributes: patient ID, field changed, previous value, new value, timestamp, staff member.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can complete a new patient registration (all required fields) in under 5 minutes.
- **SC-002**: Duplicate patient detection is triggered in 100% of cases where name and date of birth match an existing record.
- **SC-003**: 95% of submitted registration forms pass validation on the first attempt (i.e., form guidance is clear enough to prevent errors).
- **SC-004**: Patient records are retrievable by name, date of birth, or patient ID in under 3 seconds.
- **SC-005**: Record update history is available for 100% of patient records that have been modified.
- **SC-006**: Zero patient records are created without a unique patient ID assigned.

## Assumptions

- Clinic staff (receptionists, front-desk personnel) are the primary users of the registration workflow; patients may optionally use a self-service portal but this is out of scope for v1.
- The system will integrate with an existing appointment and billing module; patient IDs generated here will be referenced by those modules.
- Photo ID scanning or biometric verification is out of scope for v1; identity is confirmed manually by staff.
- Insurance eligibility verification with insurance providers in real time is out of scope for v1; staff enters insurance details manually.
- All patients are assumed to be registered within the same clinic or clinic network; multi-organization patient sharing is out of scope.
- The guardian/emergency contact field is optional for adult patients and required for patients under 18.
- Standard data privacy regulations applicable to healthcare patient data (e.g., HIPAA in the US) are assumed to apply; specific compliance requirements will be confirmed during planning.
