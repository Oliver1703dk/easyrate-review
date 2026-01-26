// Danish language templates for customer-facing messages

export const SMS_TEMPLATES = {
  reviewRequest: `Hej {{customerName}}! Tak for din ordre hos {{businessName}}. Vi vil meget gerne høre om din oplevelse: {{reviewLink}}`,
  reviewRequestShort: `Tak for besøget hos {{businessName}}! Del din oplevelse: {{reviewLink}}`,
} as const;

export const EMAIL_TEMPLATES = {
  reviewRequest: {
    subject: `Hvordan var din oplevelse hos {{businessName}}?`,
    body: `Hej {{customerName}},

Tak fordi du valgte {{businessName}}!

Vi sætter stor pris på din feedback og vil meget gerne høre om din oplevelse.

Del din mening her: {{reviewLink}}

Det tager kun et minut, og din feedback hjælper os med at blive bedre.

Med venlig hilsen,
{{businessName}}`,
  },
} as const;

export const LANDING_PAGE_TEXT = {
  // Rating screen
  ratingTitle: 'Hvordan var din oplevelse?',
  ratingSubtitle: 'Tryk på stjernerne for at bedømme',
  ratingFooter: 'Det tager kun 10 sekunder',
  ratingLabels: {
    1: 'Meget dårlig',
    2: 'Dårlig',
    3: 'Okay',
    4: 'God',
    5: 'Fremragende',
  } as const,

  // Negative feedback screen (1-3 stars)
  negativeFeedbackTitle: 'Tak for din feedback',
  negativeFeedbackSubtitle: 'Vi vil gerne blive bedre. Fortæl os hvordan.',
  negativeFeedbackPlaceholder: 'Kvalitet, service, ventetid eller andet...',
  negativeFeedbackSubmit: 'Send feedback',
  negativeFeedbackPrivacyNote: 'Din feedback er privat og vil kun blive delt med virksomheden',
  negativeFeedbackExternalOption: 'Del din oplevelse offentligt',

  // Positive prompt screen (4-5 stars)
  positivePromptTitle: 'Fantastisk',
  positivePromptSubtitle: 'Vil du dele din gode oplevelse?',
  positivePromptFooter: 'Det betyder meget for os',
  positivePromptSkip: 'Nej tak',
  positivePromptGoogle: 'Anmeld på Google',
  positivePromptInternalOption: 'Giv privat feedback i stedet',

  // Thank you screen
  thankYouTitle: 'Tak',
  thankYouMessage: 'Vi sætter stor pris på din feedback.',
  thankYouSubtext: 'Vi bruger den til at blive bedre hver dag.',
  thankYouTip: 'Vidste du at',
  thankYouTipText: 'din feedback hjælper os med at forbedre vores service for alle kunder?',

  // Legacy (for backwards compatibility)
  title: 'Hvordan var din oplevelse?',
  subtitle: 'Tryk på antallet af stjerner der bedst beskriver din oplevelse',
  feedbackPrompt: 'Fortæl os mere om din oplevelse',
  feedbackPlaceholder: 'Din feedback hjælper os med at blive bedre...',
  submitButton: 'Send feedback',
  googlePrompt: 'Vil du dele din positive oplevelse på Google?',
  googleButton: 'Skriv en Google anmeldelse',
  skipButton: 'Nej tak',
  thankYouTitleLegacy: 'Tak for din feedback!',
  thankYouMessageLegacy: 'Vi sætter stor pris på at du tog dig tid til at dele din oplevelse med os.',
} as const;

export const GDPR_TEXT = {
  consentLabel: 'Jeg accepterer at min feedback gemmes og behandles',
  privacyPolicyLink: 'Læs privatlivspolitik',
  exportButton: 'Eksporter data',
  exportCustomerButton: 'Eksporter kundedata',
  deleteCustomerButton: 'Slet kundedata',
  deleteAccountButton: 'Slet konto',
  deleteWarning: 'Denne handling kan ikke fortrydes',
  deleteConfirmTitle: 'Er du sikker?',
  deleteConfirmMessage: 'Alle data vil blive permanent slettet og kan ikke gendannes.',
  dataRetention: 'Dataopbevaring',
  dataRetentionDays: 'Opbevaringsperiode (dage)',
  applyRetention: 'Anvend opbevaringspolitik',
  privacyPolicyUrl: 'Privatlivspolitik URL',
  autoDelete: 'Automatisk sletning',
  lastRetentionRun: 'Sidst kørt',
} as const;

export const PHOTO_UPLOAD_TEXT = {
  addPhotos: 'Tilføj billeder',
  uploading: 'Uploader...',
  uploaded: 'Uploadet',
  photoCount: '{current} af {max} billeder',
  fileTooLarge: 'Filen er for stor. Maks {max}MB',
  invalidType: 'Ugyldig filtype. Kun JPG, PNG og WebP er tilladt',
  uploadError: 'Kunne ikke uploade billede. Prøv igen.',
  removePhoto: 'Fjern billede',
  maxPhotosReached: 'Maksimalt antal billeder nået',
} as const;

