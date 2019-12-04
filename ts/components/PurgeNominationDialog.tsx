import React from 'react';


interface Props {
    i18n: any;
    onClose: any;
    onSetPurgeNominee: any;
    ourPubKey: string;
}

interface State {
    isNomineeError: boolean;
    isPurgeAccError: boolean;
}

export class PurgeNominationDialog extends React.Component<Props, State>{
    constructor(props: any){
        super(props);

        this.close = this.close.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);

        this.state = {
            isNomineeError: false,
            isPurgeAccError: true,
        };

        setInterval(() => {
            this.setState({
                isNomineeError: ! this.state.isNomineeError,
                isPurgeAccError: ! this.state.isPurgeAccError,
            });

            console.log(`isNomineeError: ${this.state.isNomineeError}`);
        }, 1000);

        window.addEventListener('keyup', this.onKeyUp);
    }

    public render() {
        const i18n = this.props.i18n;
        const pubKeyLen = Number(this.props.ourPubKey.length);

        
        const cancelText = i18n('cancel');
        return (
            <div className="content">
                <div className="section">
                    <h3>
                        Nominate a user to wipe your account
                    </h3>

                    <p>
                        Nominate a user by their public key to have the authority to delete all data associated with your account.
                        A special key will be sent to the trusted nominee, requesting them to allow purging of your account.
                        <br/>
                        <strong>If the user accepts, they may wipe your profile and all associated data from Loki.</strong>
                    </p>
                    <input
                        type="text"
                        maxLength={ pubKeyLen }
                        size = { pubKeyLen }
                        placeholder = { i18n('purgeNomineePubkeyInput') }
                        className="purge-nomination-pubkey-input"
                        onKeyUp={ this.onKeyUp }
                    />

                    <div
                        id="purge-account-error-message"
                        className="error-message"
                        style={{ display: this.state.isNomineeError ? 'block' : 'none' }}
                    >
                        you have an error sonny boy!
                    </div>

                    <button className="ok" tabIndex={ 0 } onClick={ this.onClickNominatePurger}>
                        CLICCK HEERE
                    </button>

                    <div className="clear"></div>
                </div>
                
                <div className="section">
                    <h3>
                        Wipe an account
                    </h3>

                    <p>
                        Enter the public key of a user who has given you permissions to purge your account.
                        <br/>
                        <strong>This will irreversibly delete the users account and all associated data.</strong>
                    </p>
                    <input
                        type="text"
                        maxLength={ pubKeyLen }
                        size = { pubKeyLen }
                        placeholder = { i18n('purgeAccountPubkeyInput') }
                        className="purge-nomination-pubkey-input"
                        onKeyUp={ this.onKeyUp }
                    />

                    <br/>
                    <div
                        id="purge-account-error-message"
                        className="error-message"
                        style={{ display: this.state.isPurgeAccError ? 'block' : 'none' }}
                    >
                        {
                            // if user enters their own public key. Throw error.
                            // if user enters public key for whom they're not a nominee, throw error
                        }
                        asdfasdf
                    </div>

                    <button className="ok" tabIndex={ 0 } onClick={ this.onClickNominatePurger}>
                        CLICCK HEERE
                    </button>
                    <div className="clear"></div>

                </div>


                <div className="cancel">
                    <hr/>
                    <button className="cancel" tabIndex={ 0 } onClick={ this.close }>
                        { cancelText }
                    </button>
                </div>
            </div>
        );
    }

    private onKeyUp(e: any) {
        if (['Esc', 'Escape'].includes(e.key)){
            this.close();
            return;
        }
    }

    private close(){
        window.removeEventListener('keyup', this.onKeyUp);
        this.props.onClose();
    }

    private onClickNominatePurger(){
        return;
    }


}

