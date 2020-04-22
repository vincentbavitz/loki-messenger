import React from 'react';

interface Props {
  hasTooltip: boolean;
  // Default size scales in CSS with parent REM
  size?: number;
}

export class SessionVerifiedCheck extends React.PureComponent<Props> {
  public static defaultProps = {
    hasTooltip: true,
  };

  constructor(props: any) {
    super(props);
  }

  public render() {
    const { hasTooltip, size } = this.props;

    const style =
      size &&
      ({
        height: `${size}px`,
        width: `${size}px`,
        fontSize: `${size * 0.75}px`,
      } as React.CSSProperties);

    return (
      <div
        className="session-verified-check"
        data-tip={window.i18n('lnsVerifiedTooltip')}
        style={style || undefined}
      >
        <div className="session-verified-check__bubble">
          {hasTooltip && (
            // Display tooltip
            // Look for tooltip package that isn't rc-tooltip or react-tooltip
            // because these don't support TypeScript
            <></>
          )}
        </div>
        ✔
      </div>
    );
  }
}
