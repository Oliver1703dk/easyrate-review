Here is clear, structured **documentation** for the requested endpoints from the **easyTable v2 API** (based on the provided OpenAPI-like specification excerpt). The documentation is written in a developer-friendly style, similar to what you might find in official API references.

### Authorization & General Notes

- All requests (except HealthCheck and some Collection endpoints) require two headers:
  - `X-Api-Key`: Your global API key from easyTable
  - `X-Place-Token`: Place/venue-specific token (required for booking & customer operations)
- Rate limits: 3 req/s default (1 req/2s for batch/period endpoints)
- 429 = Too Many Requests
- Dates are typically in `YYYY/MM/DD` format (some endpoints accept ISO datetime)
- Current server time is always returned in many responses (`serverTime`)

---

### Bookings – Retrieve Bookings

**GET** `/v2/bookings`

Returns a list of bookings, optionally filtered. Includes bound tables.

#### Query Parameters (all optional)

| Parameter              | Type          | Description                                                                 |
|------------------------|---------------|-----------------------------------------------------------------------------|
| `date`                 | date (YYYY/MM/DD) | Bookings on this specific date (default = today)                          |
| `modifiedSince`        | datetime      | Only bookings modified since this server timestamp                         |
| `bookingID`            | integer       | Return one specific booking by internal ID                                 |
| `bookingExternalID`    | string        | Return one specific booking by your external identifier                    |
| `combinationID`        | integer       | Return bookings that belong to this combination/group                      |
| `customerID`           | integer       | Return **all** bookings for this customer (ignores most other filters)     |
| `customerExternalID`   | string        | Return **all** bookings for this external customer ID                      |
| `email`                | string        | Return **all** bookings for this email (ignores most other filters)        |
| `createdDate`          | date          | Return bookings created on this date (overrides `date`)                    |
| `tableID`              | integer       | Return bookings assigned to this table                                     |
| `tableExternalID`      | string        | Return bookings assigned to this external table ID                         |

#### Important Response Fields (per booking)

| Field               | Type    | Meaning / Values                                                                 |
|---------------------|---------|----------------------------------------------------------------------------------|
| `bookingID`         | int     | Internal easyTable booking ID                                                   |
| `externalID`        | string  | Your external identifier (if set)                                               |
| `date`              | string  | Booking date                                                                    |
| `arrival`           | string  | Arrival time (HH:MM)                                                            |
| `duration`          | int     | Duration in minutes                                                             |
| `status`            | string  | Usually numeric in docs: 1 = Active, 2 = Cancelled, 3 = No-show                 |
| `arrived`           | 0/1     | Guest has arrived (1 = yes)                                                     |
| `expired`           | 0/1     | Booking has expired/no-show processed                                           |
| `persons`           | int     | Number of guests                                                                |
| `customerID`        | int     | Linked internal customer ID                                                     |
| `customerExternalID`| string  | Linked external customer ID                                                     |
| `tables`            | array   | Assigned tables (`tableID`, `externalID`, `tableName`)                          |
| `tags`              | array   | Applied tags                                                                    |
| `preorder`          | object  | Pre-order details (if any)                                                      |
| `note`, `guestNote` | string  | Internal note / guest-visible note                                              |

**Response 200 example** (simplified)

```json
{
  "settings": {
    "duration": 0,
    "serverTime": "2026-02-03T13:37:46.594Z"
  },
  "bookings": [
    {
      "bookingID": 12345,
      "date": "2026-02-05",
      "arrival": "18:30",
      "duration": 120,
      "persons": 4,
      "status": "1",
      "arrived": 0,
      "customerID": 6789,
      "name": "Emma Jensen",
      "email": "emma@example.com",
      "tables": [
        { "tableID": 12, "tableName": "Window 4" }
      ],
      ...
    }
  ]
}
```

**Common status codes**

- 200 OK
- 400 Bad request (wrong parameter format)
- 401 / 403 Auth issues
- 422 Business rule violation
- 500 Server error

---

### Bookings – Create New Booking

**POST** `/v2/bookings`

Creates a new reservation. Fails if tables are not available (unless `autoTable=true`).

#### Request Body (JSON)

