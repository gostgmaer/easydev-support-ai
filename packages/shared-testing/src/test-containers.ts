/**
 * Thin wrapper around `testcontainers` for spinning up a disposable PostgreSQL
 * instance in integration tests.
 *
 * The `testcontainers` package is an optional, test-only dependency, so it is
 * loaded lazily via `require`. This keeps the foundation packages compiling and
 * importable in environments where Docker / testcontainers is not available.
 * Install it with: `pnpm add -D testcontainers` (and ensure Docker is running).
 */

export interface PostgresContainerHandle {
  connectionUri: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  stop: () => Promise<void>;
}

export interface StartPostgresOptions {
  image?: string;
  database?: string;
  username?: string;
  password?: string;
}

export async function startPostgresContainer(
  options: StartPostgresOptions = {},
): Promise<PostgresContainerHandle> {
  const {
    image = 'postgres:16-alpine',
    database = 'easydev_support_ai_test',
    username = 'postgres',
    password = 'postgres',
  } = options;

  let GenericContainer: any;
  let Wait: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tc = require('testcontainers');
    GenericContainer = tc.GenericContainer;
    Wait = tc.Wait;
  } catch {
    throw new Error(
      "The 'testcontainers' package is required for container-backed integration tests. " +
        'Install it with `pnpm add -D testcontainers` and make sure Docker is running.',
    );
  }

  const container = await new GenericContainer(image)
    .withEnvironment({
      POSTGRES_DB: database,
      POSTGRES_USER: username,
      POSTGRES_PASSWORD: password,
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2),
    )
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const connectionUri = `postgresql://${username}:${password}@${host}:${port}/${database}`;

  return {
    connectionUri,
    host,
    port,
    database,
    username,
    password,
    stop: () => container.stop(),
  };
}
