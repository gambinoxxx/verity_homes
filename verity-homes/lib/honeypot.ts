// Anti-spam honeypot shared by the enquiry and newsletter forms. People never see it; bots that
// fill every field do. Its name and label must NOT look like anything browser / phone autofill
// or a password manager fills: the old field was called "company" (label "Company"), which
// Chrome, Safari and password managers fill from the visitor's saved details — that silently
// rejected real enquiries (Unit 21 incident, 25 Nov 2026). Tested in
// tests/unit/enquiry-action.test.ts.
export const HONEYPOT_FIELD = "vh_trap";

/** Props for the hidden input (spread onto <input>). */
export const honeypotInputProps = {
  name: HONEYPOT_FIELD,
  type: "text",
  tabIndex: -1,
  autoComplete: "off",
  // 1Password, LastPass, Dashlane, Bitwarden: don't touch this field.
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-form-type": "other",
  "data-bwignore": "true",
} as const;

/** The label text: meaningless to autofill heuristics, clear to a screen-reader user who lands on it. */
export const HONEYPOT_LABEL = "Leave this field empty";
