import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { AIPlatformClient } from '../services/ai-platform.client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AIPlatformClient', () => {
  let client: AIPlatformClient;
  const tenantId = 'tenant-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AIPlatformClient],
    }).compile();

    client = module.get<AIPlatformClient>(AIPlatformClient);
    jest.clearAllMocks();
  });

  it('should runWorkflow successfully', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { success: true, tokensUsed: 10 },
    });
    const res = await client.runWorkflow(tenantId, 'wf-id', 'conv-id', {
      var: 1,
    });
    expect(res.success).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/workflows/run'),
      expect.objectContaining({
        tenantId,
        workflowId: 'wf-id',
        conversationId: 'conv-id',
        variables: { var: 1 },
      }),
      expect.any(Object),
    );
  });

  it('should throw error when runWorkflow fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network error'));
    await expect(
      client.runWorkflow(tenantId, 'wf-id', 'conv-id'),
    ).rejects.toThrow('AI Platform workflow failed: Network error');
  });

  it('should generate text successfully', async () => {
    mockedAxios.post.mockResolvedValue({ data: { text: 'Hello' } });
    const res = await client.generate(tenantId, 'prompt', 'system-prompt', {
      temp: 0.7,
    });
    expect(res.text).toBe('Hello');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/generate'),
      expect.objectContaining({
        tenantId,
        prompt: 'prompt',
        systemPrompt: 'system-prompt',
        config: { temp: 0.7 },
      }),
      expect.any(Object),
    );
  });

  it('should throw error when generate fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Generate failed'));
    await expect(client.generate(tenantId, 'prompt')).rejects.toThrow(
      'AI Platform generate failed: Generate failed',
    );
  });

  it('should classify text successfully', async () => {
    mockedAxios.post.mockResolvedValue({ data: { class: 'support' } });
    const res = await client.classify(tenantId, 'text', ['support', 'sales']);
    expect(res.class).toBe('support');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/classify'),
      expect.objectContaining({
        tenantId,
        text: 'text',
        classes: ['support', 'sales'],
      }),
      expect.any(Object),
    );
  });

  it('should throw error when classify fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Classify failed'));
    await expect(client.classify(tenantId, 'text', [])).rejects.toThrow(
      'AI Platform classify failed: Classify failed',
    );
  });

  it('should embed texts successfully', async () => {
    mockedAxios.post.mockResolvedValue({ data: { embeddings: [[0.1, 0.2]] } });
    const res = await client.embed(tenantId, ['text']);
    expect(res.embeddings).toBeDefined();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/embed'),
      expect.objectContaining({ tenantId, texts: ['text'] }),
      expect.any(Object),
    );
  });

  it('should throw error when embed fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Embed failed'));
    await expect(client.embed(tenantId, ['text'])).rejects.toThrow(
      'AI Platform embed failed: Embed failed',
    );
  });

  it('should rerank documents successfully', async () => {
    mockedAxios.post.mockResolvedValue({ data: { results: [] } });
    const res = await client.rerank(tenantId, 'query', ['doc1'], 3);
    expect(res.results).toBeDefined();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/rerank'),
      expect.objectContaining({
        tenantId,
        query: 'query',
        documents: ['doc1'],
        topK: 3,
      }),
      expect.any(Object),
    );
  });

  it('should throw error when rerank fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Rerank failed'));
    await expect(client.rerank(tenantId, 'query', [])).rejects.toThrow(
      'AI Platform rerank failed: Rerank failed',
    );
  });

  it('should recall memory successfully', async () => {
    mockedAxios.post.mockResolvedValue({ data: { recalled: [] } });
    const res = await client.recallMemory(tenantId, 'query', 'key');
    expect(res.recalled).toBeDefined();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/memory/recall'),
      expect.objectContaining({ tenantId, query: 'query', key: 'key' }),
      expect.any(Object),
    );
  });

  it('should throw error when recallMemory fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Recall failed'));
    await expect(client.recallMemory(tenantId, 'query')).rejects.toThrow(
      'AI Platform recall failed: Recall failed',
    );
  });

  it('should get conversation context successfully', async () => {
    mockedAxios.post.mockResolvedValue({ data: { history: [] } });
    const res = await client.getConversationContext(tenantId, 'conv-123');
    expect(res.history).toBeDefined();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/memory/conversation'),
      expect.objectContaining({ tenantId, conversationId: 'conv-123' }),
      expect.any(Object),
    );
  });

  it('should throw error when getConversationContext fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Context failed'));
    await expect(
      client.getConversationContext(tenantId, 'conv-123'),
    ).rejects.toThrow('AI Platform conversation memory failed: Context failed');
  });

  it('should submitToolResult successfully', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });
    const res = await client.submitToolResult(
      tenantId,
      'wf-123',
      'req-123',
      { output: 'ok' },
      'SUCCESS',
    );
    expect(res.success).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/workflows/wf-123/tool-results'),
      expect.objectContaining({
        tenantId,
        toolRequestId: 'req-123',
        response: { output: 'ok' },
        status: 'SUCCESS',
      }),
      expect.any(Object),
    );
  });

  it('should throw error when submitToolResult fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Submit tool result failed'));
    await expect(
      client.submitToolResult(tenantId, 'wf-123', 'req-123', {}, 'SUCCESS'),
    ).rejects.toThrow(
      'AI Platform submit tool result failed: Submit tool result failed',
    );
  });
});
