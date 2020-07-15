import _ from 'lodash';
import { PrimaryPubKey, PubKey } from '../types';
import { MultiDeviceProtocol } from '../protocols';
import { ConversationModel } from '../../../js/models/conversations';

export async function getGroupMembers(
  groupId: PubKey
): Promise<Array<PrimaryPubKey>> {
  const groupConversation = window.ConversationController.get(groupId.key);
  const groupMembers = groupConversation
    ? groupConversation.attributes.members
    : undefined;

  if (!groupMembers) {
    return [];
  }

  const promises = (groupMembers as Array<string>).map(async (member: string) =>
    MultiDeviceProtocol.getPrimaryDevice(member)
  );
  const primaryDevices = await Promise.all(promises);

  return _.uniqWith(primaryDevices, (a, b) => a.isEqual(b));
}

export function isMediumGroup(groupId: PubKey): boolean {
  const conversation = window.ConversationController.get(groupId.key);

  if (!conversation) {
    return false;
  }

  return Boolean(conversation.isMediumGroup());
}

export async function getPublicServerConversations(): Promise<Array<ConversationModel>> {
  const { getConversations } = window;
  return getConversations().filter((convo: ConversationModel) => convo.isPublic() && !convo.isRss());
}
