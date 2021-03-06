/* global window: false */
/* global callWorker: false */
/* global textsecure: false */
/* global StringView: false */
/* global libloki: false */
/* global libsignal: false */
/* global WebSocket: false */
/* global Event: false */
/* global dcodeIO: false */
/* global _: false */
/* global HttpResource: false */
/* global ContactBuffer: false */
/* global GroupBuffer: false */
/* global lokiPublicChatAPI: false */
/* global lokiMessageAPI: false */
/* global feeds: false */
/* global Whisper: false */
/* global WebAPI: false */
/* global ConversationController: false */
/* global log: false */
/* global libsession: false */

/* eslint-disable more/no-then */
/* eslint-disable no-unreachable */

let openGroupBound = false;

// TODO: remove this when no longer needed here
function getEnvelopeId(envelope) {
  if (envelope.source) {
    return `${envelope.source}.${
      envelope.sourceDevice
    } ${envelope.timestamp.toNumber()} (${envelope.id})`;
  }

  return envelope.id;
}

function MessageReceiver(username, password, signalingKey, options = {}) {
  this.count = 0;

  this.signalingKey = signalingKey;
  this.username = username;
  this.password = password;
  this.server = WebAPI.connect();

  const address = libsignal.SignalProtocolAddress.fromString(username);
  this.number = address.getName();
  this.deviceId = address.getDeviceId();

  this.pending = Promise.resolve();

  if (options.retryCached) {
    this.pending = this.queueAllCached();
  }

  // only do this once to prevent duplicates
  if (lokiPublicChatAPI) {
    window.log.info('Binding open group events handler', openGroupBound);
    if (!openGroupBound) {
      // clear any previous binding
      lokiPublicChatAPI.removeAllListeners('publicMessage');
      // we only need one MR in the system handling these
      // bind events
      lokiPublicChatAPI.on(
        'publicMessage',
        this.handleUnencryptedMessage.bind(this)
      );
      openGroupBound = true;
    }
  } else {
    window.log.warn('Can not handle open group data, API is not available');
  }
}

MessageReceiver.stringToArrayBuffer = string =>
  Promise.resolve(dcodeIO.ByteBuffer.wrap(string, 'binary').toArrayBuffer());
MessageReceiver.arrayBufferToString = arrayBuffer =>
  Promise.resolve(dcodeIO.ByteBuffer.wrap(arrayBuffer).toString('binary'));

MessageReceiver.stringToArrayBufferBase64 = string =>
  callWorker('stringToArrayBufferBase64', string);
MessageReceiver.arrayBufferToStringBase64 = arrayBuffer =>
  callWorker('arrayBufferToStringBase64', arrayBuffer);