```json
{
  "externalID":           "your-ref-20260205-001",     // optional
  "company":              "Acme Corp",                 // optional
  "date":                 "2026-02-05",                // required
  "time":                 "18:30",                     // required (HH:MM)
  "persons":              4,                           // required (>0)
  "children":             1,                           // optional
  "typeID":               2,                           // optional – booking type
  "autoTable":            true,                        // if true → system picks table(s)
  "tables": [                                          // required if !autoTable
    { "tableID": 12 },
    { "tableExternalID": "terrace-03" }
  ],
  "duration":             105,                         // optional (minutes)
  "customerExternalID":   "cust-98765",                // optional
  "mobile":               4512345678,                  // optional (with country code)
  "name":                 "Emma Jensen",               // strongly recommended
  "email":                "emma@example.com",          // recommended
  "comment":              "Celebrating birthday",      // internal note
  "guestNote":            "Window table please",       // guest-visible note
  "tags":                 [3, 7],                      // optional tag IDs
  "language":             "EN",                        // DA/DE/EN/ES/FR/NL/NO/SE
  "paymentTime":          15,                          // minutes to pay deposit (0 = default)
  "emailNotifications":   1,                           // 0/1
  "smsNotifications":     0,
  "onlineBooking":        1,                           // was this booked by guest online?
  "reference":            "google-res-abc123",         // optional source code
  "ignorePayment":        0,                           // 1 = skip required payment
  "preorderBody": { ... }                              // optional preorder items
}
```

#### Response 200

```json
{
  "bookingID": 12456,
  "customerID": 6789,
  "externalCustomerID": "cust-98765",
  "paymentURL": "https://pay.easyTable.com/..."   // if deposit required
}
```

**Important**: If payment is required and not ignored, a `paymentURL` is returned. Booking may be cancelled automatically if not paid in time.

---

### Customers – Retrieve Customers

**GET** `/v2/customers`

Returns customer records (max 5000 results).

#### Query Parameters (all optional)

| Parameter               | Type     | Description                                          |
|-------------------------|----------|------------------------------------------------------|
| `customerID`            | integer  | Get one specific customer                            |
| `customerIdGreaterThan` | integer  | Get customers with ID > this value (pagination aid)  |
| `externalCustomerID`    | string   | Get customer by your external ID                     |
| `newsletter`            | 0/1      | Filter by newsletter subscription                    |

#### Response 200 example (array)

```json
[
  {
    "customerID": 6789,
    "externalID": "crm-abc123",
    "name": "Emma Jensen",
    "company": null,
    "mobile": 4512345678,
    "email": "emma@example.com",
    "newsletter": "1",
    "created": "2025-11-12T14:20:00Z",
    "bookings": 7,
    "latestBooking": "2026-02-01"
  }
]
```

---

### Customers – Create New Customer

**POST** `/v2/customers`

Creates a new customer record. Returns the new internal `customerID`.

#### Request Body

```json
{
  "mobile":               4512345678,
  "name":                 "Emma Jensen",
  "email":                "emma@example.com",
  "newsletter":           1,
  "address":              "Storgade 12",
  "zipCode":              "2300",
  "countryCode":          "DK",
  "city":                 "Copenhagen",
  "company":              "Acme Corp",
  "room":                 "305",                    // e.g. hotel room
  "roomExpiry":           "2026-02-06T11:00:00Z",   // auto-clear room after this time
  "customerExternalID":   "crm-abc123"
}
```

#### Response 200

Just the new ID (as text or number):

```
6789
```

or in JSON:

```json
6789
```

---

### Customers – Update Customer

**PUT** `/v2/customers`

Updates existing customer. `customerID` is **required**.

#### Request Body

```json
{
  "customerID":     6789,               // required
  "externalID":     "crm-new-ref-001",  // optional – update external ID
  "mobile":         4523456789,
  "name":           "Emma M. Jensen",
  "email":          "emma.m.jensen@gmail.com",
  "room":           "308",
  "company":        "New Company Ltd",
  "roomExpiry":     "2026-02-10T12:00:00Z"
}
```

#### Response 200

```
0    // success (zero = no error)
```

or just HTTP 200 with empty body in some cases.

---

This covers the four requested endpoints: **get booking**, **new booking**, **get customer**, **new customer**, **update customer**.

Let me know if you want documentation for related endpoints (preorder, tags, tables, availability, etc.) or more code samples (cURL, Python requests, etc.).