import { APP_NAME } from './app';
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_GOVERNING_LAW,
  LEGAL_OPERATOR_NAME,
  LEGAL_VENUE,
} from './legalMeta';

export const TERMS_LAST_UPDATED = 'July 19, 2026';

export const TERMS_SECTIONS: Array<{ heading?: string; body: string }> = [
  {
    body: `These Terms of Use (“Terms”) govern your access to and use of ${APP_NAME}, including our mobile applications and related services (the “Service”). By creating an account, signing in, or using the Service, you agree to these Terms. If you do not agree, do not use the Service.`,
  },
  {
    heading: '1. Who we are',
    body: `${APP_NAME} is a household and group organizing app that helps people share tasks, calendars, trips, expenses, documents, reminders, and related information with invited members. These Terms are between you and ${LEGAL_OPERATOR_NAME} (“we,” “us,” or “our”).`,
  },
  {
    heading: '2. Eligibility',
    body: `You must be able to form a binding contract in your jurisdiction to use the Service. If you use the Service on behalf of a household or organization, you confirm you have authority to accept these Terms for that use. The Service is not directed to children under 13, and we do not knowingly collect personal information from children under 13.`,
  },
  {
    heading: '3. Accounts',
    body: `You may create an account with email and password or through supported sign-in providers such as Google. You must provide accurate information and keep your credentials secure. You are responsible for activity under your account. Notify us promptly through in-app feedback if you believe your account has been compromised. We may suspend or terminate accounts that violate these Terms or that create risk to the Service or other users.`,
  },
  {
    heading: '4. Groups, invites, and shared content',
    body: `${APP_NAME} allows you to create or join groups and invite others. Group owners and managers may control membership and certain settings. Content you add—such as tasks, calendar items, trip plans, expenses, documents, comments, and messages—may be visible to other members of that group according to the visibility and sharing features of the Service. You are responsible for who you invite and for the content you post. Do not upload or share unlawful, harmful, infringing, or abusive content, and do not use the Service to harass others or to process others’ personal data without a lawful basis.`,
  },
  {
    heading: '5. Expenses and balances',
    body: `Expense tracking, balances, and settlement features are tools to help group members record and reconcile shared costs. ${APP_NAME} does not process payments between users, is not a bank or money transmitter, and is not a party to any payment arrangement between members. You are solely responsible for verifying amounts and settling debts outside the app. We are not responsible for disputes between users regarding money, reimbursement, or recorded settlements.`,
  },
  {
    heading: '6. Acceptable use',
    body: `You agree not to: (a) misuse the Service or attempt to disrupt it; (b) reverse engineer or access the Service except as allowed by law; (c) scrape or harvest data except through features we provide; (d) impersonate others; (e) probe or breach security; or (f) use the Service in violation of applicable law. We may remove content or restrict access when we reasonably believe these rules have been broken.`,
  },
  {
    heading: '7. Intellectual property',
    body: `We and our licensors own the Service, including software, branding, and design. You retain rights to content you submit. You grant us a limited license to host, store, display, and process that content solely to operate and improve the Service and to make it available to members you share it with.`,
  },
  {
    heading: '8. Third-party services',
    body: `The Service relies on third parties such as cloud infrastructure, authentication providers (including Google sign-in where enabled), and push notification services. Your use of those providers may also be subject to their terms and policies. We are not responsible for third-party services we do not control.`,
  },
  {
    heading: '9. Disclaimers',
    body: `THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT DATA WILL NEVER BE LOST. Reminder and notification features depend on device settings, permissions, and third-party delivery and may not always arrive on time.`,
  },
  {
    heading: '10. Limitation of liability',
    body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) USD $50 IF YOU HAVE NOT PAID US. Some jurisdictions do not allow certain limitations; in those places, our liability is limited to the fullest extent allowed.`,
  },
  {
    heading: '11. Indemnity',
    body: `You agree to defend and indemnify us from claims, damages, and expenses (including reasonable attorneys’ fees) arising from your content, your use of the Service, your invites or group activity, or your violation of these Terms or applicable law, except to the extent caused by our willful misconduct.`,
  },
  {
    heading: '12. Changes to the Service or Terms',
    body: `We may update the Service and these Terms from time to time. If changes are material, we will provide notice in the app or by other reasonable means. Continued use after the effective date of updated Terms constitutes acceptance, except where applicable law requires additional consent.`,
  },
  {
    heading: '13. Termination',
    body: `You may stop using the Service at any time. We may suspend or end access if you violate these Terms or if we discontinue the Service. Provisions that by their nature should survive (including intellectual property, disclaimers, limitations of liability, and indemnity) will survive termination.`,
  },
  {
    heading: '14. Governing law',
    body: `These Terms are governed by the laws of ${LEGAL_GOVERNING_LAW}, without regard to conflict-of-law rules, except where mandatory consumer protections in your place of residence apply. Subject to those protections, exclusive venue for disputes arising out of or relating to these Terms or the Service is in the ${LEGAL_VENUE}.`,
  },
  {
    heading: '15. Contact',
    body: `For questions about these Terms, email ${LEGAL_CONTACT_EMAIL}, or use the in-app feedback option in Settings after you create an account.`,
  },
];
