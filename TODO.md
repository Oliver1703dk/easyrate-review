# EasyRate TODO



## 1. Test Order Flow (Test Tab)

- [ ] Add "Test" tab in dashboard integrations section
- [ ] Create test order form with:
  - [ ] Phone number input (optional)
  - [ ] Email input (optional)
  - [ ] At least one contact method required
  - [ ] Customer name input (optional, for personalization)
- [ ] Implement test order submission that:
  - [ ] Creates a mock order in the queue
  - [ ] Sends SMS to provided phone number (if entered)
  - [ ] Sends email to provided email (if entered)
  - [ ] Uses the business's configured message templates
  - [ ] Applies configured delay (or immediate for testing)
- [ ] Show real-time status of test message delivery
- [ ] Allow testing the full review flow (link → rating → feedback/Google redirect)

---

## 2. Integrate into Easyrate.app current platform

- [ ] Integrate EasyRate into the current Easyrate.app platform

---


## Notes

- All AI features require human approval before sending
- Danish language optimization required for all AI prompts
- Rate limiting and cost control measures needed
- GDPR compliance: ensure customer consent for email responses
