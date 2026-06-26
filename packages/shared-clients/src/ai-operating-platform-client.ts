import { createHash, createHmac } from 'crypto';
import { BaseClient, AuthProbeResult } from './base-client';

/**
 * Client for the real AI platform behind EASYDEV_AI_URL - the Python/
 * FastAPI "Multi-Tenant AI Operating Platform" (a separate repo,
 * multi-tennet-ai-agent - not to be confused with "ai automation
 * communication", a completely different product). Every claim in this
 * file is verified directly against that repo's source, not assumed:
 *
 * - Auth: app/middleware/request_signing.py is a global ASGI middleware -
 *   every request (except /health*, /metrics, /docs) needs
 *   X-Signature / X-Signature-Timestamp / X-Signature-Key-Version,
 *   computed per app/security/signing.py as
 *   `v1=${base64url(HMAC-SHA256(secret, "METHOD\npath\ntimestamp\nsha256hex(body)"))}`.
 * - Body envelope: every /v1/{capability} route requires
 *   {tenant_id, workflow, task, payload, context} with extra="forbid" -
 *   unrecognized top-level fields get a 422, not silently dropped.
 * - Interaction model: every /v1/{capability} and /v1/workflows/run call
 *   returns 202 + {job_id, workflow_id, status:"QUEUED"} immediately: the
 *   actual output only appears via polling GET /v1/workflows/{id} until
 *   status reaches SUCCESS/FAILED/DEAD (app/workflows/models.py's state
 *   machine). There is no synchronous mode.
 * - workflow name per capability (app/workflows/plugins/core_ai.py):
 *   generate->generation_workflow, classify->classification_workflow,
 *   extract->extraction_workflow, embed->embedding_workflow,
 *   rerank->reranking_workflow, summarize->summarization_workflow.
 * - result shape per capability (app/prompts/core_ai/*.yaml output_schema):
 *   generation: {content, word_count, metadata} - no confidence/tokens/cost
 *   fields exist anywhere in this API, unlike what callers previously
 *   assumed.
 * - Memory (app/api/routes/memory.py) is a separate, synchronous (no
 *   polling) set of routes under /v1/memory/*.
 */

type WorkflowTerminalStatus = 'SUCCESS' | 'FAILED' | 'DEAD';
type WorkflowStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_TOOL'
  | 'WAITING_APPROVAL'
  | WorkflowTerminalStatus;

interface QueuedWorkflowResponse {
  success: boolean;
  job_id: string;
  workflow_id: string;
  trace_id: string;
  status: WorkflowStatus;
  workflow: string;
}

interface WorkflowStatusResponse {
  success: boolean;
  workflow_id: string;
  job_id: string;
  trace_id: string;
  status: WorkflowStatus;
  workflow: string;
  result: Record<string, any> | null;
  error: Record<string, any> | string | null;
}

export interface AiWorkflowResult {
  status: WorkflowStatus;
  workflowId: string;
  result: Record<string, any> | null;
  error: Record<string, any> | string | null;
}

export interface GenerationResult {
  content: string;
  word_count: number;
  metadata?: Record<string, any>;
}

export interface ClassificationResult {
  labels: Array<{ label: string; confidence: number }>;
  classification_mode: string;
  rationale: string;
}

export interface ExtractionResult {
  extracted: Record<string, any>;
  missing_required: string[];
  confidence: number;
}

export interface EmbeddingResult {
  chunks: Array<{ index: number; text: string; embedding?: number[] }>;
  namespace: string;
  total_chunks: number;
}

export interface RerankResult {
  ranked: Array<{ index: number; score: number }>;
  top_k: number;
}

export interface SummarizationResult {
  summary: string;
  key_takeaways: string[];
  depth: 'brief' | 'standard' | 'detailed';
  contradictions?: string[];
}

export interface MemoryEntry {
  content: string;
  [key: string]: any;
}

export class AiOperatingPlatformClient extends BaseClient {
  private readonly signingSecret?: string;
  private readonly signingKeyVersion: string;
  // How long to poll before giving up - the workflow keeps running on the
  // platform side regardless; this only bounds how long THIS call waits.
  private readonly pollTimeoutMs: number;
  private readonly pollIntervalMs = 1000;

  constructor(
    baseURL: string,
    signingSecret?: string,
    signingKeyVersion = 'v1',
    pollTimeoutMs = 30000,
  ) {
    super(baseURL, 'AiOperatingPlatformClient', 10000);
    this.signingSecret = signingSecret;
    this.signingKeyVersion = signingKeyVersion;
    this.pollTimeoutMs = pollTimeoutMs;
  }

