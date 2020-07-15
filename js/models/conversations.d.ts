interface ConversationAttributes {
  avatar?: string;
  avatarPointer?: string;
  members?: Array<string>;
  groupAdmins?: Array<string>;
  type: 'private' | 'group';
  left: boolean;
  expireTimer: number;
  profileSharing: boolean;
  isMediumGroup: boolean;
  secondaryStatus: boolean;
  mentionedUs: boolean;
  unreadCount: number;
  isArchived: boolean;
  active_at: number;
  timestamp: number; // timestamp of what?
}

export interface ConversationModel
  extends Backbone.Model<ConversationAttributes> {
  idForLogging: () => string;
  saveChangesToDB: () => Promise<void>;
  notify: (message: MessageModel) => void;
  isSessionResetReceived: () => boolean;
  updateExpirationTimer: (
    expireTimer: number | null,
    source: string,
    receivedAt: number,
    options: object
  ) => void;
  isPrivate: () => boolean;
  isPublic: () => boolean;
  isRss: () => boolean;
  setProfileKey: (key: string) => void;
  setLokiProfile: (data: {displayName: string; avatar: string}) => Promise<void>;
  isMe: () => boolean;
  getRecipients: () => Array<string>;
  onReadMessage: (message: MessageModel) => void;
  updateTextInputState: () => void;

  lastMessage: string;
}
