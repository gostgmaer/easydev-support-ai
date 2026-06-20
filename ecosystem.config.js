module.exports = {
  apps: [
    {
      name: 'easydev-api-server',
      script: './dist/main.js',
      instances: 'max', // Auto-scale to match available CPUs
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 10000, // 10 seconds for graceful shutdown completion
      listen_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'easydev-queue-worker',
      script: './dist/main.js',
      instances: 2, // Dedicated background worker threads
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1500M',
      kill_timeout: 15000, // Allow 15s to finish active queue jobs
      env: {
        NODE_ENV: 'production',
        RUN_WORKERS: 'true',
        PORT: 4000,
      },
    },
  ],
};
