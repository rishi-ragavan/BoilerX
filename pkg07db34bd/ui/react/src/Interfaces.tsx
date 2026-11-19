/*
 * View types returned by ForumApi / AiPipeline / DmApi (mirrors pkg07db34bd/src/view/*.c3typ — owned by Lane A).
 * The UI never sees entity types.
 */

export type Role = 'STUDENT' | 'FACULTY' | 'ALUMNI';
export type Level = 'UG' | 'MS' | 'PHD' | 'FACULTY' | 'ALUMNI';
export type Badge = 'PROFESSOR' | 'TA' | 'CLUB_PRESIDENT' | 'CAMPUS_AMBASSADOR';
export type PostType = 'QUESTION' | 'ARTICLE';
export type Visibility = 'PUBLIC' | 'EXPERTS_ONLY';
export type Space = 'STUDENT' | 'FACULTY' | 'ALUMNI';
export type FeedTab = 'foryou' | 'students' | 'faculty' | 'alumni' | 'articles';

export interface AuthorView {
  displayName: string;
  roleLabel?: string;
  badges?: string[];
  isAnonymous: boolean;
  flair?: string | null;
  /** null when anonymous */
  memberId?: string | null;
}

export interface ExpertView {
  memberId: string;
  name: string;
  roleLabel?: string;
  department?: string;
  reason?: string;
  score?: number;
  badges?: string[];
}

export interface PostView {
  id: string;
  postType: PostType;
  title: string;
  body?: string;
  visibility: Visibility;
  space?: Space;
  department?: string | null;
  tags?: string[];
  createdAt?: string;
  author: AuthorView;
  experts?: ExpertView[];
  likeCount?: number;
  replyCount?: number;
  likedByMe?: boolean;
  isMine?: boolean;
  viewerIsMatchedExpert?: boolean;
}

export interface ReplyView {
  id: string;
  body: string;
  createdAt?: string;
  author: AuthorView;
  likeCount?: number;
  likedByMe?: boolean;
  isMine?: boolean;
}

export interface PostDetailView {
  post: PostView;
  replies?: ReplyView[];
}

export interface MemberView {
  id: string;
  name: string;
  role: Role;
  level: Level;
  department?: string;
  employer?: string;
  bio?: string;
  tags?: string[];
  badges?: string[];
  reputation?: number;
  verified?: boolean;
  anonByDefault?: boolean;
  roleLabel?: string;
}

export interface ConversationView {
  id: string;
  otherParty: AuthorView;
  postTitle?: string;
  lastMessage?: string;
  createdAt?: string;
}

export interface MessageView {
  id: string;
  body: string;
  createdAt?: string;
  isMine?: boolean;
}

export interface ExpertSuggestion {
  memberId: string;
  score?: number;
  reason?: string;
}

export interface AnalyzeResult {
  safe: boolean;
  safetyReason?: string | null;
  space?: Space;
  department?: string | null;
  tags?: string[];
  experts?: ExpertSuggestion[];
}

export interface CreatePostResult {
  ok: boolean;
  error?: string | null;
  post?: PostView | null;
}

export interface NewPostInput {
  title: string;
  body?: string;
  postType?: PostType;
  visibility?: Visibility;
  isAnonymous?: boolean;
}

export interface LikeResult {
  liked: boolean;
  count: number;
}

export interface RefinedQuestion {
  title: string;
  body: string;
}

export interface EmailDraft {
  memberId: string;
  name: string;
  email: string;
  subject: string;
  body: string;
}
