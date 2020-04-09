/* global Whisper, getInboxCollection, $ */

// eslint-disable-next-line func-names
(function () {
  'use strict';

  window.Whisper = window.Whisper || {};

  Whisper.ConversationListView = Whisper.ListView.extend({
    tagName: 'div',
    itemView: Whisper.ConversationListItemView,
    getCollection() {
      return getInboxCollection();
    },
    updateLocation(conversation) {
      const $el = this.$(`.${conversation.cid}`);

      if (!$el || !$el.length) {
        window.log.warn(
          'updateLocation: did not find element for conversation',
          conversation.idForLogging()
        );
        return;
      }
      if ($el.length > 1) {
        window.log.warn(
          'updateLocation: found more than one element for conversation',
          conversation.idForLogging()
        );
        return;
      }

      const $allConversations = this.$('.conversation-list-item');
      const inboxCollection = this.getCollection();
      const index = inboxCollection.indexOf(conversation);

      const elIndex = $allConversations.index($el);
      if (elIndex < 0) {
        window.log.warn(
          'updateLocation: did not find index for conversation',
          conversation.idForLogging()
        );
      }

      if (index === elIndex) {
        return;
      }
      if (index === 0) {
        this.$el.prepend($el);
      } else if (index === this.collection.length - 1) {
        this.$el.append($el);
      } else {
        const targetConversation = inboxCollection.at(index - 1);
        const target = this.$(`.${targetConversation.cid}`);
        $el.insertAfter(target);
      }

      if ($('.selected').length) {
        $('.selected')[0].scrollIntoView({
          block: 'nearest',
        });
      }
    },
    removeItem(conversation) {
      const $el = this.$(`.${conversation.cid}`);
      if ($el && $el.length > 0) {
        $el.remove();
      }
    },
  });
})();
