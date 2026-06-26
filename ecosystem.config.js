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
        PORT: 3100,
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
        // shouldRunProcessor() in src/config/queue-role.ts gates every
        // @Processor() on this var - RUN_WORKERS was never read anywhere,
        // so this app previously ran zero queue processors.
        PROCESS_QUEUE:
          'conversation-queue,message-queue,ticket-queue,knowledge-queue,connector-queue,workflow-queue,analytics-queue,notification-queue,customer-queue,team-queue,channel-queue,settings-queue,inbox-queue,admin-queue,widget-queue,ai-queue',
        PORT: 4000,
      },
    },
  ],
};
