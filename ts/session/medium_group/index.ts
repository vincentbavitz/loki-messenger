import { PubKey } from '../types';
import { onGroupReceived } from '../../receiver/receiver';
import { StringUtils } from '../utils';
import * as Data from '../../../js/modules/data';
import _ from 'lodash';

import {
  createSenderKeyForGroup,
  RatchetState,
  saveSenderKeys,
  saveSenderKeysInner,
} from './senderKeys';
import { getChainKey } from './ratchet';
import { MultiDeviceProtocol } from '../protocols';

export {
  createSenderKeyForGroup,
  saveSenderKeys,
  saveSenderKeysInner,
  getChainKey,
};

export async function createSenderKeysForMembers(
  groupId: string,
  members: Array<PubKey>
): Promise<Array<RatchetState>> {
  const allDevices = await Promise.all(
    members.map(async pk => {
      return MultiDeviceProtocol.getAllDevices(pk);
    })
  );

  const devicesFlat = _.flatten(allDevices);

  return Promise.all(
    devicesFlat.map(async pk => {
      return createSenderKeyForGroup(groupId, PubKey.cast(pk));
    })
  );
}