MessageReceiver.prototype = new textsecure.EventTarget();
MessageReceiver.prototype.extend({
  constructor: MessageReceiver,
  connect() {
    if (this.calledClose) {
      return;
    }

    this.count = 0;
    if (this.hasConnected) {
      const ev = new Event('reconnect');
      this.dispatchEvent(ev);
    }

    this.hasConnected = true;
    this.httpPollingResource = new HttpResource(lokiMessageAPI, {
      handleRequest: this.handleRequest.bind(this),
    });
    this.httpPollingResource.pollServer();

    // start polling all open group rooms you have registered
    // if not registered yet, they'll get started when they're created
    if (lokiPublicChatAPI) {
      lokiPublicChatAPI.open();
    }
    // set up pollers for any RSS feeds
    feeds.forEach(feed => {
      feed.on('rssMessage', this.handleUnencryptedMessage.bind(this));
    });

    // Ensures that an immediate 'empty' event from the websocket will fire only after
    //   all cached envelopes are processed.
    this.incoming = [this.pending];
  },
  async handleUnencryptedMessage({ message }) {
    const isMe = message.source === textsecure.storage.user.getNumber();
    if (!isMe && message.message.profile) {
      const conversation = await window.ConversationController.getOrCreateAndWait(
        message.source,
        'private'
      );
      await window.NewReceiver.updateProfile(
        conversation,
        message.message.profile,
        message.message.profileKey
      );
    }

    const ourNumber = textsecure.storage.user.getNumber();
    const primaryDevice = window.storage.get('primaryDevicePubKey');
    const isOurDevice =
      message.source &&
      (message.source === ourNumber || message.source === primaryDevice);
    const isPublicChatMessage =
      message.message.group &&
      message.message.group.id &&
      !!message.message.group.id.match(/^publicChat:/);
    let ev;

    if (isPublicChatMessage && isOurDevice) {
      // Public chat messages from ourselves should be outgoing
      ev = new Event('sent');
    } else {
      ev = new Event('message');
    }
    ev.confirm = function confirmTerm() {};
    ev.data = message;
    this.dispatchAndWait(ev);
  },
  stopProcessing() {
    window.log.info('MessageReceiver: stopProcessing requested');
    this.stoppingProcessing = true;
    return this.close();
  },
  shutdown() {},
  async close() {
    window.log.info('MessageReceiver.close()');
    this.calledClose = true;

    // stop polling all open group rooms
    if (lokiPublicChatAPI) {
      await lokiPublicChatAPI.close();
    }

    if (this.httpPollingResource) {
      this.httpPollingResource.close();
    }

    return this.drain();
  },
  onopen() {
    window.log.info('websocket open');
  },
  onerror() {
    window.log.error('websocket error');
  },
  dispatchAndWait(event) {
    const promise = this.appPromise || Promise.resolve();
    const appJobPromise = Promise.all(this.dispatchEvent(event));
    const job = () => appJobPromise;

    this.appPromise = promise.then(job, job);

    return Promise.resolve();
  },
  onclose(ev) {
    window.log.info(
      'websocket closed',
      ev.code,
      ev.reason || '',
      'calledClose:',
      this.calledClose
    );
  },

  pollForAdditionalId(id) {
    this.httpPollingResource.pollForAdditionalId(id);
  },

  handleRequest(request, options) {
    this.incoming = this.incoming || [];
    const lastPromise = _.last(this.incoming);

    // We do the message decryption here, instead of in the ordered pending queue,
    // to avoid exposing the time it took us to process messages through the time-to-ack.

    if (request.path !== '/api/v1/message') {
      window.log.info('got request', request.verb, request.path);
      request.respond(200, 'OK');

      if (request.verb === 'PUT' && request.path === '/api/v1/queue/empty') {
        this.onEmpty();
      }
      return;
    }

    const promise = Promise.resolve(request.body.toArrayBuffer()) // textsecure.crypto
      .then(plaintextImmutable => {
        let plaintext = plaintextImmutable;

        const envelope = textsecure.protobuf.Envelope.decode(plaintext);
        // After this point, decoding errors are not the server's
        //   fault, and we should handle them gracefully and tell the
        //   user they received an invalid message

        // The message is for a medium size group
        if (options.conversationId) {
          const ourNumber = textsecure.storage.user.getNumber();
          const senderIdentity = envelope.source;

          if (senderIdentity === ourNumber) {
            // Ignoring our own message
            return request.respond(200, 'OK');
          }

          // Sender identity will be lost if we load from cache, because
          // plaintext (and protobuf.Envelope) does not have that field...
          envelope.source = options.conversationId;
          plaintext = textsecure.protobuf.Envelope.encode(
            envelope
          ).toArrayBuffer();
          envelope.senderIdentity = senderIdentity;
        }

        if (this.isBlocked(envelope.source)) {
          return request.respond(200, 'OK');
        }

        envelope.id = envelope.serverGuid || window.getGuid();
        envelope.serverTimestamp = envelope.serverTimestamp
          ? envelope.serverTimestamp.toNumber()
          : null;

        return this.addToCache(envelope, plaintext).then(
          async () => {
            request.respond(200, 'OK');

            // To ensure that we queue in the same order we receive messages
            await lastPromise;
            this.queueEnvelope(envelope);
          },
          error => {
            request.respond(500, 'Failed to cache message');
            window.log.error(
              'handleRequest error trying to add message to cache:',
              error && error.stack ? error.stack : error
            );
          }
        );
      })
      .catch(e => {
        request.respond(500, 'Bad encrypted websocket message');
        window.log.error(
          'Error handling incoming message:',
          e && e.stack ? e.stack : e
        );
        const ev = new Event('error');
        ev.error = e;
        return this.dispatchAndWait(ev);
      });

    this.incoming.push(promise);
  },
  addToQueue(task) {
    this.count += 1;
    this.pending = this.pending.then(task, task);

    const { count, pending } = this;

    const cleanup = () => {
      this.updateProgress(count);
      // We want to clear out the promise chain whenever possible because it could
      //   lead to large memory usage over time:
      //   https://github.com/nodejs/node/issues/6673#issuecomment-244331609
      if (this.pending === pending) {
        this.pending = Promise.resolve();
      }
    };

    pending.then(cleanup, cleanup);

    return pending;
  },
  onEmpty() {
    const { incoming } = this;
    this.incoming = [];

    const emitEmpty = () => {
      window.log.info("MessageReceiver: emitting 'empty' event");
      const ev = new Event('empty');
      this.dispatchAndWait(ev);
    };

    const waitForApplication = async () => {
      window.log.info(
        "MessageReceiver: finished processing messages after 'empty', now waiting for application"
      );
      const promise = this.appPromise || Promise.resolve();
      this.appPromise = Promise.resolve();

      // We don't await here because we don't this to gate future message processing
      promise.then(emitEmpty, emitEmpty);
    };

    const waitForEmptyQueue = () => {
      // resetting count to zero so everything queued after this starts over again
      this.count = 0;

      this.addToQueue(waitForApplication);
    };

    // We first wait for all recently-received messages (this.incoming) to be queued,
    //   then we queue a task to wait for the application to finish its processing, then
    //   finally we emit the 'empty' event to the queue.
    Promise.all(incoming).then(waitForEmptyQueue, waitForEmptyQueue);
  },
  drain() {
    const { incoming } = this;
    this.incoming = [];

    const queueDispatch = () =>
      this.addToQueue(() => {
        window.log.info('drained');
      });

    // This promise will resolve when there are no more messages to be processed.
    return Promise.all(incoming).then(queueDispatch, queueDispatch);
  },
  updateProgress(count) {
    // count by 10s
    if (count % 10 !== 0) {
      return;
    }
    const ev = new Event('progress');
    ev.count = count;
    this.dispatchEvent(ev);
  },
  async queueAllCached() {
    const items = await this.getAllFromCache();
    for (let i = 0, max = items.length; i < max; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await this.queueCached(items[i]);
    }
  },
  async queueCached(item) {
    try {
      let envelopePlaintext = item.envelope;

      if (item.version === 2) {
        envelopePlaintext = await MessageReceiver.stringToArrayBufferBase64(
          envelopePlaintext
        );
      }

      if (typeof envelopePlaintext === 'string') {
        envelopePlaintext = await MessageReceiver.stringToArrayBuffer(
          envelopePlaintext
        );
      }
      const envelope = textsecure.protobuf.Envelope.decode(envelopePlaintext);
      envelope.id = envelope.serverGuid || item.id;
      envelope.source = envelope.source || item.source;
      envelope.sourceDevice = envelope.sourceDevice || item.sourceDevice;
      envelope.senderIdentity = envelope.senderIdentity || item.senderIdentity;
      envelope.serverTimestamp =
        envelope.serverTimestamp || item.serverTimestamp;
      envelope.preKeyBundleMessage =
        envelope.preKeyBundleMessage || item.preKeyBundleMessage;

      const { decrypted } = item;
      if (decrypted) {
        let payloadPlaintext = decrypted;

        if (item.version === 2) {
          payloadPlaintext = await MessageReceiver.stringToArrayBufferBase64(
            payloadPlaintext
          );
        }

        if (typeof payloadPlaintext === 'string') {
          payloadPlaintext = await MessageReceiver.stringToArrayBuffer(
            payloadPlaintext
          );
        }

        // Convert preKeys to array buffer
        if (typeof envelope.preKeyBundleMessage === 'string') {
          envelope.preKeyBundleMessage = await MessageReceiver.stringToArrayBuffer(
            envelope.preKeyBundleMessage
          );
        }
        this.queueDecryptedEnvelope(envelope, payloadPlaintext);
      } else {
        this.queueEnvelope(envelope);
      }
    } catch (error) {
      window.log.error(
        'queueCached error handling item',
        item.id,
        'removing it. Error:',
        error && error.stack ? error.stack : error
      );

      try {
        const { id } = item;
        await textsecure.storage.unprocessed.remove(id);
      } catch (deleteError) {
        window.log.error(
          'queueCached error deleting item',
          item.id,
          'Error:',
          deleteError && deleteError.stack ? deleteError.stack : deleteError
        );
      }
    }
  },
  async getAllFromCache() {
    window.log.info('getAllFromCache');
    const count = await textsecure.storage.unprocessed.getCount();

    if (count > 1500) {
      await textsecure.storage.unprocessed.removeAll();
      window.log.warn(
        `There were ${count} messages in cache. Deleted all instead of reprocessing`
      );
      return [];
    }

    const items = await textsecure.storage.unprocessed.getAll();
    window.log.info('getAllFromCache loaded', items.length, 'saved envelopes');

    return Promise.all(
      _.map(items, async item => {
        const attempts = 1 + (item.attempts || 0);

        try {
          if (attempts >= 3) {
            window.log.warn(
              'getAllFromCache final attempt for envelope',
              item.id
            );
            await textsecure.storage.unprocessed.remove(item.id);
          } else {
            await textsecure.storage.unprocessed.updateAttempts(
              item.id,
              attempts
            );
          }
        } catch (error) {
          window.log.error(
            'getAllFromCache error updating item after load:',
            error && error.stack ? error.stack : error
          );
        }

        return item;
      })
    );
  },
  async addToCache(envelope, plaintext) {
    const { id } = envelope;
    const data = {
      id,
      version: 2,
      envelope: await MessageReceiver.arrayBufferToStringBase64(plaintext),
      timestamp: Date.now(),
      attempts: 1,
    };

    if (envelope.senderIdentity) {
      data.senderIdentity = envelope.senderIdentity;
    }

    return textsecure.storage.unprocessed.add(data);
  },
  async updateCache(envelope, plaintext) {
    const { id } = envelope;
    const item = await textsecure.storage.unprocessed.get(id);
    if (!item) {
      window.log.error(
        `updateCache: Didn't find item ${id} in cache to update`
      );
      return null;
    }

    item.source = envelope.source;
    item.sourceDevice = envelope.sourceDevice;
    item.serverTimestamp = envelope.serverTimestamp;

    // For medium-size closed groups
    if (envelope.senderIdentity) {
      item.senderIdentity = envelope.senderIdentity;
    }

    if (item.version === 2) {
      item.decrypted = await MessageReceiver.arrayBufferToStringBase64(
        plaintext
      );
    } else {
      item.decrypted = await MessageReceiver.arrayBufferToString(plaintext);
    }

    return textsecure.storage.unprocessed.addDecryptedData(item.id, item);
  },
  removeFromCache(envelope) {
    const { id } = envelope;
    return textsecure.storage.unprocessed.remove(id);
  },
  queueDecryptedEnvelope(envelope, plaintext) {
    const id = getEnvelopeId(envelope);
    window.log.info('queueing decrypted envelope', id);

    const task = this.handleDecryptedEnvelope.bind(this, envelope, plaintext);
    const taskWithTimeout = textsecure.createTaskWithTimeout(
      task,
      `queueEncryptedEnvelope ${id}`
    );
    const promise = this.addToQueue(taskWithTimeout);

    return promise.catch(error => {
      window.log.error(
        `queueDecryptedEnvelope error handling envelope ${id}:`,
        error && error.stack ? error.stack : error
      );
    });
  },
  queueEnvelope(envelope) {
    const id = getEnvelopeId(envelope);
    window.log.info('queueing envelope', id);

    const task = this.handleEnvelope.bind(this, envelope);
    const taskWithTimeout = textsecure.createTaskWithTimeout(
      task,
      `queueEnvelope ${id}`
    );
    const promise = this.addToQueue(taskWithTimeout);

    return promise.catch(error => {
      window.log.error(
        'queueEnvelope error handling envelope',
        id,
        ':',
        error && error.stack ? error.stack : error
      );
    });
  },
  // Same as handleEnvelope, just without the decryption step. Necessary for handling
  //   messages which were successfully decrypted, but application logic didn't finish
  //   processing.
  handleDecryptedEnvelope(envelope, plaintext) {
    if (this.stoppingProcessing) {
      return Promise.resolve();
    }
    // No decryption is required for delivery receipts, so the decrypted field of
    //   the Unprocessed model will never be set

    if (envelope.content) {
      return this.innerHandleContentMessage(envelope, plaintext);
    } else if (envelope.legacyMessage) {
      return this.innerHandleLegacyMessage(envelope, plaintext);
    }
    this.removeFromCache(envelope);
    throw new Error('Received message with no content and no legacyMessage');
  },
  handleEnvelope(envelope) {
    if (this.stoppingProcessing) {
      return Promise.resolve();
    }

    if (envelope.type === textsecure.protobuf.Envelope.Type.RECEIPT) {
      return this.onDeliveryReceipt(envelope);
    }

    if (envelope.content) {
      return this.handleContentMessage(envelope);
    }

    this.removeFromCache(envelope);
    throw new Error('Received message with no content and no legacyMessage');
  },
  getStatus() {
    if (this.httpPollingResource) {
      return this.httpPollingResource.isConnected()
        ? WebSocket.OPEN
        : WebSocket.CLOSED;
    }
    if (this.hasConnected) {
      return WebSocket.CLOSED;
    }
    return -1;
  },
  onDeliveryReceipt(envelope) {
    return new Promise((resolve, reject) => {
      const ev = new Event('delivery');
      ev.confirm = this.removeFromCache.bind(this, envelope);
      ev.deliveryReceipt = {
        timestamp: envelope.timestamp.toNumber(),
        source: envelope.source,
        sourceDevice: envelope.sourceDevice,
      };
      this.dispatchAndWait(ev).then(resolve, reject);
    });
  },
  unpad(paddedData) {
    const paddedPlaintext = new Uint8Array(paddedData);
    let plaintext;

    for (let i = paddedPlaintext.length - 1; i >= 0; i -= 1) {
      if (paddedPlaintext[i] === 0x80) {
        plaintext = new Uint8Array(i);
        plaintext.set(paddedPlaintext.subarray(0, i));
        plaintext = plaintext.buffer;
        break;
      } else if (paddedPlaintext[i] !== 0x00) {
        throw new Error('Invalid padding');
      }
    }

    return plaintext;
  },
  async postDecrypt(envelope, plaintext) {
    const { isMe, isBlocked } = plaintext || {};
    if (isMe || isBlocked) {
      this.removeFromCache(envelope);
      return null;
    }

    this.updateCache(envelope, plaintext).catch(error => {
      window.log.error(
        'decrypt failed to save decrypted message contents to cache:',
        error && error.stack ? error.stack : error
      );
    });

    return plaintext;
  },
  async decryptForMediumGroup(envelope, ciphertextObj) {
    const groupId = envelope.source;

    const identity = await window.Signal.Data.getIdentityKeyById(groupId);
    const secretKeyHex = identity.secretKey;

    if (!secretKeyHex) {
      throw new Error(`Secret key is empty for group ${groupId}!`);
    }

    const { senderIdentity } = envelope;

    const {
      ciphertext: outerCiphertext,
      ephemeralKey,
    } = textsecure.protobuf.MediumGroupContent.decode(ciphertextObj);

    const ephemKey = ephemeralKey.toArrayBuffer();
    const secretKey = dcodeIO.ByteBuffer.wrap(
      secretKeyHex,
      'hex'
    ).toArrayBuffer();

    const mediumGroupCiphertext = await libloki.crypto.decryptForPubkey(
      secretKey,
      ephemKey,
      outerCiphertext.toArrayBuffer()
    );

    const {
      ciphertext,
      keyIdx,
    } = textsecure.protobuf.MediumGroupCiphertext.decode(mediumGroupCiphertext);

    const plaintext = await window.SenderKeyAPI.decryptWithSenderKey(
      ciphertext.toArrayBuffer(),
      keyIdx,
      groupId,
      senderIdentity
    );

    return plaintext;
  },
  async decrypt(envelope, ciphertext) {
    let promise;

    const ourNumber = textsecure.storage.user.getNumber();
    const me = {
      number: ourNumber,
      deviceId: parseInt(textsecure.storage.user.getDeviceId(), 10),
    };

    // Envelope.source will be null on UNIDENTIFIED_SENDER
    // Don't use it there!
    const address = new libsignal.SignalProtocolAddress(
      envelope.source,
      envelope.sourceDevice
    );

    const lokiSessionCipher = new libloki.crypto.LokiSessionCipher(
      textsecure.storage.protocol,
      address
    );

    switch (envelope.type) {
      case textsecure.protobuf.Envelope.Type.CIPHERTEXT:
        window.log.info('message from', getEnvelopeId(envelope));
        promise = lokiSessionCipher
          .decryptWhisperMessage(ciphertext)
          .then(this.unpad);
        break;
      case textsecure.protobuf.Envelope.Type.MEDIUM_GROUP_CIPHERTEXT:
        promise = this.decryptForMediumGroup(envelope, ciphertext);
        break;
      case textsecure.protobuf.Envelope.Type.FRIEND_REQUEST: {
        window.log.info('friend-request message from ', envelope.source);

        const fallBackSessionCipher = new libloki.crypto.FallBackSessionCipher(
          address
        );

        promise = fallBackSessionCipher
          .decrypt(ciphertext.toArrayBuffer())
          .then(this.unpad);
        break;
      }
      case textsecure.protobuf.Envelope.Type.PREKEY_BUNDLE:
        window.log.info('prekey message from', getEnvelopeId(envelope));
        promise = this.decryptPreKeyWhisperMessage(
          ciphertext,
          lokiSessionCipher,
          address
        );
        break;
      case textsecure.protobuf.Envelope.Type.UNIDENTIFIED_SENDER: {
        window.log.info('received unidentified sender message');

        const secretSessionCipher = new window.Signal.Metadata.SecretSessionCipher(
          textsecure.storage.protocol
        );

        promise = secretSessionCipher
          .decrypt(ciphertext.toArrayBuffer(), me)
          .then(
            result => {
              const { isMe, sender, content, type } = result;

              // We need to drop incoming messages from ourself since server can't
              //   do it for us
              if (isMe) {
                return { isMe: true };
              }

              // We might have substituted the type based on decrypted content
              if (type === textsecure.protobuf.Envelope.Type.FRIEND_REQUEST) {
                // eslint-disable-next-line no-param-reassign
                envelope.type =
                  textsecure.protobuf.Envelope.Type.FRIEND_REQUEST;
              }

              if (this.isBlocked(sender.getName())) {
                window.log.info(
                  'Dropping blocked message after sealed sender decryption'
                );
                return { isBlocked: true };
              }

              // Here we take this sender information and attach it back to the envelope
              //   to make the rest of the app work properly.

              const originalSource = envelope.source;

              // eslint-disable-next-line no-param-reassign
              envelope.source = sender.getName();
              // eslint-disable-next-line no-param-reassign
              envelope.sourceDevice = sender.getDeviceId();
              // eslint-disable-next-line no-param-reassign
              envelope.unidentifiedDeliveryReceived = !originalSource;

              // Return just the content because that matches the signature of the other
              // decrypt methods used above.
              return this.unpad(content);
            },
            error => {
              const { sender } = error || {};

              if (sender) {
                const originalSource = envelope.source;

                if (this.isBlocked(sender.getName())) {
                  window.log.info(
                    'Dropping blocked message with error after sealed sender decryption'
                  );
                  return { isBlocked: true };
                }

                // eslint-disable-next-line no-param-reassign
                envelope.source = sender.getName();
                // eslint-disable-next-line no-param-reassign
                envelope.sourceDevice = sender.getDeviceId();
                // eslint-disable-next-line no-param-reassign
                envelope.unidentifiedDeliveryReceived = !originalSource;

                throw error;
              }

              return this.removeFromCache(envelope).then(() => {
                throw error;
              });
            }
          );
        break;
      }
      default:
        promise = Promise.reject(new Error('Unknown message type'));
    }

    return promise
      .then(plaintext => this.postDecrypt(envelope, plaintext))
      .catch(error => {
        if (error && error instanceof textsecure.SenderKeyMissing) {
          const groupId = envelope.source;
          const { senderIdentity } = error;

          log.info(
            'Requesting missing key for identity: ',
            senderIdentity,
            'groupId: ',
            groupId
          );

          textsecure.messaging.requestSenderKeys(senderIdentity, groupId);

          return;
        }

        let errorToThrow = error;

        const noSession =
          error &&
          (error.message.indexOf('No record for device') === 0 ||
            error.message.indexOf('decryptWithSessionList: list is empty') ===
              0);

        if (error && error.message === 'Unknown identity key') {
          // create an error that the UI will pick up and ask the
          // user if they want to re-negotiate
          const buffer = dcodeIO.ByteBuffer.wrap(ciphertext);
          errorToThrow = new textsecure.IncomingIdentityKeyError(
            address.toString(),
            buffer.toArrayBuffer(),
            error.identityKey
          );
        } else if (!noSession) {
          // We want to handle "no-session" error, not re-throw it
          throw error;
        }
        const ev = new Event('error');
        ev.error = errorToThrow;
        ev.proto = envelope;
        ev.confirm = this.removeFromCache.bind(this, envelope);

        const returnError = () => Promise.reject(errorToThrow);
        this.dispatchAndWait(ev).then(returnError, returnError);
      });
  },
  async decryptPreKeyWhisperMessage(ciphertext, sessionCipher, address) {
    const padded = await sessionCipher.decryptPreKeyWhisperMessage(ciphertext);

    try {
      return this.unpad(padded);
    } catch (e) {
      if (e.message === 'Unknown identity key') {
        // create an error that the UI will pick up and ask the
        // user if they want to re-negotiate
        const buffer = dcodeIO.ByteBuffer.wrap(ciphertext);
        throw new textsecure.IncomingIdentityKeyError(
          address.toString(),
          buffer.toArrayBuffer(),
          e.identityKey
        );
      }
      throw e;
    }
  },
  // handle a SYNC message for a message
  // sent by another device
  async handleSentMessage(envelope, sentContainer, msg) {
    const {
      destination,
      timestamp,
      expirationStartTimestamp,
      unidentifiedStatus,
    } = sentContainer;

    // eslint-disable-next-line no-bitwise
    if (msg.flags & textsecure.protobuf.DataMessage.Flags.END_SESSION) {
      await window.NewReceiver.handleEndSession(destination);
    }

    if (msg.mediumGroupUpdate) {
      await window.NewReceiver.handleMediumGroupUpdate(
        envelope,
        msg.mediumGroupUpdate
      );
    }

    const message = await window.NewReceiver.processDecrypted(envelope, msg);

    const primaryDevicePubKey = window.storage.get('primaryDevicePubKey');

    // handle profileKey and avatar updates
    if (envelope.source === primaryDevicePubKey) {
      const { profileKey, profile } = message;
      const primaryConversation = ConversationController.get(
        primaryDevicePubKey
      );
      if (profile) {
        window.NewReceiver.updateProfile(
          primaryConversation,
          profile,
          profileKey
        );
      }
    }

    const ev = new Event('sent');
    ev.confirm = this.removeFromCache.bind(this, envelope);
    ev.data = {
      destination,
      timestamp: timestamp.toNumber(),
      device: envelope.sourceDevice,
      unidentifiedStatus,
      message,
    };
    if (expirationStartTimestamp) {
      ev.data.expirationStartTimestamp = expirationStartTimestamp.toNumber();
    }
    this.dispatchAndWait(ev);
  },
  async handleLokiAddressMessage(envelope) {
    window.log.warn('Ignoring a Loki address message');
    return this.removeFromCache(envelope);
  },
  async handlePairingRequest(envelope, pairingRequest) {
    const valid = await libloki.crypto.validateAuthorisation(pairingRequest);
    if (valid) {
      // Pairing dialog is open and is listening
      if (Whisper.events.isListenedTo('devicePairingRequestReceived')) {
        await window.libloki.storage.savePairingAuthorisation(pairingRequest);
        Whisper.events.trigger(
          'devicePairingRequestReceived',
          pairingRequest.secondaryDevicePubKey
        );
      } else {
        Whisper.events.trigger(
          'devicePairingRequestReceivedNoListener',
          pairingRequest.secondaryDevicePubKey
        );
      }
      // Ignore requests if the dialog is closed
    }
    return this.removeFromCache(envelope);
  },
  async handleAuthorisationForSelf(
    envelope,
    pairingAuthorisation,
    { dataMessage, syncMessage }
  ) {
    const valid = await libloki.crypto.validateAuthorisation(
      pairingAuthorisation
    );
    const alreadySecondaryDevice = !!window.storage.get('isSecondaryDevice');
    let removedFromCache = false;
    if (alreadySecondaryDevice) {
      window.log.warn(
        'Received an unexpected pairing authorisation (device is already paired as secondary device). Ignoring.'
      );
    } else if (!valid) {
      window.log.warn(
        'Received invalid pairing authorisation for self. Could not verify signature. Ignoring.'
      );
    } else {
      const { primaryDevicePubKey, grantSignature } = pairingAuthorisation;
      if (grantSignature) {
        // Authorisation received to become a secondary device
        window.log.info(
          `Received pairing authorisation from ${primaryDevicePubKey}`
        );
        // Set current device as secondary.
        // This will ensure the authorisation is sent
        // along with each friend request.
        window.storage.remove('secondaryDeviceStatus');
        window.storage.put('isSecondaryDevice', true);
        window.storage.put('primaryDevicePubKey', primaryDevicePubKey);
        await libloki.storage.savePairingAuthorisation(pairingAuthorisation);
        const primaryConversation = await ConversationController.getOrCreateAndWait(
          primaryDevicePubKey,
          'private'
        );
        primaryConversation.trigger('change');
        Whisper.events.trigger('secondaryDeviceRegistration');
        // Update profile
        if (dataMessage) {
          const { profile, profileKey } = dataMessage;
          const ourNumber = window.storage.get('primaryDevicePubKey');
          const me = window.ConversationController.get(ourNumber);
          if (me) {
            window.NewReceiver.updateProfile(me, profile, profileKey);
          }
        }
        // Update contact list
        if (syncMessage && syncMessage.contacts) {
          // This call already removes the envelope from the cache
          await this.handleContacts(envelope, syncMessage.contacts);
          removedFromCache = true;
        }
      } else {
        window.log.warn('Unimplemented pairing authorisation message type');
      }
    }
    if (!removedFromCache) {
      await this.removeFromCache(envelope);
    }
  },
  async handlePairingAuthorisationMessage(envelope, content) {
    const { pairingAuthorisation } = content;
    const { secondaryDevicePubKey, grantSignature } = pairingAuthorisation;
    const isGrant =
      grantSignature &&
      secondaryDevicePubKey === textsecure.storage.user.getNumber();
    if (isGrant) {
      return this.handleAuthorisationForSelf(
        envelope,
        pairingAuthorisation,
        content
      );
    }
    return this.handlePairingRequest(envelope, pairingAuthorisation);
  },
  async handleContentMessage(envelope) {
    const plaintext = await this.decrypt(envelope, envelope.content);

    if (!plaintext) {
      window.log.warn('handleContentMessage: plaintext was falsey');
      return null;
    } else if (plaintext instanceof ArrayBuffer && plaintext.byteLength === 0) {
      return null;
    }
    return this.innerHandleContentMessage(envelope, plaintext);
  },
  async handleFriendRequestAcceptIfNeeded(envelope, content) {
    const isGroupMessage =
      content &&
      content.dataMessage &&
      (content.dataMessage.group || content.dataMessage.mediumGroupUpdate);
    const isReceiptMessage = content && content.receiptMessage;
    const isTypingMessage = content && content.typingMessage;
    if (isGroupMessage || isReceiptMessage || isTypingMessage) {
      return;
    }

    // If we sent a friend request and got another message back then we should become friends
    try {
      const conversation = await window.ConversationController.getOrCreateAndWait(
        envelope.source,
        'private'
      );
      const isFriendRequestAccept = await conversation.onFriendRequestAccepted();
      if (isFriendRequestAccept) {
        await conversation.notifyFriendRequest(envelope.source, 'accepted');
      }
    } catch (e) {
      window.log.info('Error getting conversation: ', envelope.source);
    }
  },
  async handleSessionRequestMessage(envelope, content) {
    const shouldProcessSessionRequest = await libsession.Protocols.SessionProtocol.shouldProcessSessionRequest(
      envelope.source,
      envelope.timestamp
    );

    if (shouldProcessSessionRequest) {
      try {
        // TODO remember to remove savePreKeyBundleMessage() from the codebase if it's actually irrelevant
        // if (content.preKeyBundleMessage) {
        //   await this.savePreKeyBundleMessage(
        //     envelope.source,
        //     content.preKeyBundleMessage
        //   );
        // }
        // device id are always 1 with Session
        const deviceId = 1;
        const address = new libsignal.SignalProtocolAddress(
          envelope.source,
          deviceId
        );
        // we process the new prekeys and initiate a new session.
        // The old sessions will get deleted once the correspondant
        // has switch to the new session.
        const { preKey, signedKey, identityKey } = content.preKeyBundleMessage;
        if (preKey === undefined || signedKey === undefined) {
          window.console.warn(
            "Couldn't process prekey bundle without preKey or signedKey"
          );
          return;
        }
        const device = {
          identityKey,
          deviceId,
          preKey,
          signedPreKey: signedKey,
          registrationId: 0,
        };
        const builder = new libsignal.SessionBuilder(
          textsecure.storage.protocol,
          address
        );
        await builder.processPreKey(device);

        await libsession.Protocols.SessionProtocol.onSessionRequestProcessed(
          envelope.source
        );
        window.log.debug('sending session established to', envelope.source);
        // We don't need to await the call below because we just want to send it off
        window.libloki.api.sendSessionEstablishedMessage(envelope.source);
      } catch (e) {
        window.log.warn('Failed to process session request');
        // TODO how to handle a failed session request?
      }
    }
  },
  async innerHandleContentMessage(envelope, plaintext) {
    const content = textsecure.protobuf.Content.decode(plaintext);
    const { SESSION_REQUEST } = textsecure.protobuf.Envelope.Type;

    if (envelope.type === SESSION_REQUEST) {
      await this.handleSessionRequestMessage(envelope, content);
    } else {
      await libsession.Protocols.SessionProtocol.onSessionEstablished(
        envelope.source
      );
      // TODO process sending queue for this device now that we have a session
    }

    this.handleFriendRequestAcceptIfNeeded(envelope, content);

    if (content.pairingAuthorisation) {
      return this.handlePairingAuthorisationMessage(envelope, content);
    }
    if (content.syncMessage) {
      return this.handleSyncMessage(envelope, content.syncMessage);
    }
    if (content.dataMessage) {
      window.NewReceiver.handleDataMessage(envelope, content.dataMessage);
      return undefined;
    }
    if (content.nullMessage) {
      return this.handleNullMessage(envelope, content.nullMessage);
    }
    if (content.callMessage) {
      return this.handleCallMessage(envelope, content.callMessage);
    }
    if (content.receiptMessage) {
      return this.handleReceiptMessage(envelope, content.receiptMessage);
    }
    if (content.typingMessage) {
      return this.handleTypingMessage(envelope, content.typingMessage);
    }

    return null;
  },
  handleCallMessage(envelope) {
    window.log.info('call message from', getEnvelopeId(envelope));
    this.removeFromCache(envelope);
  },
  handleReceiptMessage(envelope, receiptMessage) {
    const results = [];
    if (
      receiptMessage.type === textsecure.protobuf.ReceiptMessage.Type.DELIVERY
    ) {
      for (let i = 0; i < receiptMessage.timestamp.length; i += 1) {
        const ev = new Event('delivery');
        ev.confirm = this.removeFromCache.bind(this, envelope);
        ev.deliveryReceipt = {
          timestamp: receiptMessage.timestamp[i].toNumber(),
          source: envelope.source,
          sourceDevice: envelope.sourceDevice,
        };
        results.push(this.dispatchAndWait(ev));
      }
    } else if (
      receiptMessage.type === textsecure.protobuf.ReceiptMessage.Type.READ
    ) {
      for (let i = 0; i < receiptMessage.timestamp.length; i += 1) {
        const ev = new Event('read');
        ev.confirm = this.removeFromCache.bind(this, envelope);
        ev.timestamp = envelope.timestamp.toNumber();
        ev.read = {
          timestamp: receiptMessage.timestamp[i].toNumber(),
          reader: envelope.source,
        };
        results.push(this.dispatchAndWait(ev));
      }
    }
    return Promise.all(results);
  },
  handleTypingMessage(envelope, typingMessage) {
    const ev = new Event('typing');

    this.removeFromCache(envelope);

    if (envelope.timestamp && typingMessage.timestamp) {
      const envelopeTimestamp = envelope.timestamp.toNumber();
      const typingTimestamp = typingMessage.timestamp.toNumber();

      if (typingTimestamp !== envelopeTimestamp) {
        window.log.warn(
          `Typing message envelope timestamp (${envelopeTimestamp}) did not match typing timestamp (${typingTimestamp})`
        );
        return null;
      }
    }

    ev.sender = envelope.source;
    ev.senderDevice = envelope.sourceDevice;
    ev.typing = {
      typingMessage,
      timestamp: typingMessage.timestamp
        ? typingMessage.timestamp.toNumber()
        : Date.now(),
      groupId: typingMessage.groupId
        ? typingMessage.groupId.toString('binary')
        : null,
      started:
        typingMessage.action ===
        textsecure.protobuf.TypingMessage.Action.STARTED,
      stopped:
        typingMessage.action ===
        textsecure.protobuf.TypingMessage.Action.STOPPED,
    };

    return this.dispatchEvent(ev);
  },
  handleNullMessage(envelope) {
    window.log.info('null message from', getEnvelopeId(envelope));
    this.removeFromCache(envelope);
  },
  async handleSyncMessage(envelope, syncMessage) {
    // We should only accept sync messages from our devices
    const ourNumber = textsecure.storage.user.getNumber();
    const ourPrimaryNumber = window.storage.get('primaryDevicePubKey');
    const ourOtherDevices = await libloki.storage.getAllDevicePubKeysForPrimaryPubKey(
      ourPrimaryNumber
    );
    const ourDevices = new Set([
      ourNumber,
      ourPrimaryNumber,
      ...ourOtherDevices,
    ]);
    const validSyncSender = ourDevices.has(envelope.source);
    if (!validSyncSender) {
      throw new Error(
        "Received sync message from a device we aren't paired with"
      );
    }

    if (syncMessage.sent) {
      const sentMessage = syncMessage.sent;
      const to = sentMessage.message.group
        ? `group(${sentMessage.message.group.id.toBinary()})`
        : sentMessage.destination;

      window.log.info(
        'sent message to',
        to,
        sentMessage.timestamp.toNumber(),
        'from',
        getEnvelopeId(envelope)
      );
      return this.handleSentMessage(envelope, sentMessage, sentMessage.message);
    } else if (syncMessage.contacts) {
      return this.handleContacts(envelope, syncMessage.contacts);
    } else if (syncMessage.groups) {
      return this.handleGroups(envelope, syncMessage.groups);
    } else if (syncMessage.openGroups) {
      return this.handleOpenGroups(envelope, syncMessage.openGroups);
    } else if (syncMessage.blocked) {
      return this.handleBlocked(envelope, syncMessage.blocked);
    } else if (syncMessage.request) {
      window.log.info('Got SyncMessage Request');
      return this.removeFromCache(envelope);
    } else if (syncMessage.read && syncMessage.read.length) {
      window.log.info('read messages from', getEnvelopeId(envelope));
      return this.handleRead(envelope, syncMessage.read);
    } else if (syncMessage.verified) {
      return this.handleVerified(envelope, syncMessage.verified);
    } else if (syncMessage.configuration) {
      return this.handleConfiguration(envelope, syncMessage.configuration);
    }
    throw new Error('Got empty SyncMessage');
  },
  handleConfiguration(envelope, configuration) {
    window.log.info('got configuration sync message');
    const ev = new Event('configuration');
    ev.confirm = this.removeFromCache.bind(this, envelope);
    ev.configuration = configuration;
    return this.dispatchAndWait(ev);
  },
  handleVerified(envelope, verified) {
    const ev = new Event('verified');
    ev.confirm = this.removeFromCache.bind(this, envelope);
    ev.verified = {
      state: verified.state,
      destination: verified.destination,
      identityKey: verified.identityKey.toArrayBuffer(),
    };
    return this.dispatchAndWait(ev);
  },
  handleRead(envelope, read) {
    const results = [];
    for (let i = 0; i < read.length; i += 1) {
      const ev = new Event('readSync');
      ev.confirm = this.removeFromCache.bind(this, envelope);
      ev.timestamp = envelope.timestamp.toNumber();
      ev.read = {
        timestamp: read[i].timestamp.toNumber(),
        sender: read[i].sender,
      };
      results.push(this.dispatchAndWait(ev));
    }
    return Promise.all(results);
  },
  handleContacts(envelope, contacts) {
    window.log.info('contact sync');
    // const { blob } = contacts;

    // Note: we do not return here because we don't want to block the next message on
    //   this attachment download and a lot of processing of that attachment.
    this.handleAttachment(contacts).then(attachmentPointer => {
      const results = [];
      const contactBuffer = new ContactBuffer(attachmentPointer.data);
      let contactDetails = contactBuffer.next();
      while (contactDetails !== undefined) {
        const ev = new Event('contact');
        ev.contactDetails = contactDetails;
        results.push(this.dispatchAndWait(ev));

        contactDetails = contactBuffer.next();
      }

      const ev = new Event('contactsync');
      results.push(this.dispatchAndWait(ev));

      return Promise.all(results).then(() => {
        window.log.info('handleContacts: finished');
        return this.removeFromCache(envelope);
      });
    });
  },
  handleGroups(envelope, groups) {
    window.log.info('group sync');

    // Note: we do not return here because we don't want to block the next message on
    //   this attachment download and a lot of processing of that attachment.
    this.handleAttachment(groups).then(attachmentPointer => {
      const groupBuffer = new GroupBuffer(attachmentPointer.data);
      let groupDetails = groupBuffer.next();
      const promises = [];
      while (groupDetails !== undefined) {
        groupDetails.id = groupDetails.id.toBinary();
        const ev = new Event('group');
        ev.confirm = this.removeFromCache.bind(this, envelope);
        ev.groupDetails = groupDetails;
        const promise = this.dispatchAndWait(ev).catch(e => {
          window.log.error('error processing group', e);
        });
        groupDetails = groupBuffer.next();
        promises.push(promise);
      }

      Promise.all(promises).then(() => {
        const ev = new Event('groupsync');
        ev.confirm = this.removeFromCache.bind(this, envelope);
        return this.dispatchAndWait(ev);
      });
    });
  },
  handleOpenGroups(envelope, openGroups) {
    const groupsArray = openGroups.map(openGroup => openGroup.url);
    libloki.api.debug.logGroupSync(
      `Received GROUP_SYNC with open groups: [${groupsArray}]`
    );
    openGroups.forEach(({ url, channelId }) => {
      window.attemptConnection(url, channelId);
    });
    return this.removeFromCache(envelope);
  },
  handleBlocked(envelope, blocked) {
    window.log.info('Setting these numbers as blocked:', blocked.numbers);
    textsecure.storage.put('blocked', blocked.numbers);

    const groupIds = _.map(blocked.groupIds, groupId => groupId.toBinary());
    window.log.info(
      'Setting these groups as blocked:',
      groupIds.map(groupId => `group(${groupId})`)
    );
    textsecure.storage.put('blocked-groups', groupIds);

    return this.removeFromCache(envelope);
  },
  async savePreKeyBundleMessage(pubKey, preKeyBundleMessage) {
    const [identityKey, preKey, signedKey, signature] = [
      preKeyBundleMessage.identityKey,
      preKeyBundleMessage.preKey,
      preKeyBundleMessage.signedKey,
      preKeyBundleMessage.signature,
    ].map(k => dcodeIO.ByteBuffer.wrap(k).toArrayBuffer());

    const { preKeyId, signedKeyId } = preKeyBundleMessage;

    if (pubKey !== StringView.arrayBufferToHex(identityKey)) {
      throw new Error(
        'Error in savePreKeyBundleMessage: envelope pubkey does not match pubkey in prekey bundle'
      );
    }

    await libloki.storage.saveContactPreKeyBundle({
      pubKey,
      preKeyId,
      signedKeyId,
      preKey,
      signedKey,
      signature,
    });
  },
  isBlocked(number) {
    return textsecure.storage.get('blocked', []).indexOf(number) >= 0;
  },
  handleAttachment(attachment) {
    // window.log.info('Not handling attachments.');
    return Promise.resolve({
      ...attachment,
      data: dcodeIO.ByteBuffer.wrap(attachment.data).toArrayBuffer(), // ByteBuffer to ArrayBuffer
    });
  },
});

