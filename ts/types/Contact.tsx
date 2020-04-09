// @ts-ignore
import Attachments from '../../app/attachments';
import { format as formatPhoneNumber } from '../types/PhoneNumber';

export interface Contact {
  name?: Name;
  number?: Array<Phone>;
  email?: Array<Email>;
  address?: Array<PostalAddress>;
  avatar?: Avatar;
  organization?: string;
}

interface Name {
  givenName?: string;
  familyName?: string;
  prefix?: string;
  suffix?: string;
  middleName?: string;
  displayName?: string;
}

export enum ContactType {
  HOME = 1,
  MOBILE = 2,
  WORK = 3,
  CUSTOM = 4,
}

export enum AddressType {
  HOME = 1,
  WORK = 2,
  CUSTOM = 3,
}

export interface Phone {
  value: string;
  type: ContactType;
  label?: string;
}

export interface Email {
  value: string;
  type: ContactType;
  label?: string;
}

export interface PostalAddress {
  type: AddressType;
  label?: string;
  street?: string;
  pobox?: string;
  neighborhood?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
}

interface Avatar {
  avatar: Attachment;
  isProfile: boolean;
}

interface Attachment {
  path?: string;
  error?: boolean;
  pending?: boolean;
}

export function contactSelector(
  contact: Contact,
  options: {
    regionCode: string;
    hasSignalAccount: boolean;
    getAbsoluteAttachmentPath: (path: string) => string;
    onSendMessage: () => void;
    onClick: () => void;
  }
) {
  const {
    getAbsoluteAttachmentPath,
    hasSignalAccount,
    onClick,
    onSendMessage,
    regionCode,
  } = options;

  let { avatar } = contact;
  if (avatar && avatar.avatar) {
    if (avatar.avatar.error) {
      avatar = undefined;
    } else {
      avatar = {
        ...avatar,
        avatar: {
          ...avatar.avatar,
          path: avatar.avatar.path
            ? getAbsoluteAttachmentPath(avatar.avatar.path)
            : undefined,
        },
      };
    }
  }

  return {
    ...contact,
    hasSignalAccount,
    onSendMessage,
    onClick,
    avatar,
    number:
      contact.number &&
      contact.number.map((item) => ({
        ...item,
        value: formatPhoneNumber(item.value, {
          ourRegionCode: regionCode,
        }),
      })),
  };
}

export function getName(contact: Contact): string | undefined {
  const { name, organization } = contact;
  const displayName = (name && name.displayName) || undefined;
  const givenName = (name && name.givenName) || undefined;
  const familyName = (name && name.familyName) || undefined;
  const backupName =
    (givenName && familyName && `${givenName} ${familyName}`) || undefined;

  return displayName || organization || backupName || givenName || familyName;
}
