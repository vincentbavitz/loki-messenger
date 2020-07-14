import { NumberUtils } from './utils';

// Default TTL
export const TTL_DEFAULT = {
  PAIRING_REQUEST: NumberUtils.timeAsMs(2, 'minutes'),
  DEVICE_UNPAIRING: NumberUtils.timeAsMs(4, 'days'),
  SESSION_REQUEST: NumberUtils.timeAsMs(4, 'days'),
  SESSION_ESTABLISHED: NumberUtils.timeAsMs(2, 'days'),
  END_SESSION_MESSAGE: NumberUtils.timeAsMs(4, 'days'),
  TYPING_MESSAGE: NumberUtils.timeAsMs(1, 'minute'),
  ONLINE_BROADCAST: NumberUtils.timeAsMs(1, 'minute'),
  REGULAR_MESSAGE: NumberUtils.timeAsMs(2, 'days'),
};

const CLOSED_GROUP_MAX_NAME_LENGTH = 32;
export const CLOSED_GROUP = {
  // No trailing or leading (space, hyphen, underscore)
  NAME_REGEX: new RegExp(
    `^(?![ -_])([\\w- ]{1,${CLOSED_GROUP_MAX_NAME_LENGTH}})(?<![ -_])$`
  ),
  MAX_NAME_LENGTH: CLOSED_GROUP_MAX_NAME_LENGTH,
  // Capped due to proof of work limitations
  MAX_SMALL_GROUP_MEMBERS: 10,
};
