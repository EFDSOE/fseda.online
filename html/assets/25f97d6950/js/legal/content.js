// Legal texts (Impressum and privacy policy) in all five languages.
// The German version is the legally binding one; the others are translations.
// Operator data comes from site-config.js – edit it there, not here.
import { SITE } from '../site-config.js';

const mail = { link: `mailto:${SITE.contactEmail}`, text: SITE.contactEmail };
const tel = { link: `tel:${SITE.phone.replace(/\s/g, '')}`, text: SITE.phone };
const F = SITE.foundation;
const O = SITE.operator;
const registered = F.registered;

// Building blocks: a section is { h, body: [...] } where each body item is
// a paragraph (array of strings / {link,text}), { lines: [...] } or { list: [...] }.
const p = (...parts) => parts;

function impressumSections(L) {
  const s = [];
  if (registered) {
    s.push({ h: L.ownerFoundation, body: [{ lines: [F.name, L.legalForm, ...O.address] }] });
  } else {
    s.push({ h: L.ownerPerson, body: [{ lines: [O.name, ...O.address] }] });
  }
  s.push({ h: L.contact, body: [p(`${L.email}: `, mail), p(`${L.phone}: `, tel)] });
  if (registered) {
    const reg = [F.registerEntry, F.uid ? `UID: ${F.uid}` : ''].filter(Boolean);
    if (reg.length) s.push({ h: L.register, body: [{ lines: reg }] });
    s.push({ h: L.organs, body: [p(`${L.board}: ${F.board.join(', ')}`)] });
    s.push({ h: L.authority, body: [p(F.authority)] });
  } else {
    s.push({ h: L.inFoundingTitle, body: [p(L.inFounding)] });
  }
  s.push({ h: registered ? L.purpose : L.plannedPurpose, body: [p(L.purposeText)] });
  s.push({ h: L.direction, body: [p(L.directionText)] });
  s.push({ h: L.dsaTitle, body: [p(L.dsaText), p(`${L.email}: `, mail), p(L.dsaLanguages), p(L.dsaReport)] });
  return s;
}

function privacySections(L) {
  const controller = registered ? [F.name, ...O.address] : [O.name, ...O.address];
  return [
    { h: L.pController, body: [{ lines: controller }, p(`${L.email}: `, mail)] },
    { h: L.pOverview, body: [p(L.pOverviewText)] },
    { h: L.pAccount, body: [{ list: L.pAccountList }, p(L.pAccountBasis)] },
    { h: L.pLearning, body: [p(L.pLearningText)] },
    { h: L.pTeaching, body: [p(L.pTeachingText)] },
    { h: L.pLogs, body: [p(L.pLogsText), p(L.pLogsBasis)] },
    { h: L.pCookies, body: [{ list: L.pCookiesList }, p(L.pCookiesText)] },
    { h: L.pHosting, body: [p(L.pHostingText(SITE.hosting))] },
    { h: L.pRetention, body: [{ list: L.pRetentionList }] },
    { h: L.pRights, body: [p(L.pRightsText), p(`${L.email}: `, mail), p(L.pComplaint)] },
    { h: L.pSecurity, body: [p(L.pSecurityText)] },
  ];
}

