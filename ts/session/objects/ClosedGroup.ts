// This is the (Closed | Medium) Group equivalent to the SessionGroup type.

import { ClosedGroupType, PubKey } from '../types';
import { UserUtil } from '../../util';
import { MultiDeviceProtocol } from '../protocols';
import { onGroupReceived } from '../../receiver/receiver';
import * as Data from '../../../js/modules/data';

import { createSenderKeysForMembers } from '../medium_group';
import { GroupUtils, StringUtils } from '../utils';
import { Constants, Utils } from '..';
import { ConversationModel } from '../../../js/models/conversations';
import { AttachmentPointer } from '../messages/outgoing';
import { Attachment } from '../../types/Attachment';

interface ClosedGroupParams {
  id: PubKey;
  type: ClosedGroupType;
  name: string;
  admins: Array<PubKey>;
  members: Array<PubKey>;
  expireTimer: number;
}

interface ClosedGroupUpdateParams {
  // Closed groups do not currently support avatars
  avatar?: string;
  recipients: Array<PubKey>;
  members: Array<PubKey>;
  isMediumGroup: boolean;
  options: any;
}

export class ClosedGroup {
  public readonly id: PubKey;
  public readonly type: ClosedGroupType;
  private _name: string;
  private _admins: Array<PubKey>;
  private _members: Array<PubKey>;
  private _expireTimer: number;

  constructor(params: ClosedGroupParams) {
    // Setters and getters are used to prevent altering the values of name, admins, etc without a group update.
    // To update the members of a group, for example, simply run myClosedGroup.members = [..., ..., ...];

    this.id = params.id;
    this.type = params.type;
    this._name = params.name;
    this._admins = params.admins;
    this._members = params.members;
    this._expireTimer = params.expireTimer;
  }

  get name() {
    console.log(`[vince] HERE IS MY NAME!! _name: `, name);
    return this._name;
  }

  set name(value: string) {
    this._name = 'dfg';

    // this.update();
  }

  get admins() {
    return this._admins;
  }

  public static async create(
    name: string,
    type: ClosedGroupType,
    members: Array<PubKey>
  ): Promise<ClosedGroup | undefined> {
    // Ensure you run in a try / catch / finally to handle errors and success
    const {
      ConversationController,
      StringView,
      libsignal,
      textsecure,
      owsDesktopApp,
    } = window;

    const isMediumGroup = type === ClosedGroupType.MEDIUM;

    // Handle invalid name
    if (!Constants.CLOSED_GROUP.NAME_REGEX.test(name)) {
      throw new Error('Invalid closed group name');
    }

    // Handle invalid group size.
    // Having zero other members is valid, as we are the only member
    if (
      type === ClosedGroupType.SMALL &&
      members.length > Constants.CLOSED_GROUP.MAX_SMALL_GROUP_MEMBERS - 1
    ) {
      throw new Error('Closed groups are limited to 10 memebers');
    }

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

    const admins = [PubKey.cast(primaryDeviceKey)];
    const adminsKeys = admins.map(a => a.key);
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
    const conversation = await ConversationController.getOrCreateAndWait(
      id,
      'group'
    );
    conversation.updateGroupAdmins(adminsKeys);
    conversation.updateGroup(groupDetails);

    textsecure.messaging.sendGroupSyncMessage([conversation]);
    owsDesktopApp.appView.openConversation(id, {});

    // Subscribe to this group id
    if (isMediumGroup) {
      window.SwarmPolling.addGroupId(new PubKey(id));
    }

    return new ClosedGroup({
      id,
      type,
      name,
      admins,
      members: allMembers,
    });
  }

  public static get(id: PubKey): ClosedGroup | undefined {
    // Gets a closed group from its group id
    const { ConversationController } = window;

    const conversation = ConversationController.get(
      id.key
    ) as ConversationModel;

    // Ensure that the conversation is a group
    // We know it's a closed group because we used a PubKey
    if (!conversation || conversation.attributes.type !== 'group') {
      return;
    }

    // Ensure admins and members exist in the group
    if (
      !conversation.attributes.members ||
      !conversation.attributes.members.length ||
      !conversation.attributes.groupAdmins ||
      !conversation.attributes.groupAdmins.length
    ) {
      return;
    }

    const type = Boolean(conversation.attributes.isMediumGroup)
      ? ClosedGroupType.MEDIUM
      : ClosedGroupType.SMALL;

    const admins = conversation.attributes.groupAdmins.map((a: string) => PubKey.cast(a));
    const members = conversation.attributes.members.map((m: string) => PubKey.cast(m));
    const expireTimer = conversation.attributes.expireTimer;

    return new ClosedGroup({ id, type, name, admins, members, expireTimer });
  }



  public update(params: ClosedGroupUpdateParams) {

  }

  // public updateMembers(members: Array<PubKey>): Promise<Array<PubKey>> {
  //   // Abstraction on update
  //   // Update the conversation and this object

  //   this.update()
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

  // public async updateAdmins

  public async setExpireTimer(): Promise<void> {
    return;
  }

  // public leave() {
  //   // Leave group
  // }

  public getConversation(): ConversationModel | undefined {
    const { ConversationController } = window;
    return ConversationController.get(this.id.key);
  }

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

  private async areWeAdmin() {
    // TODO: Add server-side validation to admin
    const ourPubKeyString = await UserUtil.getCurrentDevicePubKey();
    const ourPrimaryPubKey = ourPubKeyString
      ? await MultiDeviceProtocol.getPrimaryDevice(
      ourPubKeyString
    ) as PubKey : undefined;

    return ourPrimaryPubKey && this.admins.some(a => a.isEqual(ourPrimaryPubKey));
  }
}
