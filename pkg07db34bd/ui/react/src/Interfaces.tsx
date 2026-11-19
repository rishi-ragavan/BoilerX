/*
 * View types returned by ForumApi / AiPipeline / DmApi (mirrors pkg07db34bd/src/view/*.c3typ — owned by Lane A).
 * The UI never sees entity types.
 */

export type Role = 'STUDENT' | 'FACULTY' | 'ALUMNI';
export type Level = 'UG' | 'MS' | 'PHD' | 'FACULTY' | 'ALUMNI';
export type Badge = 'PROFESSOR' | 'TA' | 'CLUB_PRESIDENT' | 'CAMPUS_AMBASSADOR';
/** Only questions exist (articles were removed). */
export type PostType = 'QUESTION';
export type Visibility = 'PUBLIC' | 'EXPERTS_ONLY';
export type Space = 'STUDENT' | 'FACULTY' | 'ALUMNI';
/**
 * Feed tabs. The three spaces (`students`, `faculty` — alias `professors`, `alumni`) all work the same: each shows
 * every PUBLIC question the AI routed there, and every tab accepts the optional `dept` filter.
 */
export type FeedTab = 'foryou' | 'students' | 'faculty' | 'professors' | 'alumni';

export interface AuthorView {
  /** Name, or an anonymous handle: "Boiler a3f1" (no #), "Faculty · Finance", "Alum · Google". Never "verified". */
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
  /**
   * ONLY the viewer's own match (empty unless the viewer was tagged). The list of tagged experts is never sent:
   * with anonymous 🎯 replies it would reveal who wrote them. Show `expertCount` instead.
   */
  experts?: ExpertView[];
  /** Number of experts tagged — the only expert info safe to show everyone. */
  expertCount?: number;
  /** Shown as "View N comments" — there are no likes on the platform. */
  replyCount?: number;
  isMine?: boolean;
  viewerIsMatchedExpert?: boolean;
}

export interface ReplyView {
  id: string;
  body: string;
  createdAt?: string;
  author: AuthorView;
  /** Replies arrive grouped FACULTY → ALUMNI → STUDENT; render a section header when this changes. */
  authorGroup?: Role;
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
