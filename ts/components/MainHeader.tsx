import React from 'react';
import { debounce } from 'lodash';
import classNames from 'classnames';

// Use this to trigger whisper events
import { trigger } from '../shims/events';

// Use this to check for password
import { hasPassword } from '../shims/Signal';

import { Avatar } from './Avatar';
import { ContactName } from './conversation/ContactName';

import { cleanSearchTerm } from '../util/cleanSearchTerm';
import { LocalizerType } from '../types/Util';
import { SearchOptions } from '../types/Search';
import { clipboard } from 'electron';

import { validateNumber } from '../types/PhoneNumber';

declare global {
  interface Window {
    lokiFeatureFlags: any;
  }
}

interface MenuItem {
  id: string;
  name: string;
  onClick?: () => void;
}
export interface Props {
  searchTerm: string;

  // To be used as an ID
  ourNumber: string;
  regionCode: string;

  // For display
  phoneNumber: string;
  isMe: boolean;
  name?: string;
  color: string;
  verified: boolean;
  profileName?: string;
  avatarPath?: string;
  isSecondaryDevice: boolean;

  i18n: LocalizerType;
  updateSearchTerm: (searchTerm: string) => void;
  search: (query: string, options: SearchOptions) => void;
  clearSearch: () => void;

  onClick?: () => void;
  onCopyPublicKey?: () => void;
}

