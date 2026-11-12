// Operator details for Impressum, privacy policy and contact links.
// Change values here, then run ./deploy.sh – nothing else needs editing.

export const SITE = {
  contactEmail: 'kontakt@fseda.online',
  phone: '+43 677 61729258',

  // The person who runs the site until the foundation is registered.
  operator: {
    name: 'Marian Andreas Lehnert',
    address: ['Konrad-Deubler-Gasse 4', '8010 Graz', 'Österreich'],
  },

  foundation: {
    name: 'European Foundation for Digital Sovereignty and Open Education',
    // Set to true once the foundation is entered in the Stiftungs- und Fondsregister.
    // The Impressum then names the foundation as Medieninhaberin and shows the lines below.
    registered: false,
    registerEntry: '', // e.g. 'Stiftungs- und Fondsregister, Zahl …'
    uid: '', // e.g. 'ATU12345678' – leave empty if none
    board: ['Marian Andreas Lehnert'],
    authority: 'Landeshauptmann von Steiermark (Stiftungs- und Fondsbehörde gemäß § 14 BStFG 2015)',
  },

  // Server hosting (processor under Art. 28 GDPR).
  hosting: 'Contabo GmbH, Aschauer Straße 32a, 81549 München, Deutschland',

  privacyUpdated: '2026-11-09',
};
