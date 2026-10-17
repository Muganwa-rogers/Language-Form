// Edit this file to change payment details, upload limits, and the backend URL.

/** Google Apps Script web app URL (ends in /exec). Paste it after deploying. */
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyL31BOwhFWbF8SBhpSZI430vsZKsgcnQvejHr5FUr8yIqrqL0r1vhprBIaJFvJSAgcuw/exec";

export const PROGRAM_NAME = "Rwanda Language Program";

export const MAX_UPLOAD_MB = 5;
export const ACCEPTED_MIME = ["image/jpeg", "image/png", "application/pdf"] as const;

export const PAYMENT_METHODS = [
  {
    id: "MTN",
    name: "MTN Mobile Money",
    short: "MTN MoMo",
    number: "0795675504",
    ussd: "*182*1*1*0795675504#",
    tone: "mtn",
  },
  {
    id: "Airtel",
    name: "Airtel Money",
    short: "Airtel Money",
    number: "0795675504",
    // Verify this sequence with Airtel before launch.
    ussd: "*182*1*2*0795675504#",
    tone: "airtel",
  },
] as const;

export const COURSES = [
  {
    id: "Kinyarwanda",
    title: "Kinyarwanda",
    audience: "For foreigners & international residents",
    description:
      "Learn Kinyarwanda for everyday communication, cultural understanding, and life in Rwanda.",
    details: [] as string[], // optional extra lines, e.g. schedule or price
  },
  {
    id: "English",
    title: "English",
    audience: "For local learners",
    description: "Improve your English communication skills with confidence.",
    details: [] as string[],
  },
] as const;

export const LEVELS = ["Beginner", "Intermediate", "Advanced", "Not sure"] as const;

export const DECLARATION =
  "I confirm that I personally made this payment using a mobile money account registered in my own legal name. The name on the payment record must match the full legal name provided in this application. I understand that third-party payments are not accepted.";
