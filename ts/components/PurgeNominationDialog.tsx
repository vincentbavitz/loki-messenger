import React from 'react';


interface Props {
    i18n: any;
    onClose: any;
    onSetPurgeNominee: any;
}

export class PurgeNominationDialog extends React.Component<Props>{
    constructor(props: any){
        super(props);

        this.close = this.close.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        
        window.addEventListener('keyup', this.onKeyUp);
    }

    public render() {
        const i18n = this.props.i18n;

        const cancelText = i18n('cancel');
        //const purgeAccountInfo = i18n('purgeAccountInfo');

        return (
            <div className="content">
                <div>
                    <input type="text"/>
                    Lorem ipsum dolor sit amet consectetur adipisicing elit. Aspernatur consequuntur voluptate minima eligendi velit unde dicta quaerat non doloremque fuga, optio quibusdam saepe vel blanditiis explicabo? Beatae maxime esse illum.
                </div>

                <div className="buttons">
                    <button className="cancel" tabIndex={ 0 } onClick={ this.close }>
                        { cancelText }
                    </button>

                    <button className="ok" tabIndex={ 0 } onClick={ this.onClickNominatePurger}>
                        CLICCK HEERE
                    </button>
                </div>
            </div>
        );
    }

    private onKeyUp(e: any) {
        ['Esc', 'Escape'].includes(e.key) && this.close();
    }

    private close(){
        window.removeEventListener('keyup', this.onKeyUp);
        this.props.onClose();
    }

    private onClickNominatePurger(){
        return;
    }

}