window.textsecure = window.textsecure || {};

textsecure.MessageReceiver = function MessageReceiverWrapper(
  username,
  password,
  signalingKey,
  options
) {
  const messageReceiver = new MessageReceiver(
    username,
    password,
    signalingKey,
    options
  );
  this.addEventListener = messageReceiver.addEventListener.bind(
    messageReceiver
  );
  this.removeEventListener = messageReceiver.removeEventListener.bind(
    messageReceiver
  );
  this.getStatus = messageReceiver.getStatus.bind(messageReceiver);
  this.close = messageReceiver.close.bind(messageReceiver);
  this.savePreKeyBundleMessage = messageReceiver.savePreKeyBundleMessage.bind(
    messageReceiver
  );

  this.pollForAdditionalId = messageReceiver.pollForAdditionalId.bind(
    messageReceiver
  );
  this.stopProcessing = messageReceiver.stopProcessing.bind(messageReceiver);

  messageReceiver.connect();
};

textsecure.MessageReceiver.prototype = {
  constructor: textsecure.MessageReceiver,
};

textsecure.MessageReceiver.stringToArrayBuffer =
  MessageReceiver.stringToArrayBuffer;
textsecure.MessageReceiver.arrayBufferToString =
  MessageReceiver.arrayBufferToString;
textsecure.MessageReceiver.stringToArrayBufferBase64 =
  MessageReceiver.stringToArrayBufferBase64;
textsecure.MessageReceiver.arrayBufferToStringBase64 =
  MessageReceiver.arrayBufferToStringBase64;
