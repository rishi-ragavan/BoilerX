/*
 * View types returned by ForumApi / AiPipeline / DmApi (mirrors pkg07db34bd/src/view/*.c3typ — owned by Lane A).
 * The UI never sees entity types.
 */

export type Role = 'STUDENT' | 'FACULTY' | 'ALUMNI';
/** Only questions exist (articles were removed). */
export type PostType = 'QUESTION';
export type Visibility = 'PUBLIC' | 'EXPERTS_ONLY';
/** Spaces. The role stays FACULTY, but faculty are labeled "Expert" and their space is EXPERTS. */
export type Space = 'STUDENT' | 'EXPERTS' | 'ALUMNI';
export const SPACE_LABELS: Record<Space, string> = { STUDENT: 'Student', EXPERTS: 'Experts', ALUMNI: 'Alumni' };
/** Reply group, in display order. */
export type ReplyGroup = 'EXPERTS' | 'ALUMNI' | 'STUDENT';
/**
 * Feed tabs. The three spaces (`students`, `experts` — aliases `faculty`/`professors`, `alumni`) all work the same: each shows
 * every PUBLIC question the AI routed there, and every tab accepts the optional `dept` filter.
 */
export type FeedTab = 'foryou' | 'students' | 'experts' | 'alumni';

export interface AuthorView {
  /** Real name only when posting under their name; else "Boiler a3f1" / "Purdue professor" / "Purdue alum". */
  displayName: string;
  /** "Expert" (professors), "Alumni" (alumni), or null (students). The only tags on the platform. */
  tag?: 'Expert' | 'Alumni' | null;
  /** Professors: "Finance · stock market, asset pricing"; alumni: "SWE" (+ " · Google" when named); students: null. */
  flair?: string | null;
  isAnonymous: boolean;
  /** null when anonymous */
  memberId?: string | null;
}

/** The viewer's own match ("why you were tagged"). Other tagged people are never sent. */
export interface ExpertView {
  memberId: string;
  name: string;
  tag?: 'Expert' | 'Alumni' | null;
  department?: string;
  reason?: string;
  score?: number;
}

export interface PostView {
  id: string;
  postType: PostType;
  title: string;
  body?: string;
  visibility: Visibility;
  space?: Space;
  department?: string | null;
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
  /** Replies arrive grouped EXPERTS → ALUMNI → STUDENT; render a section header when this changes. */
  authorGroup?: ReplyGroup;
  isMine?: boolean;
}

export interface PostDetailView {
  post: PostView;
  replies?: ReplyView[];
}

/** Members are only professors (role FACULTY, tag "Expert"), alumni ("Alumni"), or students (no tag). */
export interface MemberView {
  id: string;
  name: string;
  role: Role;
  department?: string;
  employer?: string;
  bio?: string;
  /** Research interests (professors) or career role (alumni). Always empty for students. */
  tags?: string[];
  anonByDefault?: boolean;
  tag?: 'Expert' | 'Alumni' | null;
  flair?: string | null;
  /** "Expert · Finance", "Alumni · Google", "Student". */
  roleLabel?: string;
}

/** Only professors and alumni are tagged on questions, so only they have "Questions for you". */
export const canBeTagged = (m: Pick<MemberView, 'role'> | null | undefined): boolean =>
  m?.role === 'FACULTY' || m?.role === 'ALUMNI';

export interface ConversationView {
  id: string;
  otherParty: AuthorView;
  postTitle?: string;
  lastMessage?: string;
  createdAt?: string;
  /** True once the professor ended it: read-only, no more messages. */
  ended?: boolean;
  endedAt?: string | null;
  /** True for the professor who started it while it is still open. */
  canEnd?: boolean;
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
