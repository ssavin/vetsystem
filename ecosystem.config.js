module.exports = {
  apps: [{
    name: 'vetsystem-production',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx/esm',
    instances: 'max', // Использует все CPU ядра
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/pm2/vetsystem-error.log',
    out_file: '/var/log/pm2/vetsystem-out.log',
    log_file: '/var/log/pm2/vetsystem-combined.log',
    merge_logs: true,
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      // Переменные окружения будут загружены из .env файла
    }
  }]
};