export const ERROR_MESSAGES = {
  generic: 'Der opstod en fejl. Prøv venligst igen.',
  notFound: 'Den ønskede ressource blev ikke fundet.',
  unauthorized: 'Du har ikke adgang til denne ressource.',
  validationFailed: 'De indtastede oplysninger er ugyldige.',
  rateLimited: 'For mange forsøg. Vent venligst lidt og prøv igen.',
  serverError: 'Der opstod en serverfejl. Prøv venligst igen senere.',
  // Landing page specific
  businessNotFound: 'Virksomheden blev ikke fundet.',
  invalidToken: 'Ugyldigt link. Prøv venligst igen.',
  reviewSubmitFailed: 'Kunne ikke gemme din feedback. Prøv venligst igen.',
  networkError: 'Ingen internetforbindelse. Tjek din forbindelse og prøv igen.',
  // Storage errors
  storageError: 'Fil upload fejlede. Prøv venligst igen.',
  fileTooLarge: 'Filen er for stor. Maks 5MB.',
  invalidFileType: 'Ugyldig filtype. Kun JPG, PNG og WebP er tilladt.',
  // GDPR errors
  consentRequired: 'Samtykke er påkrævet for at indsende feedback.',
  exportFailed: 'Kunne ikke eksportere data. Prøv venligst igen.',
  deleteFailed: 'Kunne ikke slette data. Prøv venligst igen.',
} as const;

export const SUCCESS_MESSAGES = {
  reviewSubmitted: 'Tak for din feedback!',
  settingsSaved: 'Dine indstillinger er gemt.',
  integrationConnected: 'Integration er forbundet.',
  messageSent: 'Beskeden er sendt.',
} as const;

