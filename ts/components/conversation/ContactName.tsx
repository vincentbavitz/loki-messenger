import React from 'react';
import classNames from 'classnames';

import { Emojify } from './Emojify';
import { LocalizerType } from '../../types/Util';
import { SessionVerifiedCheck } from '../session/SessionVerifiedCheck';

interface Props {
  phoneNumber: string;
  name?: string;
  profileName?: string;
  i18n: LocalizerType;
  module?: string;
  boldProfileName?: Boolean;
  compact?: Boolean;
  isLnsVerified?: Boolean;
}

export class ContactName extends React.Component<Props> {
  public render() {
    const {
      phoneNumber,
      name,
      profileName,
      i18n,
      module,
      boldProfileName,
      compact,
      isLnsVerified,
    } = this.props;
    const prefix = module ? module : 'module-contact-name';

    const title = name ? name : phoneNumber;
    const shouldShowProfile = Boolean(profileName && !name);
    const styles = (boldProfileName
      ? {
          fontWeight: 'bold',
        }
      : {}) as React.CSSProperties;
    const profileElement = shouldShowProfile ? (
      <span style={styles} className={classNames(`${prefix}__profile-name`, isLnsVerified && 'verified')}>
        <Emojify text={profileName || ''} i18n={i18n} />
        <SessionVerifiedCheck />
      </span>
    ) : null;

    return (
      <span className={classNames(prefix, compact && 'compact')} dir="auto">
        {profileElement}
        {shouldShowProfile ? ' ' : null}
        <span
          className={classNames(
            `${prefix}__profile-number`,
            shouldShowProfile && 'italic'
          )}
        >
          <Emojify text={title} i18n={i18n} />
        </span>
      </span>
    );
  }
}
