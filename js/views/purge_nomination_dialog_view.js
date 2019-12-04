/* global i18n, Whisper, textsecure */

// eslint-disable-next-line func-names
(function() {
    'use strict'

    window.Whisper = window.Whisper || {};

    Whisper.PurgeNominationDialogView = Whisper.View.extend({
        className: 'loki-dialog modal',
        initialize(){
            this.ourPubKey = textsecure.storage.user.getNumber();

            this.close = this.close.bind(this);
            this.$el.focus();
            this.render();
        },
        render() {
            this.dialogView = new Whisper.ReactWrapperView({
                className: 'purge-nomination-dialog',
                Component: window.Signal.Components.PurgeNominationDialog,
                props: {
                    onOk: this.onOk,
                    onClose: this.close,
                    ourPubKey: this.ourPubKey,
                    i18n,
                },
            });

            this.$el.append(this.dialogView.el);
            return this;
        },
        close() {
            this.remove();
        },
    });
})();