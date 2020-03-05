import React from 'react';
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import { Picker } from 'emoji-mart';

interface Props {
  onEmojiClicked: (emoji: any) => void;
}

export class SessionEmojiPanel extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
  }


  public render() {
    const { onEmojiClicked } = this.props;

    return (
      <div
        className="session-emoji-panel"
      >
        <Picker
          backgroundImageFn={(_set, sheetSize) => `./images/emoji-sheet-${sheetSize}.png`}
          darkMode={true}
          color={'#00f782'}
          showPreview={true}
          title={''}
          onSelect={onEmojiClicked}
          autoFocus={true}
        />
      </div>
    );
  }
}
