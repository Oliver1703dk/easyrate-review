# **EasyRate - MVP2 Product Specification**

---

## **System Overview**

EasyRate MVP2 is a digital review collection platform that automates customer feedback collection after orders or bookings. The system integrates with booking and takeaway platforms to trigger review requests, collects feedback through mobile-optimized landing pages, and provides a dashboard for businesses to view their reviews.

### **Key Capabilities**

- **Automated feedback collection**: SMS and email notifications triggered after orders
- **Mobile-optimized landing pages**: Emoji-rich rating interface with feedback forms
- **Internal review management**: Dashboard to view and manage collected feedback
- **Integration ready**: Connects with Dully and EasyTable platforms
- **Danish language**: Native Danish UI and messaging

### **Key Goals**

1. Automate the feedback collection process for restaurants and service businesses
2. Collect internal reviews to help businesses understand customer satisfaction
3. Route positive customers toward external review platforms (Google)
4. Provide businesses with visibility into their feedback data

---

## **Core Workflow**

### **1. Data Collection**

Businesses connect their booking/takeaway systems via API to capture order data:

- **Customer details**: Name, email, phone number
- **Order metadata**: Timestamp, order ID, source platform
- **Consent flags**: GDPR compliance tracking

### **2. Review Request Flow**

#### **Trigger**

| Integration | Trigger Timing |
|-------------|----------------|
| **Dully** | 1 hour after order pickup |
| **EasyTable** | 2 hours after booking time |

#### **Notification Sequence**

1. **SMS Notification**: Sent at trigger time
   - Sender: EasyRate (alphanumeric sender ID)
   - Message includes business name (e.g., "Fra Kaspers: Hvordan var din oplevelse?")
   - Personalization with customer name

2. **Email Fallback**: Sent if no response to SMS
   - Sender: EasyRate
   - Matching content to SMS with expanded formatting

#### **Landing Page Experience**

**Screen 1 - Rating**
- Friendly, emoji-rich interface
- Question: "Hvordan var din oplevelse?"
- 1-5 star rating selection
- Timer note: "Det tager kun 10 sekunder"
- Optional: Photo upload

**Screen 2 - Feedback (Conditional)**

- **1-3 stars (negative)**:
  - Private feedback form for detailed text input
  - Privacy disclaimer: "Din feedback er privat og vil kun blive delt med virksomheden"
  - Optional link to leave Google review

- **4-5 stars (positive)**:
  - Thank you message
  - Prompt to share on Google with direct link
  - Skip option ("Nej tak")

**Screen 3 - Thank You**
- Confirmation message
- Business branding

### **3. Review Storage**

- All feedback stored in database with metadata
- Reviews linked to source platform (Dully/EasyTable)
- Photos stored securely (AWS S3, EU region)
- GDPR-compliant data handling

---

## **Admin Dashboard**

The admin dashboard is a web application for businesses to manage their feedback collection.

### **1. Overview Page**

**Key Metrics**:
- Total SMS sent
- Total emails sent
- Total reviews received
- Response rate (%)

**Visual Display**:
- Metric cards with current values
- Simple trend indicator

### **2. Reviews Page**

**Review List**:
- Star rating display
- Review text content
- Submission date and time
- Source platform (Dully/EasyTable)
- Attached photos (if uploaded)

**List Features**:
- Chronological sorting (newest first)
- Basic search functionality

### **3. Settings Page**

**Message Templates**:
- SMS message text editor
- Email message text editor
- Personalization variables ({name}, {business})

**Business Profile**:
- Business name
- Business logo

**Integration Status**:
- Connection status for each platform
- Last sync timestamp

### **4. Integrations Page**

**Dully Integration**:
- Webhook URL configuration
- API key input
- Connection test button
- Status indicator

**EasyTable Integration**:
- API key configuration
- Connection test button
- Status indicator
- Setup guide

---

## **Integrations**

### **Dully**

- **Connection Type**: Webhooks
- **Trigger Event**: Order pickup completion
- **Delay**: 1 hour after pickup
- **Data Received**: Customer name, email, phone, order ID, timestamp

### **EasyTable**

- **Connection Type**: REST API
- **Trigger Event**: Booking completion
- **Delay**: 2 hours after booking time
- **Data Received**: Customer name, email, phone, booking ID, timestamp

---

## **Technical Architecture**

### **Frontend**

- **Framework**: React.js with TypeScript
- **UI Library**: Tailwind CSS + shadcn/ui
- **Language**: Danish
- **Deployment**: Vercel

### **Backend**

- **Framework**: Next.js or Express.js
- **Language**: TypeScript (Node.js)
- **API Style**: REST with webhooks
- **Deployment**: Railway/Render or AWS

### **Database**

- **Database**: MongoDB
- **Schema**: Multi-tenant ready with tenant_id field
- **File Storage**: AWS S3 (EU region, encrypted)

### **Communication Services**

**SMS Provider** (one of):
- Gateway API (~20 øre/SMS)
- Synac (~26 øre/SMS)
- Twilio (~30-40 øre/SMS)

**Email Provider**:
- SendGrid or Amazon SES
- Sender: EasyRate

### **Infrastructure**

- **Cloud Region**: AWS eu-central-1 (Frankfurt)
- **Repository**: Monorepo with pnpm workspaces
- **CI/CD**: GitHub Actions
- **Domain**: api.easyrate.app

---

## **Data Models**

### **Business**

```
{
  id: string
  name: string
  logo_url: string
  sms_template: string
  email_template: string
  integrations: {
    dully: { enabled: boolean, api_key: string }
    easytable: { enabled: boolean, api_key: string }
  }
  created_at: datetime
}
```

### **Review**

```
{
  id: string
  business_id: string
  customer_name: string
  customer_email: string
  rating: number (1-5)
  feedback_text: string
  photos: string[]
  source: "dully" | "easytable"
  source_order_id: string
  created_at: datetime
}
```

### **Notification**

```
{
  id: string
  business_id: string
  customer_email: string
  customer_phone: string
  type: "sms" | "email"
  status: "pending" | "sent" | "delivered" | "failed"
  sent_at: datetime
  response_received: boolean
}
```

---

## **Compliance**

### **GDPR**

- Consent tracking in all communications
- EU data hosting (AWS Frankfurt)
- Data retention policies
- User data deletion capability
- User data export capability

### **Legal Requirements**

- Both positive and negative paths include optional external review link
- No review incentivization
- Privacy disclaimers on feedback forms
- Opt-out mechanism in communications

---

## **Development Timeline**

| Milestone | Target Date |
|-----------|-------------|
| Development Start | February 2026 |
| Dully API Available | February 15, 2026 |
| MVP2 Launch | March 1, 2026 |

### **Effort Estimate**

- **Development Hours**: 30-40 hours
- **Team**: Solo developer

---

## **Initial Customers**

- Andy's (Aalborg)
- Casper's (Aalborg)
- Catch Sushi Bar
- Roku Izakaya
- Mami
- Overhus

---

## **Success Metrics**

1. SMS and email notifications deliver successfully
2. Landing pages load and function correctly on mobile
3. Reviews are collected and stored in database
4. Dashboard displays collected data accurately
5. System runs stable without critical errors

---

## **Future Enhancements**

1. AI-powered response suggestions
2. AI review analysis and insights
3. Google Reviews integration (read and reply)
4. Advanced analytics and reporting
5. Multi-location support
6. Additional platform integrations
7. Monthly PDF reports
