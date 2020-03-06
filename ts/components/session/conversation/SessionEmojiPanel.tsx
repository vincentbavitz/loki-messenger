import React from 'react';
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import { Picker } from 'emoji-mart';
import classNames from 'classnames';

interface Props {
  onEmojiClicked: (emoji: any) => void;
  show: boolean;
}

export class SessionEmojiPanel extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  public render() {
    const { onEmojiClicked, show } = this.props;

    return (
      <div className={classNames('session-emoji-panel', show ? 'show' : '')}>
        <Picker
          backgroundImageFn={(_set, sheetSize) =>
            `./images/emoji-sheet-${sheetSize}.png`
          }
          darkMode={true}
          color={'#00f782'}
          showPreview={true}
          title={''}
          onSelect={onEmojiClicked}
          autoFocus={true}
          set="apple"
        />
      </div>
    );
  }
}
