const commonPage = require('./common.page');

module.exports = {
  // conversation view
  sessionLoader: commonPage.divWithClass('session-loader'),
  leftPaneOverlay: commonPage.divWithClass('module-left-pane-overlay'),
  sendMessageTextarea: commonPage.textAreaWithPlaceholder('Type your message'),
  sendFriendRequestTextarea: commonPage.textAreaWithPlaceholder(
    'Send your first message'
  ),
  existingSendMessageText: textMessage =>
    `//*[contains(@class, "module-message__text--outgoing")and .//span[contains(@class, "text-selectable")][contains(string(), '${textMessage}')]]`,
  existingFriendRequestText: textMessage =>
    `//*[contains(@class, "module-message-friend-request__container")and .//span[contains(@class, "text-selectable")][contains(string(), '${textMessage}')]]`,
  existingReceivedMessageText: textMessage =>
    `//*[contains(@class, "module-message__text--incoming")and .//span[contains(@class, "text-selectable")][contains(string(), '${textMessage}')]]`,

  // conversations
  conversationButtonSection:
    '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "chatBubble")]]',
  retrySendButton: commonPage.divWithClassAndText(
    'module-friend-request__buttonContainer--outgoing',
    'Retry Send'
  ),
  headerTitleMembers: number =>
    commonPage.spanWithClassAndText(
      'module-conversation-header__title-text',
      `${number} members`
    ),

  // channels
  globeButtonSection:
    '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "globe")]]',
  joinOpenGroupButton: commonPage.divRoleButtonWithText('Join Open Group'),
  openGroupInputUrl: commonPage.textAreaWithPlaceholder('chat.getsession.org'),
  sessionToastJoinOpenGroupSuccess: commonPage.toastWithText(
    'Successfully connected to new open group server'
  ),
  sessionToastJoinOpenGroupAlreadyExist: commonPage.toastWithText(
    'You are already connected to this public channel'
  ),
  rowOpenGroupConversationName: groupName =>
    commonPage.spanWithClassAndText(
      'module-conversation__user__profile-number',
      groupName
    ),

  // closed group
  createClosedGroupButton: commonPage.divRoleButtonWithText(
    'Create Closed Group'
  ),
  closedGroupNameTextarea: commonPage.textAreaWithPlaceholder(
    'Enter a group name'
  ),
  createClosedGroupMemberItem: commonPage.divWithClass('session-member-item'),
  createClosedGroupMemberItemSelected: commonPage.divWithClass(
    'session-member-item selected'
  ),
  validateCreationClosedGroupButton: commonPage.divRoleButtonWithText(
    'Create Closed Group'
  ),
  sessionToastGroupCreatedSuccess: commonPage.toastWithText(
    'Group created successfully'
  ),
  headerTitleGroupName: groupname =>
    commonPage.spanWithClassAndText(
      'module-contact-name__profile-name',
      groupname
    ),

  // contacts
  contactsButtonSection:
    '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "users")]]',
  addContactButton: commonPage.divRoleButtonWithText('Add Contact'),
  sessionIDInput: commonPage.textAreaWithPlaceholder('Enter a Session ID'),
  nextButton: commonPage.divRoleButtonWithText('Next'),
  oneNotificationFriendRequestLeft:
    '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "users")]  and .//*[contains(@class, "notification-count") and contains(string(), "1")] ]',
  oneNotificationFriendRequestTop:
    '//*[contains(@class,"notification-count hover") and contains(string(), "1")]',
  friendRequestFromUser: (displayName, pubkey) =>
    `//*[contains(@class,"module-left-pane__list-popup")  and .//*[contains(@class, "module-conversation__user") and .//*[contains(string(), "${displayName}")] and .//*[contains(string(), "(...${pubkey.substring(
      60
    )})")]]]`,
  acceptFriendRequestButton:
    '//*[contains(@role, "button")][contains(@class, "session-button")][contains(string(), "Accept")]',
  acceptedFriendRequestMessage:
    '//*[contains(@class, "module-friend-request__title")][contains(string(), "Friend request accepted")]',

  // settings
  settingsButtonSection:
    '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "gear")]]',
  deviceSettingsRow:
    '//*[contains(@class, "left-pane-setting-category-list-item")][contains(string(), "Devices")]',

  descriptionDeleteAccount: commonPage.spanWithClassAndText(
    'session-confirm-main-message',
    'Are you sure you want to delete your account?'
  ),
  validateDeleteAccount: commonPage.divRoleButtonDangerWithText('OK'),

  // device linking
  noPairedDeviceMessage:
    '//*[contains(@class, "session-settings-item__title")][contains(string(), "No linked devices")]',
  linkDeviceButton: commonPage.divRoleButtonWithText('Link New Device'),
  linkDeviceButtonDisabled: commonPage.divRoleButtonWithTextDisabled(
    'Link New Device'
  ),
  devicePairingDialog: '//*[contains(@class,"device-pairing-dialog")]',
  qrImageDiv: commonPage.divWithClass('qr-image'),
  allowPairingButton: commonPage.divRoleButtonWithText('Allow Linking'),
  okButton: commonPage.divRoleButtonWithText('OK'),
  devicePairedDescription: secretWords =>
    commonPage.divWithClassAndText(
      'session-settings-item__description',
      secretWords
    ),
  unpairDeviceButton: commonPage.divRoleButtonDangerWithText('Unlink Device'),
  deleteAccountButton: commonPage.divRoleButtonDangerWithText('Delete Account'),
  validateUnpairDevice: commonPage.divRoleButtonDangerWithText('Unlink'),
};