export class MainHeader extends React.Component<Props, any> {
  private readonly updateSearchBound: (
    event: React.FormEvent<HTMLInputElement>
  ) => void;
  private readonly clearSearchBound: () => void;
  private readonly copyFromClipboardBound: () => void;
  private readonly handleKeyUpBound: (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => void;
  private readonly setFocusBound: () => void;
  private readonly inputRef: React.RefObject<HTMLInputElement>;
  private readonly debouncedSearch: (searchTerm: string) => void;
  private readonly timerId: any;

  constructor(props: Props) {
    super(props);

    this.state = {
      expanded: false,
      hasPass: null,
      clipboardText: '',
      menuItems: [],
    };

    this.updateSearchBound = this.updateSearch.bind(this);
    this.clearSearchBound = this.clearSearch.bind(this);
    this.copyFromClipboardBound = this.copyFromClipboard.bind(this);
    this.handleKeyUpBound = this.handleKeyUp.bind(this);
    this.setFocusBound = this.setFocus.bind(this);
    this.inputRef = React.createRef();

    this.debouncedSearch = debounce(this.search.bind(this), 20);

    this.timerId = setInterval(() => {
      const clipboardText = clipboard.readText();
      if (this.state.clipboardText !== clipboardText) {
        this.setState({ clipboardText });
      }
    }, 100);
  }

  public componentWillMount() {
    // tslint:disable-next-line
    this.updateHasPass();
  }

  public componentWillUnmount() {
    // tslint:disable-next-line
    clearInterval(this.timerId);
  }

  public componentDidUpdate(_prevProps: Props, prevState: any) {
    if (
      prevState.hasPass !== this.state.hasPass ||
      _prevProps.isSecondaryDevice !== this.props.isSecondaryDevice
    ) {
      this.updateMenuItems();
    }
  }

  public search() {
    const {
      searchTerm,
      search,
      i18n,
      ourNumber,
      regionCode,
      isSecondaryDevice,
    } = this.props;
    if (search) {
      search(searchTerm, {
        noteToSelf: i18n('noteToSelf').toLowerCase(),
        ourNumber,
        regionCode,
        isSecondaryDevice,
      });
    }
  }

  public updateSearch(event: React.FormEvent<HTMLInputElement>) {
    const { updateSearchTerm, clearSearch } = this.props;
    const searchTerm = event.currentTarget.value;

    if (!searchTerm) {
      clearSearch();

      return;
    }

    if (updateSearchTerm) {
      updateSearchTerm(searchTerm);
    }

    if (searchTerm.length < 2) {
      return;
    }

    const cleanedTerm = cleanSearchTerm(searchTerm);
    if (!cleanedTerm) {
      return;
    }

    this.debouncedSearch(cleanedTerm);
  }

  public clearSearch() {
    const { clearSearch } = this.props;

    clearSearch();
    this.setFocus();
  }

  public copyFromClipboard() {
    const { clipboardText } = this.state;

    this.props.updateSearchTerm(clipboardText);
    this.debouncedSearch(clipboardText);
  }

  public handleKeyUp(event: React.KeyboardEvent<HTMLInputElement>) {
    const { clearSearch } = this.props;

    if (event.key === 'Escape') {
      clearSearch();
    }
  }

  public setFocus() {
    if (this.inputRef.current) {
      // @ts-ignore
      this.inputRef.current.focus();
    }
  }

  public render() {
    const { onClick } = this.props;

    return (
      <div role="button" className="module-main-header" onClick={onClick}>
        <div className="module-main-header__container">
          {this.renderName()}
          {this.renderMenu()}
        </div>
        {this.renderSearch()}
      </div>
    );
  }

  private renderName() {
    const {
      avatarPath,
      i18n,
      color,
      name,
      phoneNumber,
      profileName,
    } = this.props;

    const { expanded } = this.state;

    return (
      <div
        role="button"
        className="module-main-header__title"
        onClick={() => {
          this.setState({ expanded: !expanded });
        }}
      >
        <Avatar
          avatarPath={avatarPath}
          color={color}
          conversationType="direct"
          i18n={i18n}
          name={name}
          phoneNumber={phoneNumber}
          profileName={profileName}
          size={28}
        />
        <div className="module-main-header__contact-name">
          <ContactName
            phoneNumber={phoneNumber}
            profileName={profileName}
            i18n={i18n}
          />
        </div>
        <div
          className={classNames(
            'module-main-header-content-toggle',
            expanded && 'module-main-header-content-toggle-visible'
          )}
        />
      </div>
    );
  }

  private renderMenu() {
    const { expanded, menuItems } = this.state;

    return (
      <div className="module-main-header__menu">
        <div className={classNames('accordian', expanded && 'expanded')}>
          {menuItems.map((item: MenuItem) => (
            <div
              role="button"
              className="menu-item"
              key={item.id}
              onClick={item.onClick}
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  private shouldShowPaste() {
    const { searchTerm, i18n } = this.props;
    const { clipboardText } = this.state;

    const error = validateNumber(clipboardText, i18n);

    return !searchTerm && !error;
  }

  private renderSearch() {
    const { searchTerm, i18n } = this.props;

    return (
      <div className="module-main-header__search">
        <input
          type="text"
          ref={this.inputRef}
          className="module-main-header__search__input"
          placeholder={i18n('search')}
          dir="auto"
          onKeyUp={this.handleKeyUpBound}
          value={searchTerm}
          onChange={this.updateSearchBound}
        />
        {this.shouldShowPaste() ? (
          <span
            role="button"
            className="module-main-header__search__copy-from-clipboard"
            onClick={this.copyFromClipboardBound}
          />
        ) : null}
        <span
          role="button"
          className="module-main-header__search__icon"
          onClick={this.setFocusBound}
        />
        {searchTerm ? (
          <span
            role="button"
            className="module-main-header__search__cancel-icon"
            onClick={this.clearSearchBound}
          />
        ) : null}
      </div>
    );
  }

  private async updateHasPass() {
    const hasPass = await hasPassword();
    this.setState({ hasPass });
  }

  private updateMenuItems() {
    const { i18n, onCopyPublicKey, isSecondaryDevice } = this.props;
    const { hasPass } = this.state;

    const menuItems = [
      {
        id: 'copyPublicKey',
        name: i18n('copyPublicKey'),
        onClick: onCopyPublicKey,
      },
      {
        id: 'editProfile',
        name: i18n('editProfile'),
        onClick: () => {
          trigger('onEditProfile');
        },
      },
      {
        id: 'showSeed',
        name: i18n('showSeed'),
        onClick: () => {
          trigger('showSeedDialog');
        },
      },
      {
        id: 'showQRCode',
        name: i18n('showQRCode'),
        onClick: () => {
          trigger('showQRDialog');
        },
      },
      {
        id: 'nominatePurge',
        name: i18n('nominatePurge'),
        onClick: () => {
          trigger('showPurgeNominationDialog');
        },
      },
      {
        id: 'showAddServer',
        name: i18n('showAddServer'),
        onClick: () => {
          trigger('showAddServerDialog');
        },
      },
    ];

    if (window.lokiFeatureFlags.privateGroupChats) {
      menuItems.push({
        id: 'createPrivateGroup',
        name: i18n('createPrivateGroup'),
        onClick: () => {
          trigger('createNewGroup');
        },
      });
    }

    const passItem = (type: string) => ({
      id: `${type}Password`,
      name: i18n(`${type}Password`),
      onClick: () => {
        trigger('showPasswordDialog', {
          type,
          resolve: () => {
            trigger('showToast', {
              message: i18n(`${type}PasswordSuccess`),
            });
            setTimeout(async () => this.updateHasPass(), 100);
          },
        });
      },
    });

    if (hasPass) {
      menuItems.push(passItem('change'), passItem('remove'));
    } else {
      menuItems.push(passItem('set'));
    }

    if (!isSecondaryDevice) {
      menuItems.push({
        id: 'pairNewDevice',
        name: 'Device Pairing',
        onClick: () => {
          trigger('showDevicePairingDialog');
        },
      });
    } else {
      menuItems.push({
        id: 'showPairingWords',
        name: 'Show Pairing Words',
        onClick: () => {
          trigger('showDevicePairingWordsDialog');
        },
      });
    }

    this.setState({ menuItems });
  }
}
