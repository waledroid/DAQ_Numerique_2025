// Maps the last token of an autocomplete attribute to a profile key.
export const AUTOCOMPLETE_MAP: Record<string, string> = {
  'given-name': 'identity.firstName',
  'family-name': 'identity.lastName',
  name: 'identity.fullName',
  email: 'contact.email',
  tel: 'contact.phone',
  'tel-national': 'contact.phone',
  'street-address': 'address.street',
  'address-line1': 'address.street',
  'postal-code': 'address.postalCode',
  'address-level2': 'address.city',
  country: 'address.country',
  'country-name': 'address.country',
  bday: 'identity.birthDate',
  url: 'links.portfolio',
};

export const LABEL_SYNONYMS: Record<string, string[]> = {
  'identity.firstName': ['prenom', 'first name', 'firstname', 'given name'],
  'identity.lastName': ['nom de famille', 'nom', 'last name', 'lastname', 'surname', 'family name'],
  'identity.fullName': ['nom complet', 'full name', 'nom et prenom', 'nom prenom'],
  'identity.birthDate': ['date de naissance', 'date of birth', 'birth date', 'birthdate', 'ne le', 'nee le'],
  'identity.nationality': ['nationalite', 'nationality', 'citizenship'],
  'contact.email': ['adresse e mail', 'adresse email', 'email address', 'e mail', 'email', 'courriel', 'mail'],
  'contact.phone': ['numero de telephone', 'telephone portable', 'phone number', 'telephone', 'phone', 'mobile', 'portable', 'tel'],
  'address.street': ['adresse postale', 'address line 1', 'adresse', 'address', 'rue', 'street'],
  'address.city': ['ville', 'city', 'commune', 'town'],
  'address.postalCode': ['code postal', 'postal code', 'zip code', 'zip', 'cp'],
  'address.country': ['pays', 'country'],
  'eligibility.workPermit': ['permis de travail', 'work permit', 'autorise a travailler', 'authorized to work', 'work authorization', 'droit de travailler', 'legally entitled to work'],
  'eligibility.drivingLicence': ['permis de conduire', 'driving licence', 'driver s license', 'drivers license', 'permis b'],
  'links.linkedin': ['profil linkedin', 'linkedin url', 'linkedin profile', 'linkedin'],
  'links.portfolio': ['site personnel', 'personal website', 'portfolio', 'site web', 'website', 'github'],
  languages: ['langues parlees', 'spoken languages', 'langues', 'languages'],
  skills: ['competences cles', 'key skills', 'competences', 'skills'],
  'standardAnswers.salary': ['pretentions salariales', 'salary expectations', 'expected salary', 'remuneration souhaitee', 'salaire souhaite', 'salaire', 'salary', 'remuneration'],
  'standardAnswers.noticePeriod': ['periode de preavis', 'notice period', 'preavis', 'date de disponibilite', 'disponibilite', 'availability'],
  'standardAnswers.remotePreference': ['teletravail', 'remote work', 'travail a distance', 'remote'],
  'standardAnswers.coverLetter': ['lettre de motivation', 'cover letter', 'motivation'],
};

export const CV_FILE_SYNONYMS = ['cv', 'curriculum vitae', 'resume', 'votre cv'];
