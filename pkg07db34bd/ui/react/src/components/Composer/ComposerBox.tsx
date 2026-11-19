/*
 * Composer (Lane C owns Composer*), styled like X's "What's happening?" box at the top of Home.
 *  - Collapsed: one line, "Ask Purdue anything…". On focus: bold title + auto-growing details textarea.
 *  - Icon row: anonymity (locked on for students), ✨ Refine, and the gold "Post" pill (disabled
 *    until the title has text). Visibility menu sits above the icon row.
 *    Lead rules: questions only (no articles). Students and alumni ask; faculty ("Experts") answer and get no composer.
 *    No "verified" wording; tagged experts are never named (toast shows the count only).
 *  - Submit -> ForumApi.createPost (runs the AI pipeline). ok:false -> inline danger box, text kept.
 *    Success -> clear + collapse, onPosted(post), gold toast "Tagged N experts"; Cold-email opens the drafts modal.
 *  - Cmd/Ctrl+Enter submits.
 */
import { useCallback, useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react';
import { LoaderCircle, VenetianMask } from 'lucide-react';
import { AiPipeline, ForumApi } from '@/api/boilerApi';
import type { MemberView, PostView } from '@/Interfaces';
import { usePersona } from '@/components/Persona/PersonaContext';
import { ShellAvatar } from '@/components/Shell/ShellAvatar';
import { useShell } from '@/components/Shell/ShellContext';
import { ShellErrorBox } from '@/components/Shell/ShellStatus';
import { ComposerVisibilityMenu, type ComposerVisibility } from '@/components/Composer/ComposerVisibility';
// Swap for Lane D's EmailDraftsModal after Merge 1 (same props: postId, actorId, onClose).
import { ComposerEmailDraftsPlaceholder as EmailDraftsModal } from '@/components/Composer/ComposerEmailDraftsPlaceholder';
import './ComposerStyles.css';

const TITLE_MAX = 200;
const BODY_MAX = 5000;
const STUDENT_ANON_REASON = 'Students are always anonymous';

function postingAsLabel(member: MemberView | null, anonymous: boolean): string {
  if (!member) return '';
  if (!anonymous) return member.name;
  if (member.role === 'FACULTY') return 'Purdue professor (Expert)';
  if (member.role === 'ALUMNI') return 'Purdue alum (Alumni)';
  return 'Boiler ····';
}

function successToast(post: PostView, coldEmail: boolean): string {
  // Student-space questions are peer-to-peer: nobody is tagged there.
  if (post.space === 'STUDENT') return 'Posted to the Student space';
  const n = post.expertCount ?? 0;
  const prefix = post.visibility === 'EXPERTS_ONLY' ? 'Shared privately · ' : 'Posted · ';
  if (!n) return `${prefix}no experts matched yet`;
  return `${prefix}Tagged ${n} ${n === 1 ? 'expert' : 'experts'}${coldEmail ? ' · drafting emails' : ''}`;
}

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

export function ComposerBox({ onPosted }: { onPosted: (post: PostView) => void }) {
  const { actingMember, actingMemberId } = usePersona();
  const { toast, composePending, consumeCompose, notifyPostCreated } = useShell();

  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [anonChoice, setAnonChoice] = useState(true);
  const [visibility, setVisibility] = useState<ComposerVisibility>('PUBLIC');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [undo, setUndo] = useState<{ title: string; body: string } | null>(null);
  const [emailPostId, setEmailPostId] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const role = actingMember?.role;
  const isStudent = role === 'STUDENT';
  const canAsk = role !== 'FACULTY';
  const anonymous = isStudent ? true : anonChoice;
  const busy = submitting || refining;
  const canSubmit = !!title.trim() && !busy && !!actingMember;

  // Persona switch: reset role-dependent controls to that member's defaults.
  const memberId = actingMember?.id;
  const anonByDefault = actingMember?.anonByDefault;
  useEffect(() => {
    setAnonChoice(role === 'STUDENT' ? true : anonByDefault !== false);
    setError(null);
  }, [memberId, role, anonByDefault]);

  // "Ask" button anywhere in the shell -> expand, scroll to, and focus the composer.
  useEffect(() => {
    if (!composePending) return;
    setExpanded(true);
    window.scrollTo({ top: 0 });
    titleRef.current?.focus();
    consumeCompose();
  }, [composePending, consumeCompose]);

  useEffect(() => autoGrow(titleRef.current), [title, expanded]);
  useEffect(() => autoGrow(bodyRef.current), [body, expanded]);

  const reset = () => {
    setTitle('');
    setBody('');
    setVisibility('PUBLIC');
    setUndo(null);
    setError(null);
    setExpanded(false);
  };

  const submit = async () => {
    if (!canSubmit || !actingMember) return;
    setSubmitting(true);
    setError(null);
    const coldEmail = visibility === 'COLD_EMAIL';
    try {
      const res = await ForumApi.createPost(actingMemberId, {
        title: title.trim(),
        body: body.trim(),
        postType: 'QUESTION',
        visibility: visibility === 'PUBLIC' ? 'PUBLIC' : 'EXPERTS_ONLY',
        isAnonymous: anonymous,
      });
      if (!res || !res.ok || !res.post) {
        setError(res?.error || 'The safety check did not approve this post.');
        return;
      }
      const post = res.post;
      reset();
      titleRef.current?.blur();
      onPosted(post);
      notifyPostCreated();
      toast(successToast(post, coldEmail));
      if (coldEmail) setEmailPostId(post.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const refine = async () => {
    if (busy || !(title.trim() || body.trim())) return;
    setRefining(true);
    try {
      const res = await AiPipeline.refineQuestion(`${title}\n${body}`.trim());
      setUndo({ title, body });
      setTitle((res?.title ?? title).slice(0, TITLE_MAX));
      setBody((res?.body ?? body).slice(0, BODY_MAX));
      setError(null);
    } catch (err) {
      toast(`Couldn't refine: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRefining(false);
    }
  };

  const undoRefine = () => {
    if (!undo) return;
    setTitle(undo.title);
    setBody(undo.body);
    setUndo(null);
    titleRef.current?.focus();
  };

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit();
    } else if (e.key === 'Enter' && e.currentTarget === titleRef.current) {
      // Enter in the title moves to the details box instead of submitting.
      e.preventDefault();
      bodyRef.current?.focus();
    }
  };

  // Collapse when focus leaves an empty composer.
  const onBlur = (e: FocusEvent<HTMLFormElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    if (!title && !body && !submitting) setExpanded(false);
  };

  const editTitle = (v: string) => {
    setTitle(v.slice(0, TITLE_MAX));
    if (error) setError(null);
  };
  const editBody = (v: string) => {
    setBody(v.slice(0, BODY_MAX));
    if (error) setError(null);
  };

  const explain = useCallback((reason: string) => toast(reason), [toast]);
  const closeEmail = useCallback(() => setEmailPostId(null), []);

  // Experts (faculty) answer questions; they never post them.
  if (actingMember && !canAsk) {
    return (
      <div className="bc-composer">
        <ShellAvatar name={actingMember.name} anonymous={false} />
        <div className="bc-composer__main">
          <p className="bc-composer__as">Experts answer questions; students and alumni ask them.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="bc-composer__error">
          <ShellErrorBox title="This post wasn't published" message={error} />
        </div>
      )}

      <form
        ref={formRef}
        className={`bc-composer ${expanded ? 'bc-composer--expanded' : ''}`}
        onSubmit={onFormSubmit}
        onBlur={onBlur}
        aria-label="Ask a question"
        aria-busy={submitting}
      >
        <ShellAvatar name={actingMember?.name} anonymous={anonymous} />

        <div className="bc-composer__main">
          <label htmlFor="bc-composer-title" className="bc-visually-hidden">
            Question title
          </label>
          <textarea
            id="bc-composer-title"
            ref={titleRef}
            rows={1}
            className="bc-composer__title"
            placeholder={
              expanded ? 'Title' : 'Ask Purdue anything…'
            }
            value={title}
            maxLength={TITLE_MAX}
            readOnly={busy}
            autoComplete="off"
            onFocus={() => setExpanded(true)}
            onChange={(e) => editTitle(e.target.value.replace(/\n/g, ' '))}
            onKeyDown={onKeyDown}
          />

          {expanded && (
            <>
              <label htmlFor="bc-composer-body" className="bc-visually-hidden">
                Details
              </label>
              <textarea
                id="bc-composer-body"
                ref={bodyRef}
                className="bc-composer__body"
                placeholder="Add details…"
                value={body}
                rows={2}
                maxLength={BODY_MAX}
                readOnly={busy}
                onChange={(e) => editBody(e.target.value)}
                onKeyDown={onKeyDown}
              />

              <p className="bc-composer__as">
                Posting as <strong>{postingAsLabel(actingMember, anonymous)}</strong>
                {isStudent && ' · a new anonymous handle for each thread'}
              </p>

              {undo && (
                <p className="bc-composer__refined">
                  Refined with AI ·{' '}
                  <button type="button" className="bc-link" onClick={undoRefine} disabled={busy}>
                    Undo
                  </button>
                </p>
              )}

              {submitting && (
                <p className="bc-composer__working" role="status">
                  Finding the right experts…
                </p>
              )}

              <div className="bc-composer__visibility">
                <ComposerVisibilityMenu
                  value={visibility}
                  onChange={setVisibility}
                  lockedReason={null}
                  onLocked={explain}
                  disabled={busy}
                />
                {visibility === 'COLD_EMAIL' && (
                  <span className="bc-composer__warn">Emails reveal your name</span>
                )}
              </div>

              <div className="bc-composer__toolbar">
                <div className="bc-composer__tools">
                  <button
                    type="button"
                    className={`bc-tool ${anonymous ? 'bc-tool--on' : ''}`}
                    aria-pressed={anonymous}
                    aria-disabled={isStudent ? true : undefined}
                    aria-label={isStudent ? `Anonymous (locked): ${STUDENT_ANON_REASON}` : 'Post anonymously'}
                    title={isStudent ? STUDENT_ANON_REASON : anonymous ? 'Anonymous: click to post with your name' : 'Post anonymously'}
                    disabled={busy}
                    onClick={() => (isStudent ? explain(STUDENT_ANON_REASON) : setAnonChoice((a) => !a))}
                  >
                    <VenetianMask size={20} aria-hidden />
                  </button>

                  {(
                    <button
                      type="button"
                      className="bc-tool bc-tool--text"
                      onClick={refine}
                      disabled={busy || !(title.trim() || body.trim())}
                      title="Rewrite your question so experts can answer it"
                    >
                      {refining ? <LoaderCircle size={16} className="bc-spin" aria-hidden /> : <span aria-hidden>✨</span>}
                      Refine
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="bc-btn bc-btn--gold bc-composer__post"
                  disabled={!canSubmit}
                  title="Post (Ctrl/Cmd+Enter)"
                >
                  {submitting && <LoaderCircle size={16} className="bc-spin" aria-hidden />}
                  Post
                </button>
              </div>
            </>
          )}
        </div>
      </form>

      {emailPostId && <EmailDraftsModal postId={emailPostId} actorId={actingMemberId} onClose={closeEmail} />}
    </>
  );
}
