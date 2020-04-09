const crypto = require('crypto');

const ERRORS = {
  TYPE: 'Password must be a string',
  LENGTH: 'Password must be between 6 and 50 characters long',
  CHARACTER: 'Password must only contain letters, numbers and symbols',
};

const sha512 = text => {
  const hash = crypto.createHash('sha512');
  hash.update(text.trim());
  return hash.digest('hex');
};

const generateHash = phrase => phrase && sha512(phrase.trim());
const matchesHash = (phrase, hash) =>
  phrase && sha512(phrase.trim()) === hash.trim();

const validatePassword = (phrase, i18n) => {
  if (typeof phrase !== 'string') {
    return i18n ? i18n('passwordTypeError') : ERRORS.TYPE;
  }

  const trimmed = phrase.trim();
  if (trimmed.length < 6 || trimmed.length > 50) {
    return i18n ? i18n('passwordLengthError') : ERRORS.LENGTH;
  }

  // Restrict characters to letters, numbers and symbols
  const characterRegex = /^[a-zA-Z0-9-!()._`~@#$%^&*+=[\]{}|<>,;: ]+$/;
  if (!characterRegex.test(trimmed)) {
    return i18n ? i18n('passwordCharacterError') : ERRORS.CHARACTER;
  }

  return null;
};

module.exports = {
  generateHash,
  matchesHash,
  validatePassword,
};