const T = {
  de: {
    impressumTitle: 'Impressum und Offenlegung',
    impressumSub: 'gemäß § 5 ECG und § 25 MedienG',
    ownerPerson: 'Medieninhaber und Betreiber',
    ownerFoundation: 'Medieninhaberin und Betreiberin',
    legalForm: 'Gemeinnützige Stiftung nach dem Bundes-Stiftungs- und Fondsgesetz 2015',
    contact: 'Kontakt',
    email: 'E-Mail',
    phone: 'Telefon',
    register: 'Register',
    organs: 'Vertretungsbefugte Organe',
    board: 'Vorstand',
    authority: 'Aufsichtsbehörde',
    inFoundingTitle: 'Stiftung in Gründung',
    inFounding: `fseda.online wird künftig von der „${F.name}“ betrieben, einer gemeinnützigen Stiftung nach dem Bundes-Stiftungs- und Fondsgesetz 2015 mit Sitz in Graz, die sich derzeit in Gründung befindet. Bis zu ihrer Eintragung ist ${O.name} persönlich Medieninhaber und für die Inhalte verantwortlich.`,
    purpose: 'Stiftungszweck',
    plannedPurpose: 'Geplanter Stiftungszweck',
    purposeText: 'Förderung von digitaler Souveränität, Offenheit und Demokratisierung durch frei zugängliche, mehrsprachige Open-Source-Bildungsangebote und unabhängige europäische Infrastrukturen.',
    direction: 'Grundlegende Richtung',
    directionText: 'Unabhängige, paneuropäische Online-Lernplattform zur Förderung digitaler Bildung, Souveränität und des gemeinsamen Wissensaustauschs in den Sprachen Deutsch, Englisch, Französisch, Spanisch und Portugiesisch.',
    dsaTitle: 'Kontaktstelle nach dem Digital Services Act',
    dsaText: 'Zentrale Kontaktstelle nach Art. 11 und 12 der Verordnung (EU) 2022/2065 für Behörden der Mitgliedstaaten, die Europäische Kommission, das Europäische Gremium für digitale Dienste sowie für Nutzerinnen und Nutzer:',
    dsaLanguages: 'Sprachen für die Kommunikation: Deutsch, Englisch.',
    dsaReport: 'Rechtswidrige Inhalte kannst du über den Link „Inhalt melden“ auf jeder Kurs- und Lektionsseite oder per E-Mail an die obige Adresse melden.',

    privacyTitle: 'Datenschutzerklärung',
    privacyUpdated: 'Stand',
    pController: 'Verantwortlicher',
    pOverview: 'Kurz zusammengefasst',
    pOverviewText: 'Wir verarbeiten nur die Daten, die für den Betrieb der Lernplattform nötig sind. Es gibt keine Werbung, kein Tracking, keine Analysedienste und keine eingebundenen Inhalte von Drittanbietern wie Google Fonts oder Social-Media-Plugins.',
    pAccount: 'Benutzerkonto',
    pAccountList: [
      'Name und E-Mail-Adresse',
      'Passwort – gespeichert nur als nicht umkehrbarer Hash (scrypt), nie im Klartext',
      'bevorzugte Sprache, Rolle (Lernende, Kursleitung, Administration) und Registrierungsdatum',
    ],
    pAccountBasis: 'Zweck ist die Bereitstellung deines Kontos. Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO). Ohne Name, E-Mail-Adresse und Passwort ist keine Registrierung möglich.',
    pLearning: 'Lernfortschritt',
    pLearningText: 'Wir speichern, welche Kurse du belegt und welche Lektionen du als erledigt markiert hast, jeweils mit Zeitpunkt, damit du auf jedem Gerät dort weitermachen kannst, wo du aufgehört hast (Art. 6 Abs. 1 lit. b DSGVO).',
    pTeaching: 'Kursleitung',
    pTeachingText: 'Wenn du als Kursleitung Kurse veröffentlichst, sind dein Name als Kursleitung sowie die Kursinhalte für alle Besucherinnen und Besucher sichtbar (Art. 6 Abs. 1 lit. b DSGVO).',
    pLogs: 'Server-Protokolle',
    pLogsText: 'Bei jedem Aufruf speichert der Webserver IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Statuscode, übertragene Datenmenge, Referrer und Browserkennung. Für den Schutz vor missbräuchlichen Anmeldeversuchen wird die IP-Adresse zusätzlich kurzzeitig im Arbeitsspeicher gehalten (höchstens eine Stunde).',
    pLogsBasis: 'Zweck ist der sichere und stabile Betrieb, insbesondere die Abwehr von Angriffen. Rechtsgrundlage ist unser berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO). Die Protokolle werden nach 14 Tagen automatisch gelöscht.',
    pCookies: 'Cookies und lokaler Speicher',
    pCookiesList: [
      '„fseda_sid“ – hält dich angemeldet, gültig höchstens 30 Tage, wird beim Abmelden gelöscht',
      '„fseda.lang“ (lokaler Speicher deines Browsers) – merkt sich die gewählte Sprache',
    ],
    pCookiesText: 'Beide sind für die von dir angeforderten Funktionen technisch notwendig (§ 165 Abs. 3 TKG 2021). Darüber hinaus setzen wir keine Cookies.',
    pHosting: 'Hosting',
    pHostingText: (h) => `Die Plattform läuft auf einem Server von ${h}, der in unserem Auftrag tätig ist (Auftragsverarbeitung nach Art. 28 DSGVO). Eine Übermittlung in Länder außerhalb der EU findet nicht statt. Eine sonstige Weitergabe deiner Daten an Dritte erfolgt nicht, außer wir sind gesetzlich dazu verpflichtet.`,
    pRetention: 'Speicherdauer',
    pRetentionList: [
      'Kontodaten und Lernfortschritt: bis du dein Konto löschst',
      'Server-Protokolle: 14 Tage',
      'Datensicherungen: tägliche Sicherungen werden 14 Tage aufbewahrt; gelöschte Daten verschwinden daher spätestens 14 Tage nach der Löschung auch aus den Sicherungen',
    ],
    pRights: 'Deine Rechte',
    pRightsText: 'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO). Dein Konto kannst du jederzeit selbst unter „Konto“ löschen. Für alle anderen Anliegen schreib uns:',
    pComplaint: 'Du kannst dich außerdem bei der Österreichischen Datenschutzbehörde beschweren: Barichgasse 40–42, 1030 Wien, www.dsb.gv.at.',
    pSecurity: 'Sicherheit',
    pSecurityText: 'Alle Verbindungen sind per HTTPS verschlüsselt. Es findet keine automatisierte Entscheidungsfindung und kein Profiling statt.',

    translationNote: '',
  },

  en: {
    impressumTitle: 'Legal notice',
    impressumSub: 'pursuant to § 5 ECG and § 25 MedienG (Austria)',
    ownerPerson: 'Media owner and operator',
    ownerFoundation: 'Media owner and operator',
    legalForm: 'Non-profit foundation under the Austrian Federal Foundations and Funds Act 2015 (BStFG 2015)',
    contact: 'Contact',
    email: 'Email',
    phone: 'Phone',
    register: 'Register',
    organs: 'Authorised representatives',
    board: 'Board',
    authority: 'Supervisory authority',
    inFoundingTitle: 'Foundation being established',
    inFounding: `fseda.online will be operated by the “${F.name}”, a non-profit foundation under the Austrian Federal Foundations and Funds Act 2015 based in Graz, which is currently being established. Until it is registered, ${O.name} is personally the media owner and responsible for the content.`,
    purpose: 'Purpose of the foundation',
    plannedPurpose: 'Planned purpose of the foundation',
    purposeText: 'Promoting digital sovereignty, openness and democratisation through freely accessible, multilingual open-source education and independent European infrastructure.',
    direction: 'Editorial direction',
    directionText: 'An independent, pan-European online learning platform promoting digital education, sovereignty and the shared exchange of knowledge in German, English, French, Spanish and Portuguese.',
    dsaTitle: 'Point of contact under the Digital Services Act',
    dsaText: 'Single point of contact under Articles 11 and 12 of Regulation (EU) 2022/2065 for Member State authorities, the European Commission, the European Board for Digital Services and for users:',
    dsaLanguages: 'Languages for communication: German, English.',
    dsaReport: 'You can report illegal content using the “Report content” link on every course and lesson page, or by email to the address above.',

    privacyTitle: 'Privacy policy',
    privacyUpdated: 'Last updated',
    pController: 'Controller',
    pOverview: 'In short',
    pOverviewText: 'We only process the data needed to run the learning platform. There is no advertising, no tracking, no analytics and no embedded third-party content such as Google Fonts or social media plugins.',
    pAccount: 'User account',
    pAccountList: [
      'Name and email address',
      'Password – stored only as an irreversible hash (scrypt), never in plain text',
      'Preferred language, role (learner, instructor, administrator) and registration date',
    ],
    pAccountBasis: 'The purpose is to provide your account. The legal basis is the performance of the user agreement (Art. 6(1)(b) GDPR). You cannot register without a name, email address and password.',
    pLearning: 'Learning progress',
    pLearningText: 'We store which courses you have enrolled in and which lessons you have marked as done, with timestamps, so you can continue where you left off on any device (Art. 6(1)(b) GDPR).',
    pTeaching: 'Instructors',
    pTeachingText: 'If you publish courses as an instructor, your name as the instructor and the course content are visible to all visitors (Art. 6(1)(b) GDPR).',
    pLogs: 'Server logs',
    pLogsText: 'For every request the web server records the IP address, date and time, requested address, status code, amount of data transferred, referrer and browser identifier. To protect against abusive login attempts, the IP address is also kept briefly in memory (one hour at most).',
    pLogsBasis: 'The purpose is secure and stable operation, in particular defending against attacks. The legal basis is our legitimate interest (Art. 6(1)(f) GDPR). Logs are deleted automatically after 14 days.',
    pCookies: 'Cookies and local storage',
    pCookiesList: [
      '“fseda_sid” – keeps you logged in, valid for at most 30 days, deleted when you log out',
      '“fseda.lang” (your browser’s local storage) – remembers the language you chose',
    ],
    pCookiesText: 'Both are strictly necessary for the functions you request (§ 165(3) TKG 2021). We set no other cookies.',
    pHosting: 'Hosting',
    pHostingText: (h) => `The platform runs on a server provided by ${h}, acting on our behalf (processing under Art. 28 GDPR). No data is transferred to countries outside the EU. We do not otherwise share your data with third parties unless required by law.`,
    pRetention: 'Retention',
    pRetentionList: [
      'Account data and learning progress: until you delete your account',
      'Server logs: 14 days',
      'Backups: daily backups are kept for 14 days, so deleted data disappears from backups no later than 14 days after deletion',
    ],
    pRights: 'Your rights',
    pRightsText: 'You have the right of access, rectification, erasure, restriction of processing, data portability and objection (Art. 15 to 21 GDPR). You can delete your account yourself at any time under “Account”. For anything else, write to us:',
    pComplaint: 'You can also lodge a complaint with the Austrian Data Protection Authority: Barichgasse 40–42, 1030 Vienna, www.dsb.gv.at.',
    pSecurity: 'Security',
    pSecurityText: 'All connections are encrypted with HTTPS. There is no automated decision-making and no profiling.',

    translationNote: 'This is a translation for your information. Only the German version is legally binding.',
  },

  fr: {
    impressumTitle: 'Mentions légales',
    impressumSub: 'conformément au § 5 ECG et au § 25 MedienG (Autriche)',
    ownerPerson: 'Propriétaire du média et exploitant',
    ownerFoundation: 'Propriétaire du média et exploitante',
    legalForm: 'Fondation d’utilité publique au sens de la loi fédérale autrichienne sur les fondations et fonds de 2015 (BStFG 2015)',
    contact: 'Contact',
    email: 'E-mail',
    phone: 'Téléphone',
    register: 'Registre',
    organs: 'Organes de représentation',
    board: 'Conseil d’administration',
    authority: 'Autorité de surveillance',
    inFoundingTitle: 'Fondation en cours de création',
    inFounding: `fseda.online sera exploitée par la « ${F.name} », une fondation d’utilité publique au sens de la loi fédérale autrichienne sur les fondations et fonds de 2015, dont le siège est à Graz et qui est en cours de création. Jusqu’à son enregistrement, ${O.name} est personnellement propriétaire du média et responsable des contenus.`,
    purpose: 'Objet de la fondation',
    plannedPurpose: 'Objet prévu de la fondation',
    purposeText: 'Promouvoir la souveraineté numérique, l’ouverture et la démocratisation grâce à des offres éducatives open source multilingues et librement accessibles ainsi qu’à des infrastructures européennes indépendantes.',
    direction: 'Ligne éditoriale',
    directionText: 'Plateforme d’apprentissage en ligne indépendante et paneuropéenne pour promouvoir l’éducation numérique, la souveraineté et le partage collaboratif des connaissances en allemand, anglais, français, espagnol et portugais.',
    dsaTitle: 'Point de contact au titre du règlement sur les services numériques',
    dsaText: 'Point de contact unique au sens des articles 11 et 12 du règlement (UE) 2022/2065 pour les autorités des États membres, la Commission européenne, le Comité européen des services numériques ainsi que pour les utilisateurs :',
    dsaLanguages: 'Langues de communication : allemand, anglais.',
    dsaReport: 'Tu peux signaler un contenu illicite via le lien « Signaler un contenu » sur chaque page de cours et de leçon, ou par e-mail à l’adresse ci-dessus.',

    privacyTitle: 'Politique de confidentialité',
    privacyUpdated: 'Mise à jour',
    pController: 'Responsable du traitement',
    pOverview: 'En bref',
    pOverviewText: 'Nous ne traitons que les données nécessaires au fonctionnement de la plateforme. Pas de publicité, pas de suivi, pas d’outils d’analyse et aucun contenu tiers intégré comme Google Fonts ou des modules de réseaux sociaux.',
    pAccount: 'Compte utilisateur',
    pAccountList: [
      'Nom et adresse e-mail',
      'Mot de passe – enregistré uniquement sous forme de hachage irréversible (scrypt), jamais en clair',
      'Langue préférée, rôle (apprenant·e, formateur·rice, administration) et date d’inscription',
    ],
    pAccountBasis: 'La finalité est la mise à disposition de ton compte. La base juridique est l’exécution du contrat d’utilisation (art. 6, par. 1, point b du RGPD). L’inscription n’est pas possible sans nom, adresse e-mail et mot de passe.',
    pLearning: 'Progression',
    pLearningText: 'Nous enregistrons les cours auxquels tu es inscrit·e et les leçons que tu as marquées comme terminées, avec la date, afin que tu puisses reprendre sur n’importe quel appareil (art. 6, par. 1, point b du RGPD).',
    pTeaching: 'Formateur·rices',
    pTeachingText: 'Si tu publies des cours en tant que formateur·rice, ton nom et le contenu des cours sont visibles par tous les visiteurs (art. 6, par. 1, point b du RGPD).',
    pLogs: 'Journaux du serveur',
    pLogsText: 'À chaque requête, le serveur web enregistre l’adresse IP, la date et l’heure, l’adresse consultée, le code de statut, le volume de données transféré, le référent et l’identifiant du navigateur. Pour se protéger contre les tentatives de connexion abusives, l’adresse IP est en outre conservée brièvement en mémoire (une heure au maximum).',
    pLogsBasis: 'La finalité est un fonctionnement sûr et stable, notamment la défense contre les attaques. La base juridique est notre intérêt légitime (art. 6, par. 1, point f du RGPD). Les journaux sont supprimés automatiquement après 14 jours.',
    pCookies: 'Cookies et stockage local',
    pCookiesList: [
      '« fseda_sid » – te garde connecté·e, valable 30 jours au maximum, supprimé à la déconnexion',
      '« fseda.lang » (stockage local de ton navigateur) – mémorise la langue choisie',
    ],
    pCookiesText: 'Les deux sont strictement nécessaires aux fonctions que tu demandes (§ 165, al. 3 TKG 2021). Nous ne déposons aucun autre cookie.',
    pHosting: 'Hébergement',
    pHostingText: (h) => `La plateforme fonctionne sur un serveur de ${h}, qui agit pour notre compte (sous-traitance au sens de l’art. 28 du RGPD). Aucune donnée n’est transférée hors de l’UE. Nous ne transmettons pas tes données à des tiers, sauf obligation légale.`,
    pRetention: 'Durée de conservation',
    pRetentionList: [
      'Données de compte et progression : jusqu’à la suppression de ton compte',
      'Journaux du serveur : 14 jours',
      'Sauvegardes : les sauvegardes quotidiennes sont conservées 14 jours ; les données supprimées disparaissent donc des sauvegardes au plus tard 14 jours après leur suppression',
    ],
    pRights: 'Tes droits',
    pRightsText: 'Tu disposes d’un droit d’accès, de rectification, d’effacement, de limitation du traitement, de portabilité et d’opposition (art. 15 à 21 du RGPD). Tu peux supprimer ton compte toi-même à tout moment sous « Compte ». Pour toute autre demande, écris-nous :',
    pComplaint: 'Tu peux également introduire une réclamation auprès de l’autorité autrichienne de protection des données : Barichgasse 40–42, 1030 Vienne, www.dsb.gv.at.',
    pSecurity: 'Sécurité',
    pSecurityText: 'Toutes les connexions sont chiffrées en HTTPS. Il n’y a ni prise de décision automatisée ni profilage.',

    translationNote: 'Ceci est une traduction fournie à titre d’information. Seule la version allemande fait foi.',
  },

  es: {
    impressumTitle: 'Aviso legal',
    impressumSub: 'conforme al § 5 ECG y al § 25 MedienG (Austria)',
    ownerPerson: 'Titular y responsable del sitio',
    ownerFoundation: 'Titular y responsable del sitio',
    legalForm: 'Fundación sin ánimo de lucro conforme a la Ley Federal austriaca de Fundaciones y Fondos de 2015 (BStFG 2015)',
    contact: 'Contacto',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    register: 'Registro',
    organs: 'Órganos de representación',
    board: 'Patronato',
    authority: 'Autoridad de supervisión',
    inFoundingTitle: 'Fundación en constitución',
    inFounding: `fseda.online será gestionada por la «${F.name}», una fundación sin ánimo de lucro conforme a la Ley Federal austriaca de Fundaciones y Fondos de 2015, con sede en Graz, que se encuentra en proceso de constitución. Hasta su inscripción, ${O.name} es personalmente el titular y responsable de los contenidos.`,
    purpose: 'Fines de la fundación',
    plannedPurpose: 'Fines previstos de la fundación',
    purposeText: 'Promover la soberanía digital, la apertura y la democratización mediante ofertas educativas de código abierto, multilingües y de libre acceso, así como infraestructuras europeas independientes.',
    direction: 'Línea editorial',
    directionText: 'Plataforma de aprendizaje en línea independiente y paneuropea para fomentar la educación digital, la soberanía y el intercambio colaborativo de conocimientos en alemán, inglés, francés, español y portugués.',
    dsaTitle: 'Punto de contacto según el Reglamento de Servicios Digitales',
    dsaText: 'Punto único de contacto conforme a los artículos 11 y 12 del Reglamento (UE) 2022/2065 para las autoridades de los Estados miembros, la Comisión Europea, la Junta Europea de Servicios Digitales y para los usuarios:',
    dsaLanguages: 'Idiomas de comunicación: alemán, inglés.',
    dsaReport: 'Puedes denunciar contenidos ilícitos mediante el enlace «Denunciar contenido» de cada página de curso y de lección, o por correo electrónico a la dirección anterior.',

    privacyTitle: 'Política de privacidad',
    privacyUpdated: 'Última actualización',
    pController: 'Responsable del tratamiento',
    pOverview: 'En resumen',
    pOverviewText: 'Solo tratamos los datos necesarios para el funcionamiento de la plataforma. No hay publicidad, ni seguimiento, ni servicios de análisis, ni contenidos integrados de terceros como Google Fonts o complementos de redes sociales.',
    pAccount: 'Cuenta de usuario',
    pAccountList: [
      'Nombre y dirección de correo electrónico',
      'Contraseña: se guarda solo como hash irreversible (scrypt), nunca en texto plano',
      'Idioma preferido, rol (estudiante, docente, administración) y fecha de registro',
    ],
    pAccountBasis: 'La finalidad es proporcionarte tu cuenta. La base jurídica es la ejecución del contrato de uso (art. 6.1.b del RGPD). Sin nombre, correo electrónico y contraseña no es posible registrarse.',
    pLearning: 'Progreso de aprendizaje',
    pLearningText: 'Guardamos en qué cursos te has inscrito y qué lecciones has marcado como completadas, con fecha y hora, para que puedas continuar en cualquier dispositivo (art. 6.1.b del RGPD).',
    pTeaching: 'Docentes',
    pTeachingText: 'Si publicas cursos como docente, tu nombre como docente y el contenido de los cursos son visibles para todos los visitantes (art. 6.1.b del RGPD).',
    pLogs: 'Registros del servidor',
    pLogsText: 'En cada solicitud, el servidor web registra la dirección IP, la fecha y la hora, la dirección solicitada, el código de estado, el volumen de datos transferido, la página de referencia y el identificador del navegador. Para protegernos de intentos abusivos de inicio de sesión, la dirección IP se conserva además brevemente en memoria (como máximo una hora).',
    pLogsBasis: 'La finalidad es un funcionamiento seguro y estable, en particular la defensa frente a ataques. La base jurídica es nuestro interés legítimo (art. 6.1.f del RGPD). Los registros se eliminan automáticamente a los 14 días.',
    pCookies: 'Cookies y almacenamiento local',
    pCookiesList: [
      '«fseda_sid»: mantiene tu sesión iniciada, válida como máximo 30 días, se elimina al cerrar sesión',
      '«fseda.lang» (almacenamiento local de tu navegador): recuerda el idioma elegido',
    ],
    pCookiesText: 'Ambos son técnicamente necesarios para las funciones que solicitas (§ 165.3 TKG 2021). No utilizamos ninguna otra cookie.',
    pHosting: 'Alojamiento',
    pHostingText: (h) => `La plataforma funciona en un servidor de ${h}, que actúa por encargo nuestro (encargo de tratamiento según el art. 28 del RGPD). No se transfieren datos fuera de la UE. No cedemos tus datos a terceros, salvo obligación legal.`,
    pRetention: 'Plazo de conservación',
    pRetentionList: [
      'Datos de la cuenta y progreso: hasta que elimines tu cuenta',
      'Registros del servidor: 14 días',
      'Copias de seguridad: las copias diarias se conservan 14 días; por eso, los datos eliminados desaparecen de las copias como máximo 14 días después',
    ],
    pRights: 'Tus derechos',
    pRightsText: 'Tienes derecho de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición (arts. 15 a 21 del RGPD). Puedes eliminar tu cuenta tú mismo en cualquier momento en «Cuenta». Para cualquier otra solicitud, escríbenos:',
    pComplaint: 'También puedes presentar una reclamación ante la Autoridad austriaca de Protección de Datos: Barichgasse 40–42, 1030 Viena, www.dsb.gv.at.',
    pSecurity: 'Seguridad',
    pSecurityText: 'Todas las conexiones están cifradas mediante HTTPS. No hay decisiones automatizadas ni elaboración de perfiles.',

    translationNote: 'Esta es una traducción a título informativo. Solo la versión alemana es jurídicamente vinculante.',
  },

  pt: {
    impressumTitle: 'Informação legal',
    impressumSub: 'nos termos do § 5 ECG e do § 25 MedienG (Áustria)',
    ownerPerson: 'Proprietário e responsável pelo site',
    ownerFoundation: 'Proprietária e responsável pelo site',
    legalForm: 'Fundação de utilidade pública nos termos da Lei Federal austríaca das Fundações e Fundos de 2015 (BStFG 2015)',
    contact: 'Contacto',
    email: 'E-mail',
    phone: 'Telefone',
    register: 'Registo',
    organs: 'Órgãos de representação',
    board: 'Direção',
    authority: 'Autoridade de supervisão',
    inFoundingTitle: 'Fundação em constituição',
    inFounding: `O fseda.online será gerido pela «${F.name}», uma fundação de utilidade pública nos termos da Lei Federal austríaca das Fundações e Fundos de 2015, com sede em Graz, que se encontra em constituição. Até ao seu registo, ${O.name} é pessoalmente o proprietário e responsável pelos conteúdos.`,
    purpose: 'Fins da fundação',
    plannedPurpose: 'Fins previstos da fundação',
    purposeText: 'Promover a soberania digital, a abertura e a democratização através de ofertas educativas de código aberto, multilingues e de acesso livre, bem como de infraestruturas europeias independentes.',
    direction: 'Linha editorial',
    directionText: 'Plataforma de aprendizagem online independente e pan-europeia para promover a educação digital, a soberania e a partilha colaborativa de conhecimento em alemão, inglês, francês, espanhol e português.',
    dsaTitle: 'Ponto de contacto nos termos do Regulamento dos Serviços Digitais',
    dsaText: 'Ponto de contacto único nos termos dos artigos 11.º e 12.º do Regulamento (UE) 2022/2065 para as autoridades dos Estados-Membros, a Comissão Europeia, o Comité Europeu dos Serviços Digitais e para os utilizadores:',
    dsaLanguages: 'Línguas de comunicação: alemão, inglês.',
    dsaReport: 'Podes denunciar conteúdos ilegais através da ligação «Denunciar conteúdo» em cada página de curso e de lição, ou por e-mail para o endereço acima.',

    privacyTitle: 'Política de privacidade',
    privacyUpdated: 'Última atualização',
    pController: 'Responsável pelo tratamento',
    pOverview: 'Em resumo',
    pOverviewText: 'Tratamos apenas os dados necessários ao funcionamento da plataforma. Não há publicidade, rastreamento, serviços de análise nem conteúdos de terceiros incorporados, como Google Fonts ou plugins de redes sociais.',
    pAccount: 'Conta de utilizador',
    pAccountList: [
      'Nome e endereço de e-mail',
      'Palavra-passe – guardada apenas como hash irreversível (scrypt), nunca em texto simples',
      'Idioma preferido, função (estudante, formador(a), administração) e data de registo',
    ],
    pAccountBasis: 'A finalidade é disponibilizar a tua conta. O fundamento jurídico é a execução do contrato de utilização (art. 6.º, n.º 1, alínea b) do RGPD). Sem nome, e-mail e palavra-passe não é possível registar-te.',
    pLearning: 'Progresso de aprendizagem',
    pLearningText: 'Guardamos em que cursos te inscreveste e que lições marcaste como concluídas, com data e hora, para que possas continuar em qualquer dispositivo (art. 6.º, n.º 1, alínea b) do RGPD).',
    pTeaching: 'Formadores',
    pTeachingText: 'Se publicares cursos como formador(a), o teu nome e os conteúdos dos cursos ficam visíveis para todos os visitantes (art. 6.º, n.º 1, alínea b) do RGPD).',
    pLogs: 'Registos do servidor',
    pLogsText: 'Em cada pedido, o servidor web regista o endereço IP, a data e a hora, o endereço pedido, o código de estado, o volume de dados transferido, a página de origem e a identificação do navegador. Para proteção contra tentativas abusivas de início de sessão, o endereço IP é ainda mantido brevemente em memória (no máximo uma hora).',
    pLogsBasis: 'A finalidade é um funcionamento seguro e estável, em especial a defesa contra ataques. O fundamento jurídico é o nosso interesse legítimo (art. 6.º, n.º 1, alínea f) do RGPD). Os registos são eliminados automaticamente ao fim de 14 dias.',
    pCookies: 'Cookies e armazenamento local',
    pCookiesList: [
      '«fseda_sid» – mantém a tua sessão iniciada, válido no máximo 30 dias, eliminado ao terminar a sessão',
      '«fseda.lang» (armazenamento local do teu navegador) – memoriza o idioma escolhido',
    ],
    pCookiesText: 'Ambos são estritamente necessários para as funções que pedes (§ 165, n.º 3, TKG 2021). Não utilizamos outros cookies.',
    pHosting: 'Alojamento',
    pHostingText: (h) => `A plataforma funciona num servidor da ${h}, que atua por nossa conta (subcontratação nos termos do art. 28.º do RGPD). Não há transferência de dados para fora da UE. Não partilhamos os teus dados com terceiros, salvo obrigação legal.`,
    pRetention: 'Prazo de conservação',
    pRetentionList: [
      'Dados da conta e progresso: até eliminares a tua conta',
      'Registos do servidor: 14 dias',
      'Cópias de segurança: as cópias diárias são guardadas 14 dias; os dados eliminados desaparecem das cópias, no máximo, 14 dias após a eliminação',
    ],
    pRights: 'Os teus direitos',
    pRightsText: 'Tens direito de acesso, retificação, apagamento, limitação do tratamento, portabilidade e oposição (arts. 15.º a 21.º do RGPD). Podes eliminar a tua conta a qualquer momento em «Conta». Para outros pedidos, escreve-nos:',
    pComplaint: 'Podes também apresentar reclamação junto da Autoridade austríaca de Proteção de Dados: Barichgasse 40–42, 1030 Viena, www.dsb.gv.at.',
    pSecurity: 'Segurança',
    pSecurityText: 'Todas as ligações são cifradas por HTTPS. Não há decisões automatizadas nem definição de perfis.',

    translationNote: 'Esta é uma tradução para tua informação. Apenas a versão alemã é juridicamente vinculativa.',
  },
};

export function legalPage(kind, lang) {
  const L = T[lang] || T.de;
  if (kind === 'impressum') {
    return { title: L.impressumTitle, sub: L.impressumSub, note: L.translationNote, sections: impressumSections(L) };
  }
  return {
    title: L.privacyTitle,
    sub: `${L.privacyUpdated}: ${SITE.privacyUpdated}`,
    note: L.translationNote,
    sections: privacySections(L),
  };
}
