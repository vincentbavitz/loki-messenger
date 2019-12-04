/* global
  $,
  _,
  Backbone,
  ConversationController,
  getAccountManager,
  Signal,
  storage,
  textsecure,
  Whisper,
  libloki,
  libsignal,
  StringView,
  BlockedNumberController
*/

// eslint-disable-next-line func-names
(async function() {
  'use strict';

  // Globally disable drag and drop
  document.body.addEventListener(
    'dragover',
    e => {
      e.preventDefault();
      e.stopPropagation();
    },
    false
  );
  document.body.addEventListener(
    'drop',
    e => {
      e.preventDefault();
      e.stopPropagation();
    },
    false
  );

  // Load these images now to ensure that they don't flicker on first use
  const images = [];
  function preload(list) {
    for (let index = 0, max = list.length; index < max; index += 1) {
      const image = new Image();
      image.src = `./images/${list[index]}`;
      images.push(image);
    }
  }
  preload([
    'alert-outline.svg',
    'android.svg',
    'apple.svg',
    'appstore.svg',
    'audio.svg',
    'back.svg',
    'chat-bubble-outline.svg',
    'chat-bubble.svg',
    'check-circle-outline.svg',
    'check.svg',
    'clock.svg',
    'close-circle.svg',
    'crown.svg',
    'delete.svg',
    'dots-horizontal.svg',
    'double-check.svg',
    'down.svg',
    'download.svg',
    'ellipsis.svg',
    'error.svg',
    'error_red.svg',
    'file-gradient.svg',
    'file.svg',
    'folder-outline.svg',
    'forward.svg',
    'gear.svg',
    'group_default.png',
    'hourglass_empty.svg',
    'hourglass_full.svg',
    'icon_1024.png',
    'icon_16.png',
    'icon_256.png',
    'icon_32.png',
    'icon_48.png',
    'image.svg',
    'import.svg',
    'lead-pencil.svg',
    'menu.svg',
    'microphone.svg',
    'movie.svg',
    'open_link.svg',
    'paperclip.svg',
    'play.svg',
    'playstore.png',
    'read.svg',
    'reply.svg',
    'save.svg',
    'search.svg',
    'sending.svg',
    'shield.svg',
    'signal-laptop.png',
    'signal-phone.png',
    'smile.svg',
    'sync.svg',
    'timer-00.svg',
    'timer-05.svg',
    'timer-10.svg',
    'timer-15.svg',
    'timer-20.svg',
    'timer-25.svg',
    'timer-30.svg',
    'timer-35.svg',
    'timer-40.svg',
    'timer-45.svg',
    'timer-50.svg',
    'timer-55.svg',
    'timer-60.svg',
    'timer.svg',
    'verified-check.svg',
    'video.svg',
    'voice.svg',
    'warning.svg',
    'x.svg',
    'x_white.svg',
    'icon-paste.svg',
    'loki/loki_icon_text.png',
    'loki/loki_icon_128.png',
  ]);

  // We add this to window here because the default Node context is erased at the end
  //   of preload.js processing
  window.setImmediate = window.nodeSetImmediate;

  const { IdleDetector, MessageDataMigrator } = Signal.Workflow;
  const {
    mandatoryMessageUpgrade,
    migrateAllToSQLCipher,
    removeDatabase,
    runMigrations,
    doesDatabaseExist,
  } = Signal.IndexedDB;
  const { Errors, Message } = window.Signal.Types;
  const {
    upgradeMessageSchema,
    writeNewAttachmentData,
    deleteAttachmentData,
  } = window.Signal.Migrations;
  const { Views } = window.Signal;

  // Implicitly used in `indexeddb-backbonejs-adapter`:
  // https://github.com/signalapp/Signal-Desktop/blob/4033a9f8137e62ed286170ed5d4941982b1d3a64/components/indexeddb-backbonejs-adapter/backbone-indexeddb.js#L569
  window.onInvalidStateError = error =>
    window.log.error(error && error.stack ? error.stack : error);

  window.log.info('background page reloaded');
  window.log.info('environment:', window.getEnvironment());

  let idleDetector;
  let initialLoadComplete = false;
  let newVersion = false;

  window.owsDesktopApp = {};
  window.document.title = window.getTitle();

  // start a background worker for ecc
  textsecure.startWorker('js/libsignal-protocol-worker.js');
  Whisper.KeyChangeListener.init(textsecure.storage.protocol);
  textsecure.storage.protocol.on('removePreKey', () => {
    getAccountManager().refreshPreKeys();
  });

  let messageReceiver;
  window.getSocketStatus = () => {
    if (messageReceiver) {
      return messageReceiver.getStatus();
    }
    return -1;
  };
  Whisper.events = _.clone(Backbone.Events);
  Whisper.events.isListenedTo = eventName =>
    Whisper.events._events ? !!Whisper.events._events[eventName] : false;
  let accountManager;
  window.getAccountManager = () => {
    if (!accountManager) {
      const USERNAME = storage.get('number_id');
      const PASSWORD = storage.get('password');
      accountManager = new textsecure.AccountManager(USERNAME, PASSWORD);
      accountManager.addEventListener('registration', () => {
        const user = {
          regionCode: window.storage.get('regionCode'),
          ourNumber: textsecure.storage.user.getNumber(),
          isSecondaryDevice: !!textsecure.storage.get('isSecondaryDevice'),
        };
        Whisper.events.trigger('userChanged', user);

        Whisper.Registration.markDone();
        window.log.info('dispatching registration event');
        Whisper.events.trigger('registration_done');
      });
    }
    return accountManager;
  };

  const cancelInitializationMessage = Views.Initialization.setMessage();

  const isIndexedDBPresent = await doesDatabaseExist();
  if (isIndexedDBPresent) {
    window.installStorage(window.legacyStorage);
    window.log.info('Start IndexedDB migrations');
    await runMigrations();
  }

  window.log.info('Storage fetch');
  storage.fetch();

  let specialConvInited = false;
  const initSpecialConversations = async () => {
    if (specialConvInited) {
      return;
    }
    const rssFeedConversations = await window.Signal.Data.getAllRssFeedConversations(
      {
        ConversationCollection: Whisper.ConversationCollection,
      }
    );
    rssFeedConversations.forEach(conversation => {
      window.feeds.push(new window.LokiRssAPI(conversation.getRssSettings()));
    });
    const publicConversations = await window.Signal.Data.getAllPublicConversations(
      {
        ConversationCollection: Whisper.ConversationCollection,
      }
    );
    publicConversations.forEach(conversation => {
      // weird but create the object and does everything we need
      conversation.getPublicSendData();
    });
    specialConvInited = true;
  };

  const initAPIs = async () => {
    if (window.initialisedAPI) {
      return;
    }
    const ourKey = textsecure.storage.user.getNumber();
    window.feeds = [];
    window.lokiMessageAPI = new window.LokiMessageAPI(ourKey);
    // singleton to relay events to libtextsecure/message_receiver
    window.lokiPublicChatAPI = new window.LokiPublicChatAPI(ourKey);
    // singleton to interface the File server
    // If already exists we registered as a secondary device
    if (!window.lokiFileServerAPI) {
      window.lokiFileServerAPIFactory = new window.LokiFileServerAPI(ourKey);
      window.lokiFileServerAPI = await window.lokiFileServerAPIFactory.establishHomeConnection(
        window.getDefaultFileServer()
      );
    }
    // are there limits on tracking, is this unneeded?
    // window.mixpanel.track("Desktop boot");
    window.lokiP2pAPI = new window.LokiP2pAPI(ourKey);
    window.lokiP2pAPI.on('pingContact', pubKey => {
      const isPing = true;
      libloki.api.sendOnlineBroadcastMessage(pubKey, isPing);
    });
    window.lokiP2pAPI.on('online', ConversationController._handleOnline);
    window.lokiP2pAPI.on('offline', ConversationController._handleOffline);
    window.initialisedAPI = true;

    if (storage.get('isSecondaryDevice')) {
      window.lokiFileServerAPI.updateOurDeviceMapping();
    }
  };

  function mapOldThemeToNew(theme) {
    switch (theme) {
      case 'dark':
      case 'light':
        return theme;
      case 'android-dark':
        return 'dark';
      case 'android':
      case 'ios':
      default:
        return 'light';
    }
  }

  function startLocalLokiServer() {
    if (window.localLokiServer) {
      return;
    }
    const pems = window.getSelfSignedCert();
    window.localLokiServer = new window.LocalLokiServer(pems);
  }

  // We need this 'first' check because we don't want to start the app up any other time
  //   than the first time. And storage.fetch() will cause onready() to fire.
  let first = true;
  storage.onready(async () => {
    if (!first) {
      return;
    }
    first = false;

    const currentPoWDifficulty = storage.get('PoWDifficulty', null);
    if (!currentPoWDifficulty) {
      storage.put('PoWDifficulty', window.getDefaultPoWDifficulty());
    }

    // Ensure accounts created prior to 1.0.0-beta8 do have their
    // 'primaryDevicePubKey' defined.
    if (
      Whisper.Registration.isDone() &&
      !storage.get('primaryDevicePubKey', null)
    ) {
      storage.put('primaryDevicePubKey', textsecure.storage.user.getNumber());
    }

    // These make key operations available to IPC handlers created in preload.js
    window.Events = {
      getDeviceName: () => textsecure.storage.user.getDeviceName(),

      getThemeSetting: () => storage.get('theme-setting', 'light'),
      setThemeSetting: value => {
        storage.put('theme-setting', value);
        onChangeTheme();
      },
      getHideMenuBar: () => storage.get('hide-menu-bar'),
      setHideMenuBar: value => {
        storage.put('hide-menu-bar', value);
        window.setAutoHideMenuBar(value);
        window.setMenuBarVisibility(!value);
      },

      getMessageTTL: () => storage.get('message-ttl', 24),
      setMessageTTL: value => {
        // Make sure the ttl is between a given range and is valid
        const intValue = parseInt(value, 10);
        const ttl = Number.isNaN(intValue) ? 24 : intValue;
        storage.put('message-ttl', ttl);
      },

      getReadReceiptSetting: () => storage.get('read-receipt-setting'),
      setReadReceiptSetting: value =>
        storage.put('read-receipt-setting', value),

      getTypingIndicatorsSetting: () =>
        storage.get('typing-indicators-setting'),
      setTypingIndicatorsSetting: value =>
        storage.put('typing-indicators-setting', value),

      getLinkPreviewSetting: () => storage.get('linkPreviews', false),
      setLinkPreviewSetting: value => storage.put('linkPreviews', value),

      getNotificationSetting: () =>
        storage.get('notification-setting', 'message'),
      setNotificationSetting: value =>
        storage.put('notification-setting', value),
      getAudioNotification: () => storage.get('audio-notification'),
      setAudioNotification: value => storage.put('audio-notification', value),

      getSpellCheck: () => storage.get('spell-check', true),
      setSpellCheck: value => {
        storage.put('spell-check', value);
        startSpellCheck();
      },

      // eslint-disable-next-line eqeqeq
      isPrimary: () => textsecure.storage.user.getDeviceId() == '1',
      getSyncRequest: () =>
        new Promise((resolve, reject) => {
          const syncRequest = window.getSyncRequest();
          syncRequest.addEventListener('success', resolve);
          syncRequest.addEventListener('timeout', reject);
        }),
      getLastSyncTime: () => storage.get('synced_at'),
      setLastSyncTime: value => storage.put('synced_at', value),

      addDarkOverlay: () => {
        if ($('.dark-overlay').length) {
          return;
        }
        $(document.body).prepend('<div class="dark-overlay"></div>');
        $('.dark-overlay').on('click', () => $('.dark-overlay').remove());
      },
      removeDarkOverlay: () => $('.dark-overlay').remove(),
      deleteAllData: () => {
        const clearDataView = new window.Whisper.ClearDataView().render();
        $('body').append(clearDataView.el);
      },

      shutdown: async () => {
        await window.localLokiServer.close();

        // Stop background processing
        window.Signal.AttachmentDownloads.stop();
        if (idleDetector) {
          idleDetector.stop();
        }

        // Stop processing incoming messages
        if (messageReceiver) {
          await messageReceiver.stopProcessing();
          messageReceiver = null;
        }

        // Shut down the data interface cleanly
        await window.Signal.Data.shutdown();
      },
    };

    const currentVersion = window.getVersion();
    const lastVersion = storage.get('version');
    newVersion = !lastVersion || currentVersion !== lastVersion;
    await storage.put('version', currentVersion);

    if (newVersion) {
      if (
        lastVersion &&
        window.isBeforeVersion(lastVersion, 'v1.15.0-beta.5')
      ) {
        await window.Signal.Logs.deleteAll();
        window.restart();
      }

      window.log.info(
        `New version detected: ${currentVersion}; previous: ${lastVersion}`
      );
    }

    if (isIndexedDBPresent) {
      await mandatoryMessageUpgrade({ upgradeMessageSchema });
      await migrateAllToSQLCipher({ writeNewAttachmentData, Views });
      await removeDatabase();
      try {
        await window.Signal.Data.removeIndexedDBFiles();
      } catch (error) {
        window.log.error(
          'Failed to remove IndexedDB files:',
          error && error.stack ? error.stack : error
        );
      }

      window.installStorage(window.newStorage);
      await window.storage.fetch();
      await storage.put('indexeddb-delete-needed', true);
    }

    Views.Initialization.setMessage(window.i18n('optimizingApplication'));

    if (newVersion) {
      await window.Signal.Data.cleanupOrphanedAttachments();
    }

    Views.Initialization.setMessage(window.i18n('loading'));

    idleDetector = new IdleDetector();
    let isMigrationWithIndexComplete = false;
    window.log.info(
      `Starting background data migration. Target version: ${
        Message.CURRENT_SCHEMA_VERSION
      }`
    );
    idleDetector.on('idle', async () => {
      const NUM_MESSAGES_PER_BATCH = 1;

      if (!isMigrationWithIndexComplete) {
        const batchWithIndex = await MessageDataMigrator.processNext({
          BackboneMessage: Whisper.Message,
          BackboneMessageCollection: Whisper.MessageCollection,
          numMessagesPerBatch: NUM_MESSAGES_PER_BATCH,
          upgradeMessageSchema,
          getMessagesNeedingUpgrade:
            window.Signal.Data.getMessagesNeedingUpgrade,
          saveMessage: window.Signal.Data.saveMessage,
        });
        window.log.info('Upgrade message schema (with index):', batchWithIndex);
        isMigrationWithIndexComplete = batchWithIndex.done;
      }

      if (isMigrationWithIndexComplete) {
        window.log.info(
          'Background migration complete. Stopping idle detector.'
        );
        idleDetector.stop();
      }
    });

    const startSpellCheck = () => {
      if (!window.enableSpellCheck || !window.disableSpellCheck) {
        return;
      }

      if (window.Events.getSpellCheck()) {
        window.enableSpellCheck();
      } else {
        window.disableSpellCheck();
      }
    };
    startSpellCheck();

    const themeSetting = window.Events.getThemeSetting();
    const newThemeSetting = mapOldThemeToNew(themeSetting);
    window.Events.setThemeSetting(newThemeSetting);

    try {
      await Promise.all([
        ConversationController.load(),
        textsecure.storage.protocol.hydrateCaches(),
      ]);
      BlockedNumberController.refresh();
    } catch (error) {
      window.log.error(
        'background.js: ConversationController failed to load:',
        error && error.stack ? error.stack : error
      );
    } finally {
      start();
    }
  });

  Whisper.events.on('setupWithImport', () => {
    const { appView } = window.owsDesktopApp;
    if (appView) {
      appView.openImporter();
    }
  });

  Whisper.events.on(
    'deleteLocalPublicMessage',
    async ({ messageServerId, conversationId }) => {
      const message = await window.Signal.Data.getMessageByServerId(
        messageServerId,
        conversationId,
        {
          Message: Whisper.Message,
        }
      );
      if (message) {
        const conversation = ConversationController.get(conversationId);
        if (conversation) {
          conversation.removeMessage(message.id);
        }
        await window.Signal.Data.removeMessage(message.id, {
          Message: Whisper.Message,
        });
      }
    }
  );

  Whisper.events.on('setupAsNewDevice', () => {
    const { appView } = window.owsDesktopApp;
    if (appView) {
      appView.openInstaller();
    }
  });

  Whisper.events.on('setupAsStandalone', () => {
    const { appView } = window.owsDesktopApp;
    if (appView) {
      appView.openStandalone();
    }
  });

  function manageExpiringData() {
    window.Signal.Data.cleanSeenMessages();
    window.Signal.Data.cleanLastHashes();
    setTimeout(manageExpiringData, 1000 * 60 * 60);
  }

  async function start() {
    manageExpiringData();
    window.dispatchEvent(new Event('storage_ready'));

    window.log.info('Cleanup: starting...');
    const results = await Promise.all([
      window.Signal.Data.getOutgoingWithoutExpiresAt({
        MessageCollection: Whisper.MessageCollection,
      }),
      window.Signal.Data.getAllUnsentMessages({
        MessageCollection: Whisper.MessageCollection,
      }),
    ]);

    // Combine the models
    const messagesForCleanup = results.reduce(
      (array, current) => array.concat(current.toArray()),
      []
    );

    window.log.info(
      `Cleanup: Found ${messagesForCleanup.length} messages for cleanup`
    );
    await Promise.all(
      messagesForCleanup.map(async message => {
        const delivered = message.get('delivered');
        const sentAt = message.get('sent_at');
        const expirationStartTimestamp = message.get(
          'expirationStartTimestamp'
        );

        // Make sure we only target outgoing messages
        if (
          message.isFriendRequest() &&
          message.get('direction') === 'incoming'
        ) {
          return;
        }

        if (message.isEndSession()) {
          return;
        }

        if (message.hasErrors()) {
          return;
        }

        if (delivered) {
          window.log.info(
            `Cleanup: Starting timer for delivered message ${sentAt}`
          );
          message.set(
            'expirationStartTimestamp',
            expirationStartTimestamp || sentAt
          );
          await message.setToExpire();
          return;
        }

        window.log.info(`Cleanup: Deleting unsent message ${sentAt}`);
        await window.Signal.Data.removeMessage(message.id, {
          Message: Whisper.Message,
        });
        const conversation = message.getConversation();
        if (conversation) {
          await conversation.updateLastMessage();
        }
      })
    );
    window.log.info('Cleanup: complete');

    window.log.info('listening for registration events');
    Whisper.events.on('registration_done', async () => {
      window.log.info('handling registration event');

      // Enable link previews as default
      storage.onready(async () => {
        storage.put('linkPreviews', true);
      });

      // listeners
      Whisper.RotateSignedPreKeyListener.init(Whisper.events, newVersion);
      // window.Signal.RefreshSenderCertificate.initialize({
      //   events: Whisper.events,
      //   storage,
      //   navigator,
      //   logger: window.log,
      // });

      connect(true);
    });

    cancelInitializationMessage();
    const appView = new Whisper.AppView({
      el: $('body'),
    });
    window.owsDesktopApp.appView = appView;

    Whisper.WallClockListener.init(Whisper.events);
    Whisper.ExpiringMessagesListener.init(Whisper.events);

    if (Whisper.Import.isIncomplete()) {
      window.log.info('Import was interrupted, showing import error screen');
      appView.openImporter();
    } else if (
      Whisper.Registration.isDone() &&
      !Whisper.Registration.ongoingSecondaryDeviceRegistration()
    ) {
      // listeners
      Whisper.RotateSignedPreKeyListener.init(Whisper.events, newVersion);
      // window.Signal.RefreshSenderCertificate.initialize({
      //   events: Whisper.events,
      //   storage,
      //   navigator,
      //   logger: window.log,
      // });

      connect();
      appView.openInbox({
        initialLoadComplete,
      });
    } else if (window.isImportMode()) {
      appView.openImporter();
    } else {
      appView.openStandalone();
    }

    Whisper.events.on('showDebugLog', () => {
      appView.openDebugLog();
    });
    Whisper.events.on('unauthorized', () => {
      appView.inboxView.networkStatusView.update();
    });
    Whisper.events.on('reconnectTimer', () => {
      appView.inboxView.networkStatusView.setSocketReconnectInterval(60000);
    });
    Whisper.events.on('contactsync', () => {
      if (appView.installView) {
        appView.openInbox();
      }
    });

    window.addEventListener('focus', () => Whisper.Notifications.clear());
    window.addEventListener('unload', () => Whisper.Notifications.fastClear());

    Whisper.events.on('showConversation', (id, messageId) => {
      if (appView) {
        appView.openConversation(id, messageId);
      }
    });

    window.doUpdateGroup = async (groupId, groupName, members) => {
      const ourKey = textsecure.storage.user.getNumber();

      const ev = new Event('message');
      ev.confirm = () => {};

      ev.data = {
        source: ourKey,
        message: {
          group: {
            id: groupId,
            type: textsecure.protobuf.GroupContext.Type.UPDATE,
            name: groupName,
            members,
            avatar: null, // TODO
          },
        },
      };

      const convo = await ConversationController.getOrCreateAndWait(
        groupId,
        'group'
      );

      const avatar = '';
      const options = {};

      const recipients = _.union(convo.get('members'), members);

      await onMessageReceived(ev);
      convo.updateGroup({
        groupId,
        groupName,
        avatar,
        recipients,
        members,
        options,
      });
    };

    window.doCreateGroup = async (groupName, members) => {
      const keypair = await libsignal.KeyHelper.generateIdentityKeyPair();
      const groupId = StringView.arrayBufferToHex(keypair.pubKey);

      const ev = new Event('group');

      const ourKey = textsecure.storage.user.getNumber();

      const allMembers = [ourKey, ...members];

      ev.groupDetails = {
        id: groupId,
        name: groupName,
        members: allMembers,
        recipients: allMembers,
        active: true,
        expireTimer: 0,
        avatar: '',
      };

      ev.confirm = () => {};

      await onGroupReceived(ev);

      const convo = await ConversationController.getOrCreateAndWait(
        groupId,
        'group'
      );

      convo.updateGroup(ev.groupDetails);

      // Group conversations are automatically 'friends'
      // so that we can skip the friend request logic
      convo.setFriendRequestStatus(
        window.friends.friendRequestStatusEnum.friends
      );

      convo.updateGroupAdmins([ourKey]);

      appView.openConversation(groupId, {});
    };

    window.sendGroupInvitations = (serverInfo, pubkeys) => {
      pubkeys.forEach(async pubkey => {
        const convo = await ConversationController.getOrCreateAndWait(
          pubkey,
          'private'
        );

        if (convo) {
          convo.sendMessage('', null, null, null, {
            serverName: serverInfo.name,
            channelId: serverInfo.channelId,
            serverAddress: serverInfo.address,
          });
        }
      });
    };

    Whisper.events.on('createNewGroup', async () => {
      if (appView) {
        appView.showCreateGroup();
      }
    });

    Whisper.events.on('updateGroup', async groupConvo => {
      if (appView) {
        appView.showUpdateGroupDialog(groupConvo);
      }
    });

    Whisper.events.on('inviteFriends', async groupConvo => {
      if (appView) {
        appView.showInviteFriendsDialog(groupConvo);
      }
    });

    Whisper.events.on(
      'publicChatInvitationAccepted',
      async (serverAddress, channelId) => {
        // To some degree this has been copy-pasted
        // form connection_to_server_dialog_view.js:
        const rawServerUrl = serverAddress
          .replace(/^https?:\/\//i, '')
          .replace(/[/\\]+$/i, '');
        const sslServerUrl = `https://${rawServerUrl}`;
        const conversationId = `publicChat:${channelId}@${rawServerUrl}`;

        const conversationExists = ConversationController.get(conversationId);
        if (conversationExists) {
          window.log.warn('We are already a member of this public chat');
          return;
        }

        const serverAPI = await window.lokiPublicChatAPI.findOrCreateServer(
          sslServerUrl
        );
        if (!serverAPI) {
          window.log.warn(`Could not connect to ${serverAddress}`);
          return;
        }

        const conversation = await ConversationController.getOrCreateAndWait(
          conversationId,
          'group'
        );

        serverAPI.findOrCreateChannel(channelId, conversationId);
        await conversation.setPublicSource(sslServerUrl, channelId);
        await conversation.setFriendRequestStatus(
          window.friends.friendRequestStatusEnum.friends
        );

        appView.openConversation(conversationId, {});
      }
    );

    Whisper.events.on('leaveGroup', async groupConvo => {
      if (appView) {
        appView.showLeaveGroupDialog(groupConvo);
      }
    });

    Whisper.events.on('deleteConversation', async conversation => {
      await conversation.destroyMessages();
      await window.Signal.Data.removeConversation(conversation.id, {
        Conversation: Whisper.Conversation,
      });
    });

    Whisper.Notifications.on('click', (id, messageId) => {
      window.showWindow();
      if (id) {
        appView.openConversation(id, messageId);
      } else {
        appView.openInbox({
          initialLoadComplete,
        });
      }
    });

    Whisper.events.on('onEditProfile', async () => {
      const ourNumber = window.storage.get('primaryDevicePubKey');
      const conversation = await ConversationController.getOrCreateAndWait(
        ourNumber,
        'private'
      );

      const readFile = attachment =>
        new Promise((resolve, reject) => {
          const fileReader = new FileReader();
          fileReader.onload = e => {
            const data = e.target.result;
            resolve({
              ...attachment,
              data,
              size: data.byteLength,
            });
          };
          fileReader.onerror = reject;
          fileReader.onabort = reject;
          fileReader.readAsArrayBuffer(attachment.file);
        });

      const avatarPath = conversation.getAvatarPath();
      const profile = conversation.getLokiProfile();
      const displayName = profile && profile.displayName;

      if (appView) {
        appView.showEditProfileDialog({
          profileName: displayName,
          pubkey: ourNumber,
          avatarPath,
          avatarColor: conversation.getColor(),
          onOk: async (newName, avatar) => {
            let newAvatarPath = '';

            if (avatar) {
              const data = await readFile({ file: avatar });

              // For simplicity we use the same attachment pointer that would send to
              // others, which means we need to wait for the database response.
              // To avoid the wait, we create a temporary url for the local image
              // and use it until we the the response from the server
              const tempUrl = window.URL.createObjectURL(avatar);
              conversation.setLokiProfile({ displayName: newName });
              conversation.set('avatar', tempUrl);

              const avatarPointer = await textsecure.messaging.uploadAvatar(
                data
              );

              conversation.set('avatarPointer', avatarPointer.url);

              const downloaded = await messageReceiver.downloadAttachment({
                url: avatarPointer.url,
                isRaw: true,
              });
              const upgraded = await Signal.Migrations.processNewAttachment(
                downloaded
              );
              newAvatarPath = upgraded.path;
            }

            // Replace our temporary image with the attachment pointer from the server:
            conversation.set('avatar', null);
            conversation.setLokiProfile({
              displayName: newName,
              avatar: newAvatarPath,
            });
            // inform all your registered public servers
            // could put load on all the servers
            // if they just keep changing their names without sending messages
            // so we could disable this here
            // or least it enable for the quickest response
            window.lokiPublicChatAPI.setProfileName(newName);
          },
        });
      }
    });

    Whisper.events.on('onShowUserDetails', async ({ userPubKey }) => {
      const conversation = await ConversationController.getOrCreateAndWait(
        userPubKey,
        'private'
      );

      const avatarPath = conversation.getAvatarPath();
      const profile = conversation.getLokiProfile();
      const displayName = profile && profile.displayName;

      if (appView) {
        appView.showUserDetailsDialog({
          profileName: displayName,
          pubkey: userPubKey,
          avatarPath,
          avatarColor: conversation.getColor(),
          onStartConversation: () => {
            Whisper.events.trigger('showConversation', userPubKey);
          },
        });
      }
    });

    Whisper.events.on('showToast', options => {
      if (
        appView &&
        appView.inboxView &&
        appView.inboxView.conversation_stack
      ) {
        appView.inboxView.conversation_stack.showToast(options);
      }
    });

    Whisper.events.on('showConfirmationDialog', options => {
      if (
        appView &&
        appView.inboxView &&
        appView.inboxView.conversation_stack
      ) {
        appView.inboxView.conversation_stack.showConfirmationDialog(options);
      }
    });

    Whisper.events.on('showNicknameDialog', options => {
      if (appView) {
        appView.showNicknameDialog(options);
      }
    });

    Whisper.events.on('showPasswordDialog', options => {
      if (appView) {
        appView.showPasswordDialog(options);
      }
    });

    Whisper.events.on('showSeedDialog', async () => {
      const manager = await getAccountManager();
      if (appView && manager) {
        const seed = manager.getCurrentMnemonic();
        appView.showSeedDialog(seed);
      }
    });

    Whisper.events.on('showAddServerDialog', async options => {
      if (appView) {
        appView.showAddServerDialog(options);
      }
    });

    Whisper.events.on('showQRDialog', async () => {
      if (appView) {
        const ourNumber = textsecure.storage.user.getNumber();
        appView.showQRDialog(ourNumber);
      }
    });

    Whisper.events.on('showPurgeNominationDialog', async () => {
      if (appView) {
        appView.showPurgeNominationDialog();
      }
    });

    Whisper.events.on('showDevicePairingDialog', async () => {
      if (appView) {
        appView.showDevicePairingDialog();
      }
    });

    Whisper.events.on('showDevicePairingWordsDialog', async () => {
      if (appView) {
        appView.showDevicePairingWordsDialog();
      }
    });

    Whisper.events.on('calculatingPoW', ({ pubKey, timestamp }) => {
      try {
        const conversation = ConversationController.get(pubKey);
        conversation.onCalculatingPoW(pubKey, timestamp);
      } catch (e) {
        window.log.error('Error showing PoW cog');
      }
    });

    Whisper.events.on('p2pMessageSent', ({ pubKey, timestamp }) => {
      try {
        const conversation = ConversationController.get(pubKey);
        conversation.onP2pMessageSent(pubKey, timestamp);
      } catch (e) {
        window.log.error('Error setting p2p on message');
      }
    });

    Whisper.events.on(
      'publicMessageSent',
      ({ pubKey, timestamp, serverId }) => {
        try {
          const conversation = ConversationController.get(pubKey);
          conversation.onPublicMessageSent(pubKey, timestamp, serverId);
        } catch (e) {
          window.log.error('Error setting public on message');
        }
      }
    );

    Whisper.events.on('password-updated', () => {
      if (appView && appView.inboxView) {
        appView.inboxView.trigger('password-updated');
      }
    });

    Whisper.events.on('devicePairingRequestAccepted', async (pubKey, cb) => {
      try {
        await getAccountManager().authoriseSecondaryDevice(pubKey);
        cb(null);
      } catch (e) {
        cb(e);
      }
    });

    Whisper.events.on('devicePairingRequestRejected', async pubKey => {
      await libloki.storage.removeContactPreKeyBundle(pubKey);
      await libloki.storage.removePairingAuthorisationForSecondaryPubKey(
        pubKey
      );
    });

    Whisper.events.on('deviceUnpairingRequested', async pubKey => {
      await libloki.storage.removePairingAuthorisationForSecondaryPubKey(
        pubKey
      );
      await window.lokiFileServerAPI.updateOurDeviceMapping();
      // TODO: we should ensure the message was sent and retry automatically if not
      await libloki.api.sendUnpairingMessageToSecondary(pubKey);
    });
  }

  window.getSyncRequest = () =>
    new textsecure.SyncRequest(textsecure.messaging, messageReceiver);

  let disconnectTimer = null;
  function onOffline() {
    window.log.info('offline');

    window.removeEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    // We've received logs from Linux where we get an 'offline' event, then 30ms later
    //   we get an online event. This waits a bit after getting an 'offline' event
    //   before disconnecting the socket manually.
    disconnectTimer = setTimeout(disconnect, 1000);
  }

  function onOnline() {
    window.log.info('online');

    window.removeEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    if (disconnectTimer && isSocketOnline()) {
      window.log.warn('Already online. Had a blip in online/offline status.');
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
      return;
    }
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }

    connect();
  }

  function isSocketOnline() {
    const socketStatus = window.getSocketStatus();
    return (
      socketStatus === WebSocket.CONNECTING || socketStatus === WebSocket.OPEN
    );
  }

  async function disconnect() {
    window.log.info('disconnect');

    // Clear timer, since we're only called when the timer is expired
    disconnectTimer = null;

    if (messageReceiver) {
      await messageReceiver.close();
    }
    window.Signal.AttachmentDownloads.stop();
  }

  let connectCount = 0;
  async function connect(firstRun) {
    window.log.info('connect');

    // Bootstrap our online/offline detection, only the first time we connect
    if (connectCount === 0 && navigator.onLine) {
      window.addEventListener('offline', onOffline);
    }
    if (connectCount === 0 && !navigator.onLine) {
      window.log.warn(
        'Starting up offline; will connect when we have network access'
      );
      window.addEventListener('online', onOnline);
      onEmpty(); // this ensures that the loading screen is dismissed
      return;
    }

    if (!Whisper.Registration.everDone()) {
      return;
    }
    if (Whisper.Import.isIncomplete()) {
      return;
    }

    if (messageReceiver) {
      await messageReceiver.close();
    }

    const USERNAME = storage.get('number_id');
    const PASSWORD = storage.get('password');
    const mySignalingKey = storage.get('signaling_key');

    connectCount += 1;
    const options = {
      retryCached: connectCount === 1,
      serverTrustRoot: window.getServerTrustRoot(),
    };

    Whisper.Notifications.disable(); // avoid notification flood until empty

    if (Whisper.Registration.ongoingSecondaryDeviceRegistration()) {
      const ourKey = textsecure.storage.user.getNumber();
      window.lokiMessageAPI = new window.LokiMessageAPI(ourKey);
      window.lokiFileServerAPIFactory = new window.LokiFileServerAPI(ourKey);
      window.lokiFileServerAPI = await window.lokiFileServerAPIFactory.establishHomeConnection(
        window.getDefaultFileServer()
      );
      window.localLokiServer = null;
      window.lokiPublicChatAPI = null;
      window.feeds = [];
      messageReceiver = new textsecure.MessageReceiver(
        USERNAME,
        PASSWORD,
        mySignalingKey,
        options
      );
      messageReceiver.addEventListener('message', onMessageReceived);
      messageReceiver.addEventListener('contact', onContactReceived);
      window.textsecure.messaging = new textsecure.MessageSender(
        USERNAME,
        PASSWORD
      );
      return;
    }

    // initialize the socket and start listening for messages
    startLocalLokiServer();
    await initAPIs();
    await initSpecialConversations();
    messageReceiver = new textsecure.MessageReceiver(
      USERNAME,
      PASSWORD,
      mySignalingKey,
      options
    );
    messageReceiver.addEventListener('message', onMessageReceived);
    messageReceiver.addEventListener('delivery', onDeliveryReceipt);
    messageReceiver.addEventListener('contact', onContactReceived);
    messageReceiver.addEventListener('group', onGroupReceived);
    messageReceiver.addEventListener('sent', onSentMessage);
    messageReceiver.addEventListener('readSync', onReadSync);
    messageReceiver.addEventListener('read', onReadReceipt);
    messageReceiver.addEventListener('verified', onVerified);
    messageReceiver.addEventListener('error', onError);
    messageReceiver.addEventListener('empty', onEmpty);
    messageReceiver.addEventListener('reconnect', onReconnect);
    messageReceiver.addEventListener('progress', onProgress);
    messageReceiver.addEventListener('configuration', onConfiguration);
    messageReceiver.addEventListener('typing', onTyping);

    Whisper.events.on('endSession', source => {
      messageReceiver.handleEndSession(source);
    });

    window.Signal.AttachmentDownloads.start({
      getMessageReceiver: () => messageReceiver,
      logger: window.log,
    });

    window.textsecure.messaging = new textsecure.MessageSender(
      USERNAME,
      PASSWORD
    );

    // On startup after upgrading to a new version, request a contact sync
    //   (but only if we're not the primary device)
    if (
      !firstRun &&
      connectCount === 1 &&
      newVersion &&
      // eslint-disable-next-line eqeqeq
      textsecure.storage.user.getDeviceId() != '1'
    ) {
      window.getSyncRequest();

      try {
        const manager = window.getAccountManager();
        await Promise.all([
          manager.maybeUpdateDeviceName(),
          manager.maybeDeleteSignalingKey(),
        ]);
      } catch (e) {
        window.log.error(
          'Problem with account manager updates after starting new version: ',
          e && e.stack ? e.stack : e
        );
      }
    }

    // const udSupportKey = 'hasRegisterSupportForUnauthenticatedDelivery';
    // if (!storage.get(udSupportKey)) {
    //   const server = WebAPI.connect({ username: USERNAME, password: PASSWORD });
    //   try {
    //     await server.registerSupportForUnauthenticatedDelivery();
    //     storage.put(udSupportKey, true);
    //   } catch (error) {
    //     window.log.error(
    //       'Error: Unable to register for unauthenticated delivery support.',
    //       error && error.stack ? error.stack : error
    //     );
    //   }
    // }

    const deviceId = textsecure.storage.user.getDeviceId();
    if (firstRun === true && deviceId !== '1') {
      const hasThemeSetting = Boolean(storage.get('theme-setting'));
      if (!hasThemeSetting && textsecure.storage.get('userAgent') === 'OWI') {
        storage.put('theme-setting', 'ios');
        onChangeTheme();
      }
      const syncRequest = new textsecure.SyncRequest(
        textsecure.messaging,
        messageReceiver
      );
      Whisper.events.trigger('contactsync:begin');
      syncRequest.addEventListener('success', () => {
        window.log.info('sync successful');
        storage.put('synced_at', Date.now());
        Whisper.events.trigger('contactsync');
      });
      syncRequest.addEventListener('timeout', () => {
        window.log.error('sync timed out');
        Whisper.events.trigger('contactsync');
      });

      if (Whisper.Import.isComplete()) {
        const { wrap, sendOptions } = ConversationController.prepareForSend(
          textsecure.storage.user.getNumber(),
          { syncMessage: true }
        );
        wrap(
          textsecure.messaging.sendRequestConfigurationSyncMessage(sendOptions)
        ).catch(error => {
          window.log.error(
            'Import complete, but failed to send sync message',
            error && error.stack ? error.stack : error
          );
        });
      }
    }

    storage.onready(async () => {
      idleDetector.start();
    });
  }

  function onChangeTheme() {
    const view = window.owsDesktopApp.appView;
    if (view) {
      view.applyTheme();
    }
  }
  function onEmpty() {
    initialLoadComplete = true;

    window.readyForUpdates();

    let interval = setInterval(() => {
      const view = window.owsDesktopApp.appView;
      if (view) {
        clearInterval(interval);
        interval = null;
        view.onEmpty();
      }
    }, 500);

    Whisper.Notifications.enable();
  }
  function onReconnect() {
    // We disable notifications on first connect, but the same applies to reconnect. In
    //   scenarios where we're coming back from sleep, we can get offline/online events
    //   very fast, and it looks like a network blip. But we need to suppress
    //   notifications in these scenarios too. So we listen for 'reconnect' events.
    Whisper.Notifications.disable();
  }
  function onProgress(ev) {
    const { count } = ev;
    window.log.info(`onProgress: Message count is ${count}`);

    const view = window.owsDesktopApp.appView;
    if (view) {
      view.onProgress(count);
    }
  }
  function onConfiguration(ev) {
    const { configuration } = ev;
    const {
      readReceipts,
      typingIndicators,
      unidentifiedDeliveryIndicators,
      linkPreviews,
    } = configuration;

    storage.put('read-receipt-setting', readReceipts);

    if (
      unidentifiedDeliveryIndicators === true ||
      unidentifiedDeliveryIndicators === false
    ) {
      storage.put(
        'unidentifiedDeliveryIndicators',
        unidentifiedDeliveryIndicators
      );
    }

    if (typingIndicators === true || typingIndicators === false) {
      storage.put('typing-indicators-setting', typingIndicators);
    }

    if (linkPreviews === true || linkPreviews === false) {
      storage.put('linkPreviews', linkPreviews);
    }

    ev.confirm();
  }

  async function onTyping(ev) {
    const { typing, sender, senderDevice } = ev;
    const { groupId, started } = typing || {};

    // We don't do anything with incoming typing messages if the setting is disabled
    if (!storage.get('typing-indicators-setting')) {
      return;
    }

    let primaryDevice = null;
    const authorisation = await libloki.storage.getGrantAuthorisationForSecondaryPubKey(
      sender
    );
    if (authorisation) {
      primaryDevice = authorisation.primaryDevicePubKey;
    }

    const conversation = ConversationController.get(
      groupId || primaryDevice || sender
    );

    if (conversation) {
      conversation.notifyTyping({
        isTyping: started,
        sender,
        senderDevice,
      });
    }
  }

  async function onContactReceived(ev) {
    const details = ev.contactDetails;

    const id = details.number;

    if (id === textsecure.storage.user.getNumber()) {
      // special case for syncing details about ourselves
      if (details.profileKey) {
        window.log.info('Got sync message with our own profile key');
        storage.put('profileKey', details.profileKey);
      }
    }

    const c = new Whisper.Conversation({
      id,
    });
    const validationError = c.validateNumber();
    if (validationError) {
      window.log.error(
        'Invalid contact received:',
        Errors.toLogFormat(validationError)
      );
      return;
    }

    try {
      const conversation = await ConversationController.getOrCreateAndWait(
        id,
        'private'
      );
      let activeAt = conversation.get('active_at');

      // The idea is to make any new contact show up in the left pane. If
      //   activeAt is null, then this contact has been purposefully hidden.
      if (activeAt !== null) {
        activeAt = activeAt || Date.now();
      }
      const ourPrimaryKey = window.storage.get('primaryDevicePubKey');
      const ourDevices = await libloki.storage.getAllDevicePubKeysForPrimaryPubKey(
        ourPrimaryKey
      );
      // TODO: We should probably just *not* send any secondary devices and
      // just load them all and send FRs when we get the mapping
      const isOurSecondaryDevice =
        id !== ourPrimaryKey &&
        ourDevices &&
        ourDevices.some(devicePubKey => devicePubKey === id);

      if (isOurSecondaryDevice) {
        await conversation.setSecondaryStatus(true, ourPrimaryKey);
      }

      if (conversation.isFriendRequestStatusNone()) {
        // Will be replaced with automatic friend request
        libloki.api.sendBackgroundMessage(conversation.id);
      } else {
        // Accept any pending friend requests if there are any
        conversation.onAcceptFriendRequest({ blockSync: true });
      }

      if (details.profileKey) {
        const profileKey = window.Signal.Crypto.arrayBufferToBase64(
          details.profileKey
        );
        conversation.setProfileKey(profileKey);
      }

      if (typeof details.blocked !== 'undefined') {
        if (details.blocked) {
          storage.addBlockedNumber(id);
        } else {
          storage.removeBlockedNumber(id);
        }
      }

      // Do not set name to allow working with lokiProfile and nicknames
      conversation.set({
        // name: details.name,
        color: details.color,
        active_at: activeAt,
      });

      await conversation.setLokiProfile({ displayName: details.name });

      if (details.nickname) {
        await conversation.setNickname(details.nickname);
      }

      // Update the conversation avatar only if new avatar exists and hash differs
      const { avatar } = details;
      if (avatar && avatar.data) {
        const newAttributes = await window.Signal.Types.Conversation.maybeUpdateAvatar(
          conversation.attributes,
          avatar.data,
          {
            writeNewAttachmentData,
            deleteAttachmentData,
          }
        );
        conversation.set(newAttributes);
      }

      await window.Signal.Data.updateConversation(id, conversation.attributes, {
        Conversation: Whisper.Conversation,
      });
      const { expireTimer } = details;
      const isValidExpireTimer = typeof expireTimer === 'number';
      if (isValidExpireTimer) {
        const source = textsecure.storage.user.getNumber();
        const receivedAt = Date.now();

        await conversation.updateExpirationTimer(
          expireTimer,
          source,
          receivedAt,
          { fromSync: true }
        );
      }

      if (details.verified) {
        const { verified } = details;
        const verifiedEvent = new Event('verified');
        verifiedEvent.verified = {
          state: verified.state,
          destination: verified.destination,
          identityKey: verified.identityKey.toArrayBuffer(),
        };
        verifiedEvent.viaContactSync = true;
        await onVerified(verifiedEvent);
      }
    } catch (error) {
      window.log.error('onContactReceived error:', Errors.toLogFormat(error));
    }
  }

  async function onGroupReceived(ev) {
    const details = ev.groupDetails;
    const { id } = details;

    const conversation = await ConversationController.getOrCreateAndWait(
      id,
      'group'
    );

    const updates = {
      name: details.name,
      members: details.members,
      color: details.color,
      type: 'group',
    };

    if (details.active) {
      const activeAt = conversation.get('active_at');

      // The idea is to make any new group show up in the left pane. If
      //   activeAt is null, then this group has been purposefully hidden.
      if (activeAt !== null) {
        updates.active_at = activeAt || Date.now();
      }
      updates.left = false;
    } else {
      updates.left = true;
    }

    if (details.blocked) {
      storage.addBlockedGroup(id);
    } else {
      storage.removeBlockedGroup(id);
    }

    conversation.set(updates);

    // Update the conversation avatar only if new avatar exists and hash differs
    const { avatar } = details;
    if (avatar && avatar.data) {
      const newAttributes = await window.Signal.Types.Conversation.maybeUpdateAvatar(
        conversation.attributes,
        avatar.data,
        {
          writeNewAttachmentData,
          deleteAttachmentData,
        }
      );
      conversation.set(newAttributes);
    }

    await window.Signal.Data.updateConversation(id, conversation.attributes, {
      Conversation: Whisper.Conversation,
    });
    const { expireTimer } = details;
    const isValidExpireTimer = typeof expireTimer === 'number';
    if (!isValidExpireTimer) {
      return;
    }

    const source = textsecure.storage.user.getNumber();
    const receivedAt = Date.now();
    await conversation.updateExpirationTimer(expireTimer, source, receivedAt, {
      fromSync: true,
    });

    ev.confirm();
  }

  // Descriptors
  const getGroupDescriptor = group => ({
    type: Message.GROUP,
    id: group.id,
  });

  // Matches event data from `libtextsecure` `MessageReceiver::handleSentMessage`:
  const getDescriptorForSent = ({ message, destination }) =>
    message.group
      ? getGroupDescriptor(message.group)
      : { type: Message.PRIVATE, id: destination };

  // Matches event data from `libtextsecure` `MessageReceiver::handleDataMessage`:
  const getDescriptorForReceived = ({ message, source }) =>
    message.group
      ? getGroupDescriptor(message.group)
      : { type: Message.PRIVATE, id: source };

  function createMessageHandler({
    createMessage,
    getMessageDescriptor,
    handleProfileUpdate,
  }) {
    return async event => {
      const { data, confirm } = event;

      const messageDescriptor = getMessageDescriptor(data);

      // Funnel messages to primary device conversation if multi-device
      const authorisation = await libloki.storage.getGrantAuthorisationForSecondaryPubKey(
        messageDescriptor.id
      );
      if (authorisation) {
        messageDescriptor.id = authorisation.primaryDevicePubKey;
      }

      const { PROFILE_KEY_UPDATE } = textsecure.protobuf.DataMessage.Flags;
      // eslint-disable-next-line no-bitwise
      const isProfileUpdate = Boolean(data.message.flags & PROFILE_KEY_UPDATE);
      if (isProfileUpdate) {
        return handleProfileUpdate({ data, confirm, messageDescriptor });
      }

      const primaryDeviceKey = window.storage.get('primaryDevicePubKey');
      const allOurDevices = await libloki.storage.getAllDevicePubKeysForPrimaryPubKey(
        primaryDeviceKey
      );
      const descriptorId = await textsecure.MessageReceiver.arrayBufferToString(
        messageDescriptor.id
      );
      let message;
      if (
        messageDescriptor.type === 'group' &&
        descriptorId.match(/^publicChat:/) &&
        allOurDevices.includes(data.source)
      ) {
        // Public chat messages from ourselves should be outgoing
        message = await createSentMessage(data);
      } else {
        message = await createMessage(data);
      }
      const isDuplicate = await isMessageDuplicate(message);
      if (isDuplicate) {
        window.log.warn('Received duplicate message', message.idForLogging());
        return event.confirm();
      }

      await ConversationController.getOrCreateAndWait(
        messageDescriptor.id,
        messageDescriptor.type
      );
      return message.handleDataMessage(data.message, event.confirm, {
        initialLoadComplete,
      });
    };
  }

  // Received:
  async function handleMessageReceivedProfileUpdate({
    data,
    confirm,
    messageDescriptor,
  }) {
    const profileKey = data.message.profileKey.toString('base64');
    const sender = await ConversationController.getOrCreateAndWait(
      messageDescriptor.id,
      'private'
    );

    // Will do the save for us
    await sender.setProfileKey(profileKey);

    return confirm();
  }

  const onMessageReceived = createMessageHandler({
    handleProfileUpdate: handleMessageReceivedProfileUpdate,
    getMessageDescriptor: getDescriptorForReceived,
    createMessage: initIncomingMessage,
  });

  // Sent:
  async function handleMessageSentProfileUpdate({
    data,
    confirm,
    messageDescriptor,
  }) {
    // First set profileSharing = true for the conversation we sent to
    const { id, type } = messageDescriptor;
    const conversation = await ConversationController.getOrCreateAndWait(
      id,
      type
    );

    conversation.set({ profileSharing: true });
    await window.Signal.Data.updateConversation(id, conversation.attributes, {
      Conversation: Whisper.Conversation,
    });

    // Then we update our own profileKey if it's different from what we have
    const ourNumber = textsecure.storage.user.getNumber();
    const profileKey = data.message.profileKey.toString('base64');
    const me = await ConversationController.getOrCreate(ourNumber, 'private');

    // Will do the save for us if needed
    await me.setProfileKey(profileKey);

    return confirm();
  }

  function createSentMessage(data) {
    const now = Date.now();
    let sentTo = [];

    if (data.unidentifiedStatus && data.unidentifiedStatus.length) {
      sentTo = data.unidentifiedStatus.map(item => item.destination);
      const unidentified = _.filter(data.unidentifiedStatus, item =>
        Boolean(item.unidentified)
      );
      // eslint-disable-next-line no-param-reassign
      data.unidentifiedDeliveries = unidentified.map(item => item.destination);
    }

    return new Whisper.Message({
      source: textsecure.storage.user.getNumber(),
      sourceDevice: data.sourceDevice,
      sent_at: data.timestamp,
      sent_to: sentTo,
      received_at: data.isPublic ? data.receivedAt : now,
      conversationId: data.destination,
      type: 'outgoing',
      sent: true,
      unidentifiedDeliveries: data.unidentifiedDeliveries || [],
      expirationStartTimestamp: Math.min(
        data.expirationStartTimestamp || data.timestamp || Date.now(),
        Date.now()
      ),
    });
  }

  const onSentMessage = createMessageHandler({
    handleProfileUpdate: handleMessageSentProfileUpdate,
    getMessageDescriptor: getDescriptorForSent,
    createMessage: createSentMessage,
  });

  async function isMessageDuplicate(message) {
    try {
      const { attributes } = message;
      const result = await window.Signal.Data.getMessageBySender(attributes, {
        Message: Whisper.Message,
      });

      return Boolean(result);
    } catch (error) {
      window.log.error('isMessageDuplicate error:', Errors.toLogFormat(error));
      return false;
    }
  }

  async function initIncomingMessage(data, options = {}) {
    const { isError } = options;

    let messageData = {
      source: data.source,
      sourceDevice: data.sourceDevice,
      serverId: data.serverId,
      sent_at: data.timestamp,
      received_at: data.receivedAt || Date.now(),
      conversationId: data.source,
      unidentifiedDeliveryReceived: data.unidentifiedDeliveryReceived,
      type: 'incoming',
      unread: 1,
      isP2p: data.isP2p,
      isPublic: data.isPublic,
      isRss: data.isRss,
    };

    if (data.friendRequest) {
      messageData = {
        ...messageData,
        type: 'friend-request',
        friendStatus: 'pending',
        direction: 'incoming',
      };
    }

    const message = new Whisper.Message(messageData);

    // If we don't return early here, we can get into infinite error loops. So, no
    //   delivery receipts for sealed sender errors.
    if (isError || !data.unidentifiedDeliveryReceived) {
      return message;
    }

    try {
      const { wrap, sendOptions } = ConversationController.prepareForSend(
        data.source
      );
      await wrap(
        textsecure.messaging.sendDeliveryReceipt(
          data.source,
          data.timestamp,
          sendOptions
        )
      );
    } catch (error) {
      window.log.error(
        `Failed to send delivery receipt to ${data.source} for message ${
          data.timestamp
        }:`,
        error && error.stack ? error.stack : error
      );
    }

    return message;
  }

  async function onError(ev) {
    const { error } = ev;
    window.log.error('background onError:', Errors.toLogFormat(error));

    if (
      error &&
      error.name === 'HTTPError' &&
      (error.code === 401 || error.code === 403)
    ) {
      Whisper.events.trigger('unauthorized');

      if (messageReceiver) {
        await messageReceiver.stopProcessing();
        messageReceiver = null;
      }

      onEmpty();

      window.log.warn(
        'Client is no longer authorized; deleting local configuration'
      );
      Whisper.Registration.remove();

      const NUMBER_ID_KEY = 'number_id';
      const VERSION_KEY = 'version';
      const LAST_PROCESSED_INDEX_KEY = 'attachmentMigration_lastProcessedIndex';
      const IS_MIGRATION_COMPLETE_KEY = 'attachmentMigration_isComplete';

      const previousNumberId = textsecure.storage.get(NUMBER_ID_KEY);
      const lastProcessedIndex = textsecure.storage.get(
        LAST_PROCESSED_INDEX_KEY
      );
      const isMigrationComplete = textsecure.storage.get(
        IS_MIGRATION_COMPLETE_KEY
      );

      try {
        await textsecure.storage.protocol.removeAllConfiguration();

        // These two bits of data are important to ensure that the app loads up
        //   the conversation list, instead of showing just the QR code screen.
        Whisper.Registration.markEverDone();
        textsecure.storage.put(NUMBER_ID_KEY, previousNumberId);

        // These two are important to ensure we don't rip through every message
        //   in the database attempting to upgrade it after starting up again.
        textsecure.storage.put(
          IS_MIGRATION_COMPLETE_KEY,
          isMigrationComplete || false
        );
        textsecure.storage.put(
          LAST_PROCESSED_INDEX_KEY,
          lastProcessedIndex || null
        );
        textsecure.storage.put(VERSION_KEY, window.getVersion());

        window.log.info('Successfully cleared local configuration');
      } catch (eraseError) {
        window.log.error(
          'Something went wrong clearing local configuration',
          eraseError && eraseError.stack ? eraseError.stack : eraseError
        );
      }

      return;
    }

    if (error && error.name === 'HTTPError' && error.code === -1) {
      // Failed to connect to server
      if (navigator.onLine) {
        window.log.info('retrying in 1 minute');
        setTimeout(connect, 60000);

        Whisper.events.trigger('reconnectTimer');
      }
      return;
    }

    if (ev.proto) {
      if (error && error.name === 'MessageCounterError') {
        if (ev.confirm) {
          ev.confirm();
        }
        // Ignore this message. It is likely a duplicate delivery
        // because the server lost our ack the first time.
        return;
      }
      const envelope = ev.proto;
      const message = await initIncomingMessage(envelope, { isError: true });

      await message.saveErrors(error || new Error('Error was null'));
      const id = message.get('conversationId');
      const conversation = await ConversationController.getOrCreateAndWait(
        id,
        'private'
      );
      conversation.set({
        active_at: Date.now(),
        unreadCount: conversation.get('unreadCount') + 1,
      });

      const conversationTimestamp = conversation.get('timestamp');
      const messageTimestamp = message.get('timestamp');
      if (!conversationTimestamp || messageTimestamp > conversationTimestamp) {
        conversation.set({ timestamp: message.get('sent_at') });
      }

      conversation.trigger('newmessage', message);
      conversation.notify(message);

      if (ev.confirm) {
        ev.confirm();
      }

      await window.Signal.Data.updateConversation(id, conversation.attributes, {
        Conversation: Whisper.Conversation,
      });
    }

    throw error;
  }

  function onReadReceipt(ev) {
    const readAt = ev.timestamp;
    const { timestamp } = ev.read;
    const { reader } = ev.read;
    window.log.info('read receipt', reader, timestamp);

    if (!storage.get('read-receipt-setting')) {
      return ev.confirm();
    }

    const receipt = Whisper.ReadReceipts.add({
      reader,
      timestamp,
      read_at: readAt,
    });

    receipt.on('remove', ev.confirm);

    // Calling this directly so we can wait for completion
    return Whisper.ReadReceipts.onReceipt(receipt);
  }

  function onReadSync(ev) {
    const readAt = ev.timestamp;
    const { timestamp } = ev.read;
    const { sender } = ev.read;
    window.log.info('read sync', sender, timestamp);

    const receipt = Whisper.ReadSyncs.add({
      sender,
      timestamp,
      read_at: readAt,
    });

    receipt.on('remove', ev.confirm);

    // Calling this directly so we can wait for completion
    return Whisper.ReadSyncs.onReceipt(receipt);
  }

  async function onVerified(ev) {
    const number = ev.verified.destination;
    const key = ev.verified.identityKey;
    let state;

    const c = new Whisper.Conversation({
      id: number,
    });
    const error = c.validateNumber();
    if (error) {
      window.log.error(
        'Invalid verified sync received:',
        Errors.toLogFormat(error)
      );
      return;
    }

    switch (ev.verified.state) {
      case textsecure.protobuf.Verified.State.DEFAULT:
        state = 'DEFAULT';
        break;
      case textsecure.protobuf.Verified.State.VERIFIED:
        state = 'VERIFIED';
        break;
      case textsecure.protobuf.Verified.State.UNVERIFIED:
        state = 'UNVERIFIED';
        break;
      default:
        window.log.error(`Got unexpected verified state: ${ev.verified.state}`);
    }

    window.log.info(
      'got verified sync for',
      number,
      state,
      ev.viaContactSync ? 'via contact sync' : ''
    );

    const contact = await ConversationController.getOrCreateAndWait(
      number,
      'private'
    );
    const options = {
      viaSyncMessage: true,
      viaContactSync: ev.viaContactSync,
      key,
    };

    if (state === 'VERIFIED') {
      await contact.setVerified(options);
    } else if (state === 'DEFAULT') {
      await contact.setVerifiedDefault(options);
    } else {
      await contact.setUnverified(options);
    }

    if (ev.confirm) {
      ev.confirm();
    }
  }

  function onDeliveryReceipt(ev) {
    const { deliveryReceipt } = ev;
    window.log.info(
      'delivery receipt from',
      `${deliveryReceipt.source}.${deliveryReceipt.sourceDevice}`,
      deliveryReceipt.timestamp
    );

    const receipt = Whisper.DeliveryReceipts.add({
      timestamp: deliveryReceipt.timestamp,
      source: deliveryReceipt.source,
    });

    ev.confirm();

    // Calling this directly so we can wait for completion
    return Whisper.DeliveryReceipts.onReceipt(receipt);
  }
})();
