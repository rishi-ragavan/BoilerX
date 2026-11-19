/*
 * AiPipeline.Llm — Lane B. Built-in LLM wrapper (see AiPipeline.Llm.c3typ).
 */

/** Named completion client configured in this environment (Bedrock-backed). */
var LLM_CLIENT_NAME = 'default-completions';
/** Faster Bedrock model swapped into that client's model for latency. */
var FAST_MODEL = 'global.anthropic.claude-haiku-4-5-20251001-v1:0';
var DEFAULT_TIMEOUT_MS = 8000;

function log() {
  return Logger.for('AiPipeline.Llm');
}

/** Returns an in-memory completion client (fast model when possible), or null when none is configured. */
function llmClient() {
  var base = GenaiCore.Llm.Completion.Client.forName(LLM_CLIENT_NAME);
  if (!base) return null;
  var model = base.model;
  if (model && typeof model.get === 'function' && typeof model.type !== 'function') model = model.get(0);
  if (model && FAST_MODEL && String(model.type().name()) === 'GenaiCore.Llm.Bedrock.Model') {
    model = model.withField('model', FAST_MODEL);
  }
  return GenaiCore.Llm.Completion.Client.make({ model: model, defaultOptions: base.defaultOptions });
}

/** Removes ``` fences and any prose around the outermost JSON object/array. */
function extractJson(text) {
  var s = String(text || '').trim();
  s = s.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```\s*$/, '').trim();
  var firstObj = s.indexOf('{');
  var firstArr = s.indexOf('[');
  var start = firstObj < 0 ? firstArr : firstArr < 0 ? firstObj : Math.min(firstObj, firstArr);
  if (start < 0) return null;
  var end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (end <= start) return null;
  return s.substring(start, end + 1);
}

function completeJson(systemPrompt, userPrompt, timeoutMs, maxTokens) {
  var limit = timeoutMs || DEFAULT_TIMEOUT_MS;
  var t0 = Date.now();
  try {
    var client = llmClient();
    if (!client) {
      log().warn('No LLM client named {} configured; using fallback.', LLM_CLIENT_NAME);
      return null;
    }
    var resp = client.completion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { returnJson: true, temperature: 0, max_tokens: maxTokens || 800, timeout: Math.ceil(limit / 1000) }
    );
    var elapsed = Date.now() - t0;
    log().info('LLM call took {} ms', elapsed);
    if (elapsed > limit) {
      log().warn('LLM call took {} ms (> {} ms); using fallback.', elapsed, limit);
      return null;
    }
    var content = resp && resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content;
    var json = extractJson(content);
    if (!json) {
      log().warn('LLM returned no JSON; using fallback.');
      return null;
    }
    JSON.parse(json); // throws (→ null) when the model returned malformed JSON
    return json;
  } catch (e) {
    log().warn('LLM call failed after {} ms: {}', Date.now() - t0, String((e && e.message) || e).substring(0, 300));
    return null;
  }
}
