/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-destructuring */

const { Application } = require('spectron');
const path = require('path');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { exec } = require('child_process');
const url = require('url');
const http = require('http');
const fse = require('fs-extra');
const ConversationPage = require('./page-objects/conversation.page');
const RegistrationPage = require('./page-objects/registration.page');

chai.should();
chai.use(chaiAsPromised);
chai.config.includeStack = true;

const STUB_SNODE_SERVER_PORT = 3000;
const ENABLE_LOG = false;

module.exports = {
  /* **************  USERS  ****************** */
  TEST_MNEMONIC1:
    'faxed mechanic mocked agony unrest loincloth pencil eccentric boyfriend oasis speedy ribbon faxed',
  TEST_PUBKEY1:
    '0552b85a43fb992f6bdb122a5a379505a0b99a16f0628ab8840249e2a60e12a413',
  TEST_DISPLAY_NAME1: 'integration_tester_1',

  TEST_MNEMONIC2:
    'guide inbound jerseys bays nouns basin sulking awkward stockpile ostrich ascend pylons ascend',
  TEST_PUBKEY2:
    '054e1ca8681082dbd9aad1cf6fc89a32254e15cba50c75b5a73ac10a0b96bcbd2a',
  TEST_DISPLAY_NAME2: 'integration_tester_2',

  /* **************  OPEN GROUPS  ****************** */
  VALID_GROUP_URL: 'https://chat.getsession.org',
  VALID_GROUP_URL2: 'https://chat-dev.lokinet.org',
  VALID_GROUP_NAME: 'Session Public Chat',
  VALID_GROUP_NAME2: 'Loki Dev Chat',

  /* **************  CLOSED GROUPS  ****************** */
  VALID_CLOSED_GROUP_NAME1: 'Closed Group 1',

  USER_DATA_ROOT_FOLDER: '',

  async timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // a wrapper to work around electron/spectron bug
  async setValueWrapper(app, selector, value) {
    await app.client.element(selector).click();
    // keys, setValue and addValue hang on certain platforms
    // could put a branch here to use one of those
    // if we know what platforms are good and which ones are broken
    await app.client.execute(
      (slctr, val) => {
        // eslint-disable-next-line no-undef
        const iter = document.evaluate(
          slctr,
          // eslint-disable-next-line no-undef
          document,
          null,
          // eslint-disable-next-line no-undef
          XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
          null
        );
        const elem = iter.iterateNext();
        if (elem) {
          elem.value = val;
        } else {
          console.error('Cant find', slctr, elem, iter);
        }
      },
      selector,
      value
    );
    // let session js detect the text change
    await app.client.element(selector).click();
  },

  async startApp(environment = 'test-integration-session') {
    const env = environment.startsWith('test-integration')
      ? 'test-integration'
      : environment;
    const instance = environment.replace('test-integration-', '');

    const app1 = new Application({
      path: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      args: ['.'],
      env: {
        NODE_ENV: env,
        NODE_APP_INSTANCE: instance,
        USE_STUBBED_NETWORK: true,
        ELECTRON_ENABLE_LOGGING: true,
        ELECTRON_ENABLE_STACK_DUMPING: true,
        ELECTRON_DISABLE_SANDBOX: 1,
      },
      requireName: 'electronRequire',
      // chromeDriverLogPath: '../chromedriverlog.txt',
      chromeDriverArgs: [
        `remote-debugging-port=${Math.floor(
          Math.random() * (9999 - 9000) + 9000
        )}`,
      ],
    });

    chaiAsPromised.transferPromiseness = app1.transferPromiseness;

    await app1.start();
    await app1.client.waitUntilWindowLoaded();

    return app1;
  },

  async startApp2() {
    const app2 = await this.startApp('test-integration-session-2');
    return app2;
  },

  async stopApp(app1) {
    if (app1 && app1.isRunning()) {
      await app1.stop();
    }
  },

  async killallElectron() {
    // rtharp - my 2nd client on MacOs needs: pkill -f "node_modules/.bin/electron"
    // node_modules/electron/dist/electron is node_modules/electron/dist/Electron.app on MacOS
    const killStr
      = process.platform === 'win32'
        ? 'taskkill /im electron.exe /t /f'
        : 'pkill -f "node_modules/electron/dist/electron" | pkill -f "node_modules/.bin/electron"';
    return new Promise(resolve => {
      exec(killStr, (err, stdout, stderr) => {
        if (err) {
          resolve({ stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  },

  async rmFolder(folder) {
    await fse.remove(folder);
  },

  async startAndAssureCleanedApp2() {
    const app2 = await this.startAndAssureCleanedApp(
      'test-integration-session-2'
    );
    return app2;
  },

  async startAndAssureCleanedApp(env = 'test-integration-session') {
    const userData = path.join(this.USER_DATA_ROOT_FOLDER, `Session-${env}`);

    await this.rmFolder(userData);

    const app1 = await this.startApp(env);
    await app1.client.waitForExist(
      RegistrationPage.registrationTabSignIn,
      4000
    );

    return app1;
  },

  async startAndStub({
    mnemonic,
    displayName,
    stubSnode = false,
    stubOpenGroups = false,
    env = 'test-integration-session',
  }) {
    const app = await this.startAndAssureCleanedApp(env);

    if (stubSnode) {
      await this.startStubSnodeServer();
      this.stubSnodeCalls(app);
    }

    if (stubOpenGroups) {
      this.stubOpenGroupsCalls(app);
    }

    if (mnemonic && displayName) {
      await this.restoreFromMnemonic(app, mnemonic, displayName);
      // not sure we need this - rtharp.
      await this.timeout(2000);
    }

    return app;
  },

  async startAndStub2(props) {
    const app2 = await this.startAndStub({
      env: 'test-integration-session-2',
      ...props,
    });

    return app2;
  },

  async restoreFromMnemonic(app, mnemonic, displayName) {
    await app.client.element(RegistrationPage.registrationTabSignIn).click();
    await app.client.element(RegistrationPage.restoreFromSeedMode).click();
    await this.setValueWrapper(
      app,
      RegistrationPage.recoveryPhraseInput,
      mnemonic
    );

    await this.setValueWrapper(
      app,
      RegistrationPage.displayNameInput,
      displayName
    );

    await app.client.element(RegistrationPage.continueSessionButton).click();
    await app.client.waitForExist(
      RegistrationPage.conversationListContainer,
      4000
    );
  },

  async startAppsAsFriends() {
    const app1Props = {
      mnemonic: this.TEST_MNEMONIC1,
      displayName: this.TEST_DISPLAY_NAME1,
      stubSnode: true,
    };

    const app2Props = {
      mnemonic: this.TEST_MNEMONIC2,
      displayName: this.TEST_DISPLAY_NAME2,
      stubSnode: true,
    };

    const [app1, app2] = await Promise.all([
      this.startAndStub(app1Props),
      this.startAndStub2(app2Props),
    ]);

    /** add each other as friends */
    const textMessage = this.generateSendMessageText();

    await app1.client.element(ConversationPage.contactsButtonSection).click();
    await app1.client.element(ConversationPage.addContactButton).click();

    await this.setValueWrapper(
      app1,
      ConversationPage.sessionIDInput,
      this.TEST_PUBKEY2
    );
    await app1.client.element(ConversationPage.nextButton).click();
    await app1.client.waitForExist(
      ConversationPage.sendFriendRequestTextarea,
      1000
    );

    // send a text message to that user (will be a friend request)
    await this.setValueWrapper(
      app1,
      ConversationPage.sendFriendRequestTextarea,
      textMessage
    );
    await app1.client.keys('Enter');
    await app1.client.waitForExist(
      ConversationPage.existingFriendRequestText(textMessage),
      1000
    );

    // wait for left notification Friend Request count to go to 1 and click it
    await app2.client.waitForExist(
      ConversationPage.oneNotificationFriendRequestLeft,
      5000
    );
    await app2.client
      .element(ConversationPage.oneNotificationFriendRequestLeft)
      .click();
    // open the dropdown from the top friend request count
    await app2.client.isExisting(
      ConversationPage.oneNotificationFriendRequestTop
    ).should.eventually.be.true;
    await app2.client
      .element(ConversationPage.oneNotificationFriendRequestTop)
      .click();

    // accept the friend request and validate that on both side the "accepted FR" message is shown
    await app2.client
      .element(ConversationPage.acceptFriendRequestButton)
      .click();
    await app2.client.waitForExist(
      ConversationPage.acceptedFriendRequestMessage,
      1000
    );
    await app1.client.waitForExist(
      ConversationPage.acceptedFriendRequestMessage,
      5000
    );

    return [app1, app2];
  },

  async linkApp2ToApp(app1, app2) {
    // app needs to be logged in as user1 and app2 needs to be logged out
    // start the pairing dialog for the first app
    await app1.client.element(ConversationPage.settingsButtonSection).click();
    await app1.client.element(ConversationPage.deviceSettingsRow).click();

    await app1.client.isVisible(ConversationPage.noPairedDeviceMessage);
    // we should not find the linkDeviceButtonDisabled button (as DISABLED)
    await app1.client.isExisting(ConversationPage.linkDeviceButtonDisabled)
      .should.eventually.be.false;
    await app1.client.element(ConversationPage.linkDeviceButton).click();

    // validate device pairing dialog is shown and has a qrcode
    await app1.client.isVisible(ConversationPage.devicePairingDialog);
    await app1.client.isVisible(ConversationPage.qrImageDiv);

    // next trigger the link request from the app2 with the app1 pubkey
    await app2.client.element(RegistrationPage.registrationTabSignIn).click();
    await app2.client.element(RegistrationPage.linkDeviceMode).click();

    await this.setValueWrapper(
      app2,
      RegistrationPage.textareaLinkDevicePubkey,
      this.TEST_PUBKEY1
    );
    await app2.client.element(RegistrationPage.linkDeviceTriggerButton).click();
    await app1.client.waitForExist(RegistrationPage.toastWrapper, 7000);
    let secretWordsapp1 = await app1.client
      .element(RegistrationPage.secretToastDescription)
      .getText();
    secretWordsapp1 = secretWordsapp1.split(': ')[1];

    await app2.client.waitForExist(RegistrationPage.toastWrapper, 6000);
    await app2.client
      .element(RegistrationPage.secretToastDescription)
      .getText()
      .should.eventually.be.equal(secretWordsapp1);
    await app1.client.element(ConversationPage.allowPairingButton).click();
    await app1.client.element(ConversationPage.okButton).click();
    // validate device paired in settings list with correct secrets
    await app1.client.waitForExist(
      ConversationPage.devicePairedDescription(secretWordsapp1),
      2000
    );

    await app1.client.isExisting(ConversationPage.unpairDeviceButton).should
      .eventually.be.true;
    await app1.client.isExisting(ConversationPage.linkDeviceButtonDisabled)
      .should.eventually.be.true;

    // validate app2 (secondary device) is linked successfully
    await app2.client.waitForExist(
      RegistrationPage.conversationListContainer,
      4000
    );

    // validate primary pubkey of app2 is the same that in app1
    await app2.webContents
      .executeJavaScript("window.storage.get('primaryDevicePubKey')")
      .should.eventually.be.equal(this.TEST_PUBKEY1);
  },

  async triggerUnlinkApp2FromApp(app1, app2) {
    // check app2 is loggedin
    await app2.client.isExisting(RegistrationPage.conversationListContainer)
      .should.eventually.be.true;

    await app1.client.element(ConversationPage.settingsButtonSection).click();
    await app1.client.element(ConversationPage.deviceSettingsRow).click();
    await app1.client.isExisting(ConversationPage.linkDeviceButtonDisabled)
      .should.eventually.be.true;
    // click the unlink button
    await app1.client.element(ConversationPage.unpairDeviceButton).click();
    await app1.client.element(ConversationPage.validateUnpairDevice).click();

    await app1.client.waitForExist(
      ConversationPage.noPairedDeviceMessage,
      2000
    );
    await app1.client.element(ConversationPage.linkDeviceButton).isEnabled()
      .should.eventually.be.true;

    // let time to app2 to catch the event and restart dropping its data
    await this.timeout(5000);

    // check that the app restarted
    // (did not find a better way than checking the app no longer being accessible)
    let isApp2Joinable = true;
    try {
      await app2.client.isExisting(RegistrationPage.registrationTabSignIn)
        .should.eventually.be.true;
    } catch (err) {
      // if we get an error here, it means Spectron is lost.
      // this is a good thing because it means app2 restarted
      isApp2Joinable = false;
    }

    if (isApp2Joinable) {
      throw new Error(
        'app2 is still joinable so it did not restart, so it did not unlink correctly'
      );
    }
  },

  generateSendMessageText: () =>
    `Test message from integration tests ${Date.now()}`,

  stubOpenGroupsCalls: app1 => {
    app1.webContents.executeJavaScript(
      'window.LokiAppDotNetServerAPI = window.StubAppDotNetAPI;'
    );
  },

  stubSnodeCalls(app1) {
    app1.webContents.executeJavaScript(
      'window.LokiMessageAPI = window.StubMessageAPI;'
    );
  },

  logsContainsString: async (app1, str) => {
    const logs = JSON.stringify(await app1.client.getRenderProcessLogs());
    return logs.includes(str);
  },

  async startStubSnodeServer() {
    if (!this.stubSnode) {
      this.messages = {};
      this.stubSnode = http.createServer((request, response) => {
        const { query } = url.parse(request.url, true);
        const { pubkey, data, timestamp } = query;

        if (pubkey) {
          if (request.method === 'POST') {
            if (ENABLE_LOG) {
              console.warn('POST', [data, timestamp]);
            }

            let ori = this.messages[pubkey];
            if (!this.messages[pubkey]) {
              ori = [];
            }

            this.messages[pubkey] = [...ori, { data, timestamp }];

            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end();
          } else {
            const retrievedMessages = { messages: this.messages[pubkey] };
            if (ENABLE_LOG) {
              console.warn('GET', pubkey, retrievedMessages);
            }
            if (this.messages[pubkey]) {
              response.writeHead(200, { 'Content-Type': 'application/json' });
              response.write(JSON.stringify(retrievedMessages));
              this.messages[pubkey] = [];
            }
            response.end();
          }
        }
        response.end();
      });
      this.stubSnode.listen(STUB_SNODE_SERVER_PORT);
    } else {
      this.messages = {};
    }
  },

  async stopStubSnodeServer() {
    if (this.stubSnode) {
      this.stubSnode.close();
      this.stubSnode = null;
    }
  },

  // async killStubSnodeServer() {
  //   return new Promise(resolve => {
  //     exec(
  //       `lsof -ti:${STUB_SNODE_SERVER_PORT} |xargs kill -9`,
  //       (err, stdout, stderr) => {
  //         if (err) {
  //           resolve({ stdout, stderr });
  //         } else {
  //           resolve({ stdout, stderr });
  //         }
  //       }
  //     );
  //   });
  // },
};
