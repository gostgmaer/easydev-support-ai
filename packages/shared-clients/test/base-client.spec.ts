import { AxiosRequestConfig } from 'axios';
import { BaseClient } from '../src/base-client';

class TestClient extends BaseClient {
  constructor() {
    super('http://test.local', 'TestClient', 1000);
  }

  setRequestImpl(fn: jest.Mock): void {
    (this as unknown as { http: { request: jest.Mock } }).http = {
      request: fn,
    };
  }

  call(config: AxiosRequestConfig, retries: number): Promise<unknown> {
    return this.request(config, retries, 1);
  }
}

describe('BaseClient', () => {
  it('retries retryable (5xx) failures and eventually succeeds', async () => {
    const client = new TestClient();
    const impl = jest
      .fn()
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({ data: 'ok' });
    client.setRequestImpl(impl);

    const res = (await client.call({ url: '/x', method: 'GET' }, 2)) as {
      data: string;
    };

    expect(res.data).toBe('ok');
    expect(impl).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable (4xx) failures', async () => {
    const client = new TestClient();
    const impl = jest
      .fn()
      .mockRejectedValue({ response: { status: 400 }, message: 'bad request' });
    client.setRequestImpl(impl);

    await expect(client.call({ url: '/x', method: 'GET' }, 3)).rejects.toBeDefined();
    expect(impl).toHaveBeenCalledTimes(1);
  });

  it('opens the circuit breaker after the failure threshold', async () => {
    const client = new TestClient();
    const impl = jest
      .fn()
      .mockRejectedValue({ response: { status: 500 }, message: 'server error' });
    client.setRequestImpl(impl);

    // Five consecutive failed requests trip the breaker (threshold = 5).
    for (let i = 0; i < 5; i++) {
      await expect(client.call({ url: '/x', method: 'GET' }, 0)).rejects.toBeDefined();
    }

    impl.mockClear();
    await expect(client.call({ url: '/x', method: 'GET' }, 0)).rejects.toThrow(
      'Circuit breaker is open',
    );
    // Breaker fast-fails without hitting the transport.
    expect(impl).not.toHaveBeenCalled();
  });
});