export const DASHBOARD_TEXT = {
  nav: {
    overview: 'Oversigt',
    reviews: 'Anmeldelser',
    integrations: 'Integrationer',
    flow: 'Flow',
    settings: 'Indstillinger',
    logout: 'Log ud',
  },
  flow: {
    title: 'Flow / Automatisering',
    subtitle: 'Visualiser din anmeldelsesflow',
    nodes: {
      order_complete: 'Ordre fuldført',
      order_complete_desc: 'Trigger fra integration',
      send_sms: 'Send SMS',
      send_sms_desc: 'Besked til kunde',
      send_email: 'Send Email',
      send_email_desc: 'Email til kunde',
      landing_page: 'Landing Page',
      landing_page_desc: '1-5 stjerne bedømmelse',
      rating_branch: 'Bedømmelse',
      rating_branch_desc: 'Routing baseret på stjerner',
      internal_feedback: 'Intern Feedback',
      internal_feedback_desc: 'Privat feedback formular',
      external_review: 'Ekstern Anmeldelse',
      external_review_desc: 'Google Review prompt',
      thank_you: 'Tak Side',
      thank_you_desc: 'Afslutning af flow',
    },
    sidebar: {
      title: 'Flow Oversigt',
      channelsActive: 'Aktive kanaler',
      nodeConfig: 'Node Konfiguration',
      landingPreview: 'Landing Page Preview',
      ratingType: 'Bedømmelsestype',
      headline: 'Overskrift',
      subheadline: 'Undertitel',
      condition1: 'Betingelse 1',
      condition2: 'Betingelse 2',
    },
    validation: {
      atLeastOneRequired: 'Mindst én kanal skal være aktiv',
    },
    branches: {
      negative: '1-3 stjerner',
      positive: '4-5 stjerner',
    },
    status: {
      active: 'Aktiv',
      inactive: 'Inaktiv',
    },
  },
  overview: {
    title: 'Anmeldelsessystem / Analytics',
    totalReviews: 'Total anmeldelser',
    avgRating: 'Gns. rating',
    customersRequested: 'Kunder anmodet',
    responseRate: 'Svarprocent',
    smsSent: 'SMS sendt',
    emailSent: 'Email sendt',
    channelPerformance: 'Kanalperformance',
    internalFeedback: 'Intern Anmeldelse Performance',
    vsLast: 'vs. sidst',
    sent: 'Sendt',
    opened: 'Åbnet',
    reviews: 'Anmeldelser',
    conversion: 'Konvertering',
    email: 'Email',
    sms: 'SMS',
    feedbackReceived: 'Feedback modtaget',
    responded: 'Besvaret',
    avgResponseTime: 'Gns. svartid',
    pending: 'Afventer',
    hours: 'timer',
    noData: 'Ingen data endnu',
  },
  reviews: {
    title: 'Anmeldelser',
    search: 'Søg i anmeldelser...',
    filterRating: 'Bedømmelse',
    filterStatus: 'Status',
    filterSource: 'Kilde',
    filterDate: 'Dato',
    allRatings: 'Alle bedømmelser',
    allStatuses: 'Alle',
    allSources: 'Alle kilder',
    answered: 'Besvaret',
    unanswered: 'Ubesvaret',
    noReviews: 'Ingen anmeldelser fundet',
    noReviewsSubtext: 'Anmeldelser vil vises her, når dine kunder har givet feedback.',
    stars: 'stjerner',
    star: 'stjerne',
    from: 'Fra',
    externalReview: 'Ekstern anmeldelse',
    internalFeedback: 'Intern feedback',
  },
  integrations: {
    title: 'Integrationer',
    subtitle: 'Forbind dine platforme for automatisk at indsamle anmeldelser',
    connected: 'Forbundet',
    notConnected: 'Ikke forbundet',
    configure: 'Konfigurer',
    disconnect: 'Afbryd',
    testConnection: 'Test API',
    testing: 'Tester...',
    testSuccess: 'Forbindelse lykkedes!',
    testFailed: 'Forbindelse fejlede',
    dully: {
      name: 'Dully',
      description: 'Takeaway og levering platform',
      setupTitle: 'Opsætning af Dully integration',
      apiKeyLabel: 'API Nøgle',
      apiKeyPlaceholder: 'Indtast din Dully API nøgle',
      webhookUrlLabel: 'Webhook URL',
      webhookUrlDescription: 'Kopier denne URL og tilføj den i Dully admin',
      benefits: [
        'Automatisk anmeldelsesanmodning efter levering',
        'Synkronisering af ordredata',
        'Kundeoplysninger importeres automatisk',
      ],
    },
    easytable: {
      name: 'EasyTable',
      description: 'Bordreservations platform',
      setupTitle: 'Opsætning af EasyTable integration',
      apiKeyLabel: 'API Nøgle',
      apiKeyPlaceholder: 'Indtast din EasyTable API nøgle',
      placeTokenLabel: 'Place Token',
      placeTokenPlaceholder: 'Indtast dit Place Token',
      benefits: [
        'Automatisk anmeldelsesanmodning efter besøg',
        'Synkronisering af reservationsdata',
        'Gæsteoplysninger importeres automatisk',
      ],
    },
  },
  settings: {
    title: 'Indstillinger',
    profile: {
      title: 'Profil',
      businessName: 'Virksomhedsnavn',
      email: 'Email',
      phone: 'Telefon',
      address: 'Adresse',
    },
    templates: {
      title: 'Beskedskabeloner',
      smsTemplate: 'SMS skabelon',
      emailTemplate: 'Email skabelon',
      variables: 'Tilgængelige variabler',
      variableCustomerName: '{{customerName}} - Kundens navn',
      variableBusinessName: '{{businessName}} - Din virksomheds navn',
      variableReviewLink: '{{reviewLink}} - Link til anmeldelse',
    },
    branding: {
      title: 'Branding',
      primaryColor: 'Primær farve',
      logoUrl: 'Logo URL',
      logoUrlPlaceholder: 'https://example.com/logo.png',
      preview: 'Forhåndsvisning',
    },
    googleReview: {
      title: 'Google Anmeldelser',
      urlLabel: 'Google Review URL',
      urlPlaceholder: 'Indsæt din Google Review URL',
      urlHelp: 'Find din URL i Google Business Profile',
    },
    save: 'Gem ændringer',
    saving: 'Gemmer...',
    saved: 'Ændringer gemt',
  },
  auth: {
    login: 'Log ind',
    register: 'Opret konto',
    email: 'Email',
    password: 'Adgangskode',
    confirmPassword: 'Bekræft adgangskode',
    name: 'Dit navn',
    businessName: 'Virksomhedsnavn',
    forgotPassword: 'Glemt adgangskode?',
    noAccount: 'Har du ikke en konto?',
    hasAccount: 'Har du allerede en konto?',
    createAccount: 'Opret konto',
    loggingIn: 'Logger ind...',
    registering: 'Opretter konto...',
    loginError: 'Forkert email eller adgangskode',
    registerError: 'Kunne ikke oprette konto',
    passwordMismatch: 'Adgangskoderne matcher ikke',
    welcomeTitle: 'Velkommen til EasyRate',
    welcomeSubtitle: 'Log ind for at se dine anmeldelser',
    registerTitle: 'Kom i gang med EasyRate',
    registerSubtitle: 'Opret en konto for at begynde at indsamle anmeldelser',
  },
  common: {
    loading: 'Indlæser...',
    error: 'Der opstod en fejl',
    retry: 'Prøv igen',
    cancel: 'Annuller',
    save: 'Gem',
    delete: 'Slet',
    edit: 'Rediger',
    close: 'Luk',
    back: 'Tilbage',
    next: 'Næste',
    yes: 'Ja',
    no: 'Nej',
  },
} as const;
