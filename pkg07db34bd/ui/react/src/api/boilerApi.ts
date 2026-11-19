/*
 * Typed wrappers around the three BoilerConnect API types (contract owned by Lane A).
 * Every call passes the persona switcher's `actorId`. Never call entity types (ForumMember, Post, ...) from the UI.
 */
import { c3Call } from '@/c3Action';
import type {
  ConversationView,
  CreatePostResult,
  EmailDraft,
  FeedTab,
  LikeResult,
  MemberView,
  MessageView,
  NewPostInput,
  PostDetailView,
  PostView,
  RefinedQuestion,
  ReplyView,
} from '@/Interfaces';

/** C3 returns `null` (not `[]`) for empty arrays in some paths; normalize. */
const arr = <T,>(v: T[] | null | undefined): T[] => v ?? [];

export const ForumApi = {
  listMembers: async (): Promise<MemberView[]> => arr(await c3Call<MemberView[]>('ForumApi', 'listMembers', null, [])),
  getMember: (id: string) => c3Call<MemberView>('ForumApi', 'getMember', null, [id]),
  feed: async (actorId: string, tab: FeedTab, dept?: string | null): Promise<PostView[]> =>
    arr(await c3Call<PostView[]>('ForumApi', 'feed', null, [actorId, tab, dept ?? null])),
  inbox: async (actorId: string): Promise<PostView[]> => arr(await c3Call<PostView[]>('ForumApi', 'inbox', null, [actorId])),
  getPost: (actorId: string, postId: string) => c3Call<PostDetailView>('ForumApi', 'getPost', null, [actorId, postId]),
  createPost: (actorId: string, input: NewPostInput) =>
    c3Call<CreatePostResult>('ForumApi', 'createPost', null, [actorId, input]),
  reply: (actorId: string, postId: string, body: string, isAnonymous: boolean) =>
    c3Call<ReplyView>('ForumApi', 'reply', null, [actorId, postId, body, isAnonymous]),
  toggleLike: (actorId: string, postId: string | null, replyId: string | null) =>
    c3Call<LikeResult>('ForumApi', 'toggleLike', null, [actorId, postId, replyId]),
};

export const AiPipeline = {
  refineQuestion: (text: string) => c3Call<RefinedQuestion>('AiPipeline', 'refineQuestion', null, [text]),
  draftColdEmails: async (actorId: string, postId: string): Promise<EmailDraft[]> =>
    arr(await c3Call<EmailDraft[]>('AiPipeline', 'draftColdEmails', null, [actorId, postId])),
};

export const DmApi = {
  listConversations: async (actorId: string): Promise<ConversationView[]> =>
    arr(await c3Call<ConversationView[]>('DmApi', 'listConversations', null, [actorId])),
  getConversation: async (actorId: string, conversationId: string): Promise<MessageView[]> =>
    arr(await c3Call<MessageView[]>('DmApi', 'getConversation', null, [actorId, conversationId])),
  startConversation: (actorId: string, postId: string, body: string) =>
    c3Call<ConversationView>('DmApi', 'startConversation', null, [actorId, postId, body]),
  sendMessage: (actorId: string, conversationId: string, body: string) =>
    c3Call<MessageView>('DmApi', 'sendMessage', null, [actorId, conversationId, body]),
};
