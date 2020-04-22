import React from 'react';
import Tooltip from 'rc-tooltip';

interface Props {
  hasTooltip: boolean;
  size: number;
}

export class SessionVerifiedCheck extends React.PureComponent<Props> {
  public static defaultProps = {
    hasTooltip: true,
    size: 16,
  };

  constructor(props: any) {
    super(props);
  }

  public render() {
    const {hasTooltip, size } = this.props;

    const style = {
      height: `${size}px`,
      width: `${size}px`,
      fontSize: `${size * 0.75}px`,
    } as React.CSSProperties;

    return (
      <>
        <div
          data-tip="Verified LNS Name"
          className="session-verified-check"
          style={style}
        >
          ✔
        </div>
        {hasTooltip && (
          <Tooltip placement="left" trigger={['click']} overlay={<span>tooltip</span>}>
            <span>hover</span>
          </Tooltip>
        )}
      </>
    );
  }

}