  /**
   * The server re-derives the expected signature by parsing
   * X-Signature-Timestamp back into a Python datetime and calling
   * `.isoformat()` on it again (signing.py's verify() passes the *parsed*
   * timestamp into sign(), not the raw header string) - so the timestamp
   * embedded in the canonical payload must already be in Python's
   * isoformat shape (`+00:00`, not `Z`; microseconds omitted only when
   * exactly zero) or the round-trip changes the string and every
   * signature fails to verify even with the correct secret. JS's
   * `Date.toISOString()` (`Z` suffix, fixed 3-digit milliseconds) does not
   * match that shape, so it's built by hand here instead.
   * Concretely cross-checked against the real signing.py (not just
   * reasoned through): generated a signature with this exact function,
   * fed it to RequestSigner.verify() from that repo directly, confirmed
   * it verifies.
   */
  private pythonIsoformatUtcNow(): string {
    const now = new Date();
    const pad = (n: number, w: number) => String(n).padStart(w, '0');
    const datePart = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1, 2)}-${pad(now.getUTCDate(), 2)}`;
    const timePart = `${pad(now.getUTCHours(), 2)}:${pad(now.getUTCMinutes(), 2)}:${pad(now.getUTCSeconds(), 2)}`;
    const micros = now.getUTCMilliseconds() * 1000;
    const fractional = micros > 0 ? `.${String(micros).padStart(6, '0')}` : '';
    return `${datePart}T${timePart}${fractional}+00:00`;
  }

  /**
   * Signs per app/security/signing.py exactly - canonical payload is
   * `${METHOD}\n${path}\n${pythonIsoformatTimestamp}\n${sha256hex(body)}`,
   * HMAC-SHA256, base64url (no padding). The signature string is always
   * literally prefixed `v1=` (a fixed signature-FORMAT marker - confirmed
   * directly in signing.py's sign(), `f"v1={_encode(digest)}"` does not
   * interpolate key_version) - the actual key version travels separately
   * in X-Signature-Key-Version, used server-side only to pick which
   * secret to verify against.
   * `path` must be the exact request path the server sees (no query
   * string), matching what request_signing.py reads from `scope["path"]`.
   * Returns {} (no signature headers) when no secret is configured -
   * matches this platform's own AI_PLATFORM_REQUEST_SIGNING_ENABLED=false
   * default, so calls still go through against a deployment with signing
   * disabled rather than sending a garbage signature.
   */
  private signHeaders(
    method: string,
    path: string,
    body: unknown,
  ): Record<string, string> {
    if (!this.signingSecret) return {};
    const bodyStr = body === undefined ? '' : JSON.stringify(body);
    const sha256hex = createHash('sha256').update(bodyStr).digest('hex');
    const timestamp = this.pythonIsoformatUtcNow();
    const canonical = [method.toUpperCase(), path, timestamp, sha256hex].join(
      '\n',
    );
    const signature = createHmac('sha256', this.signingSecret)
      .update(canonical)
      .digest('base64url');
    return {
      'x-signature': `v1=${signature}`,
      'x-signature-timestamp': timestamp,
      'x-signature-key-version': this.signingKeyVersion,
    };
  }

  private async post<T>(
    path: string,
    body: unknown,
    tenantId: string,
  ): Promise<T> {
    const response = await this.request<T>({
      method: 'POST',
      url: path,
      data: body,
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': tenantId,
        ...this.signHeaders('POST', path, body),
      },
    });
    return response.data;
  }

  private async getStatus(
    workflowId: string,
    tenantId: string,
  ): Promise<WorkflowStatusResponse> {
    const path = `/v1/workflows/${encodeURIComponent(workflowId)}`;
    const response = await this.request<WorkflowStatusResponse>({
      method: 'GET',
      url: path,
      params: { tenant_id: tenantId },
      headers: {
        'x-tenant-id': tenantId,
        ...this.signHeaders('GET', path, undefined),
      },
    });
    return response.data;
  }

  /**
   * Enqueues a workflow and polls until it reaches a terminal status
   * (SUCCESS/FAILED/DEAD) or this call's timeout budget runs out - the
   * platform never returns a result synchronously (verified - see class
   * docstring). Returns whatever status was last observed if the timeout
   * is hit; the workflow itself keeps running server-side regardless.
   */
  private async enqueueAndAwait(
    path: string,
    body: unknown,
    tenantId: string,
  ): Promise<AiWorkflowResult> {
    const queued = await this.post<QueuedWorkflowResponse>(
      path,
      body,
      tenantId,
    );
    const deadline = Date.now() + this.pollTimeoutMs;
    let last: WorkflowStatusResponse = {
      success: queued.success,
      workflow_id: queued.workflow_id,
      job_id: queued.job_id,
      trace_id: queued.trace_id,
      status: queued.status,
      workflow: queued.workflow,
      result: null,
      error: null,
    };
    while (Date.now() < deadline) {
      if (
        last.status === 'SUCCESS' ||
        last.status === 'FAILED' ||
        last.status === 'DEAD'
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      last = await this.getStatus(queued.workflow_id, tenantId);
    }
    return {
      status: last.status,
      workflowId: last.workflow_id,
      result: last.result,
      error: last.error,
    };
  }

  private async runCoreAiCapability<T>(
    path: string,
    workflow: string,
    task: string,
    tenantId: string,
    payload: Record<string, any>,
    context: Record<string, any> = {},
  ): Promise<T> {
    const outcome = await this.enqueueAndAwait(
      path,
      { tenant_id: tenantId, workflow, task, payload, context },
      tenantId,
    );
    if (outcome.status !== 'SUCCESS' || !outcome.result) {
      throw new Error(
        `AI platform ${task} did not complete successfully (status=${outcome.status}): ${
          typeof outcome.error === 'string'
            ? outcome.error
            : JSON.stringify(outcome.error)
        }`,
      );
    }
    return outcome.result as T;
  }

  async generate(
    tenantId: string,
    prompt: string,
    systemPrompt?: string,
    config: Record<string, any> = {},
  ): Promise<GenerationResult> {
    return this.runCoreAiCapability<GenerationResult>(
      '/v1/generate',
      'generation_workflow',
      'generate',
      tenantId,
      { prompt, system_prompt: systemPrompt, ...config },
    );
  }

  async classify(
    tenantId: string,
    text: string,
    classes: string[],
  ): Promise<ClassificationResult> {
    return this.runCoreAiCapability<ClassificationResult>(
      '/v1/classify',
      'classification_workflow',
      'classify',
      tenantId,
      { text, classes },
    );
  }

  async extract(
    tenantId: string,
    text: string,
    fields?: string[],
  ): Promise<ExtractionResult> {
    return this.runCoreAiCapability<ExtractionResult>(
      '/v1/extract',
      'extraction_workflow',
      'extract',
      tenantId,
      { text, fields },
    );
  }

  async embed(tenantId: string, texts: string[]): Promise<EmbeddingResult> {
    return this.runCoreAiCapability<EmbeddingResult>(
      '/v1/embed',
      'embedding_workflow',
      'embed',
      tenantId,
      { texts },
    );
  }

  async rerank(
    tenantId: string,
    query: string,
    documents: string[],
    topK = 5,
  ): Promise<RerankResult> {
    return this.runCoreAiCapability<RerankResult>(
      '/v1/rerank',
      'reranking_workflow',
      'rerank',
      tenantId,
      { query, documents, top_k: topK },
    );
  }

  async summarize(
    tenantId: string,
    text: string,
    depth: 'brief' | 'standard' | 'detailed' = 'standard',
  ): Promise<SummarizationResult> {
    return this.runCoreAiCapability<SummarizationResult>(
      '/v1/summarize',
      'summarization_workflow',
      'summarize',
      tenantId,
      { text, depth },
    );
  }

  /** Generic path for tenant-defined/custom workflows (not a fixed core_ai
   * capability) - same enqueue+poll mechanics. */
  async runWorkflow(
    tenantId: string,
    workflowName: string,
    taskName: string,
    payload: Record<string, any> = {},
    context: Record<string, any> = {},
  ): Promise<AiWorkflowResult> {
    return this.enqueueAndAwait(
      '/v1/workflows/run',
      {
        tenant_id: tenantId,
        workflow: workflowName,
        task: taskName,
        payload,
        context,
      },
      tenantId,
    );
  }

  /**
   * Verified against app/api/routes/commands.py's provide_tool_result -
   * body is exactly {tenant_id, tool_name, result}, no separate
   * "toolRequestId"/"status" fields exist on the wire. Submitting a result
   * resumes the workflow (WAITING_TOOL -> RUNNING), so this polls onward
   * to a new terminal state the same way the original enqueue does.
   */
  async submitToolResult(
    tenantId: string,
    workflowId: string,
    toolName: string,
    result: Record<string, any>,
  ): Promise<AiWorkflowResult> {
    const path = `/v1/workflows/${encodeURIComponent(workflowId)}/tool-results`;
    const submitted = await this.post<WorkflowStatusResponse>(
      path,
      { tenant_id: tenantId, tool_name: toolName, result },
      tenantId,
    );
    if (
      submitted.status === 'SUCCESS' ||
      submitted.status === 'FAILED' ||
      submitted.status === 'DEAD'
    ) {
      return {
        status: submitted.status,
        workflowId: submitted.workflow_id,
        result: submitted.result,
        error: submitted.error,
      };
    }
    const deadline = Date.now() + this.pollTimeoutMs;
    let last = submitted;
    while (Date.now() < deadline) {
      if (
        last.status === 'SUCCESS' ||
        last.status === 'FAILED' ||
        last.status === 'DEAD'
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      last = await this.getStatus(workflowId, tenantId);
    }
    return {
      status: last.status,
      workflowId: last.workflow_id,
      result: last.result,
      error: last.error,
    };
  }

  // ---- Memory (app/api/routes/memory.py) - synchronous, no polling ----

  async storeConversationMemory(
    tenantId: string,
    sessionId: string,
    role: 'user' | 'assistant' | 'system' | 'tool' | 'summary',
    content: string,
    principalId?: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    await this.post(
      '/v1/memory/conversation',
      {
        tenant_id: tenantId,
        session_id: sessionId,
        role,
        content,
        principal_id: principalId,
        metadata,
      },
      tenantId,
    );
  }

  async recallMemory(
    tenantId: string,
    query: string,
    sessionId?: string,
  ): Promise<{ count: number; memories: MemoryEntry[] }> {
    const data = await this.post<{ count: number; memories: MemoryEntry[] }>(
      '/v1/memory/recall',
      { tenant_id: tenantId, query, session_id: sessionId },
      tenantId,
    );
    return { count: data.count, memories: data.memories };
  }

  async getConversationHistory(
    tenantId: string,
    sessionId: string,
  ): Promise<{
    count: number;
    messages: Array<{ role: string; content: string }>;
  }> {
    const path = `/v1/memory/conversation/${encodeURIComponent(sessionId)}`;
    const response = await this.request<{
      count: number;
      messages: Array<{ role: string; content: string }>;
    }>({
      method: 'GET',
      url: path,
      params: { tenant_id: tenantId },
      headers: {
        'x-tenant-id': tenantId,
        ...this.signHeaders('GET', path, undefined),
      },
    });
    return { count: response.data.count, messages: response.data.messages };
  }

  /**
   * KNOWN GAP: no dedicated "interpret connector result" or "draft email"
   * endpoint exists on this platform - verified against every route file,
   * not just commands.py. Both are mapped onto the generic generation_workflow
   * with a descriptive task, the closest honest fit ("Open-ended and
   * constrained text generation" per generation_workflow's own
   * description) rather than guessing at a nonexistent dedicated route.
   */
  async interpretConnectorResult(
    tenantId: string,
    connectorType: string,
    resultData: any,
    context: Record<string, any> = {},
  ): Promise<GenerationResult> {
    return this.runCoreAiCapability<GenerationResult>(
      '/v1/generate',
      'generation_workflow',
      'interpret_connector_result',
      tenantId,
      { connector_type: connectorType, result_data: resultData },
      context,
    );
  }

  async generateEmailDraft(
    tenantId: string,
    context: Array<{ role: string; content: string }>,
    lastCustomerMessage: string,
  ): Promise<GenerationResult> {
    return this.runCoreAiCapability<GenerationResult>(
      '/v1/generate',
      'generation_workflow',
      'draft_email_reply',
      tenantId,
      {
        conversation_context: context,
        last_customer_message: lastCustomerMessage,
      },
    );
  }

  /** /health/live is explicitly exempted from request signing - a plain
   * unauthenticated reachability probe. */
  async checkAuth(): Promise<AuthProbeResult> {
    // No safe, side-effect-free authenticated route exists to probe here
    // (every /v1/* route enqueues a real workflow) - this intentionally
    // only proves reachability, not credential validity. See
    // HealthService.checkAiPlatform's comment for the same caveat.
    return this.probeAuth({ method: 'GET', url: '/health/live' });
  }
}
