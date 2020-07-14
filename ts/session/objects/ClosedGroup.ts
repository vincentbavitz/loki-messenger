// This is the (Closed | Medium) Group equivalent to the SessionGroup type.

import { ClosedGroupType, PubKey } from '../types';
import { UserUtil } from '../../util';
import { MultiDeviceProtocol } from '../protocols';
import { onGroupReceived } from '../../receiver/receiver';
import * as Data from '../../../js/modules/data';

import { createSenderKeysForMembers } from '../medium_group';
import { StringUtils } from '../utils';

interface ClosedGroupParams {
  id: PubKey;
  type: ClosedGroupType;
  admins: Array<PubKey>;
  members: Array<PubKey>;
}

export class ClosedGroup {
  public readonly id: PubKey;
  public readonly type: ClosedGroupType;
  public admins: Array<PubKey>;
  public members: Array<PubKey>;

  constructor(params: ClosedGroupParams) {
    this.id = params.id;
    this.type = params.type;
    this.admins = params.admins;
    this.members = params.members;
  }

  public static async create(
    name: string,
    type: ClosedGroupType,
    members: Array<PubKey>,
    onSuccess?: any
  ): Promise<ClosedGroup | undefined> {
    const {
      ConversationController,
      StringView,
      libsignal,
      textsecure,
      owsDesktopApp,
    } = window;

    const isMediumGroup = type === ClosedGroupType.MEDIUM;

    // Create Group Identity
    const identityKeys = await libsignal.KeyHelper.generateIdentityKeyPair();
    const id = StringView.arrayBufferToHex(identityKeys.pubKey);

    const ourPubKey = await UserUtil.getCurrentDevicePubKey();
    if (!ourPubKey) {
      return;
    }

    // Get the primary device of all members
    const primaryDeviceKey = await MultiDeviceProtocol.getPrimaryDevice(
      ourPubKey
    );
    const refinedMembers = await Promise.all(
      members.map(m => MultiDeviceProtocol.getPrimaryDevice(m))
    );

    const admins = [primaryDeviceKey];
    const allMembers = [...refinedMembers, primaryDeviceKey];
    const allMembersKeys = allMembers.map(m => m.key);

    const secretKey = isMediumGroup
      ? new Uint8Array(identityKeys.privKey)
      : undefined;

    const senderKeys = isMediumGroup
      ? await createSenderKeysForMembers(id, allMembers)
      : undefined;

    if (isMediumGroup) {
      // TODO: make this strongly typed!
      const groupSecretKeyHex = StringUtils.decode(identityKeys.privKey, 'hex');
      await Data.createOrUpdateIdentityKey({
        id,
        secretKey: groupSecretKeyHex,
      });
    }

    const groupDetails = {
      id,
      name,
      members: allMembersKeys,
      recipients: allMembersKeys,
      active: true,
      avatar: undefined,
      expireTimer: 0,
      secretKey,
      senderKeys,
      isMediumGroup,
    };

    await onGroupReceived(groupDetails);

    // Set conversation details
    const convo = await ConversationController.getOrCreateAndWait(id, 'group');
    convo.updateGroupAdmins([primaryDeviceKey]);
    convo.updateGroup(groupDetails);

    textsecure.messaging.sendGroupSyncMessage([convo]);
    owsDesktopApp.openConversation(id, {});

    return new ClosedGroup({
      id,
      type,
      admins,
      members: allMembers,
    });
  }

  // public static get(id: PubKey): ClosedGroup | undefined {
  //   // Gets a closed group from its group id
  //   return;
  // }

  // public update(): Promise<Array<PubKey>> {
  //   //
  // }

  // public updateMembers(): Promise<Array<PubKey>> {
  //   // Abstraction on update
  //   // Update the conversation and this object
  // }

  // public async removeMembers(): Promise<Array<PubKey>> {
  //   // Abstraction on updateMembers
  // }

  // public async addMembers(): Promise<Array<PubKey>> {
  //   // Abstraction on updateMembers
  // }

  // public async setName(): Promise<void> {
  //   // Set or update the name of the group
  // }

  // public leave() {
  //   // Leave group
  // }

  // public getConversation() {

  // }

  //   static from(groupId) {
  //       // Returns a new instance from a groupId if it's valid
  //       const groupIdAsPubKey = groupId instanceof _1.PubKey
  //           ? groupId
  //           : _1.PubKey.from(groupId);
  //       openGroupParams = {
  //           groupId:
  //       };
  //       return new SessionGroup(openGroupParams);
  //   }
}
