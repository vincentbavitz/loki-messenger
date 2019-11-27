/* global Whisper, i18n */

// eslint-disable-next-line func-names

// still need to get members list for public group chats

// allow when getListofMembers is async
// (async function() {
(function(){
  'use strict';

  window.Whisper = window.Whisper || {};

  // enable when getListOfMembers is rewritten to be async
  // const memberList = await window.lokiPublicChatAPI.getListOfMembers();

  // TODO: take a title string which could replace the 'members' header
  Whisper.GroupMemberList = Whisper.View.extend({
    className: 'group-member-list panel',
    templateName: 'group-member-list',
    initialize(options) {
      this.needVerify = options.needVerify;

      this.render();

      this.member_list_view = new Whisper.ContactListView({
        collection: this.model,
        className: 'members',
        toInclude: {
          listenBack: options.listenBack,
        },
      });
      this.member_list_view.render();

      this.$('.container').append(this.member_list_view.el);
    },
    render_attributes() {
      let summary;
      if (this.needVerify) {
        summary = i18n('membersNeedingVerification');
      }

      return {
        members: i18n('groupMembers'),
        membersSubtitle: i18n('groupMembers'),
        summary,
      };
    },
  });
})();
