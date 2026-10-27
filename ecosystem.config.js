module.exports = {
  apps: [{
    name: 'speedyboy1-community',
    script: './src/index.js',
    cwd: __dirname,
    autorestart: true,
    watch: false,
    max_restarts: 0,
    exp_backoff_restart_delay: 3000,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
