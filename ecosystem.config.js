module.exports = {
  apps: [
    {
      name: `floppy_app`,
      script: 'server.js',
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: process.env.NODE_ENV
      },
      env_development: {
        NODE_ENV: process.env.NODE_ENV
      },
      env_staging: {
        NODE_ENV: process.env.NODE_ENV
      },
      env_production: {
        NODE_ENV: process.env.NODE_ENV
      }
    }
  ],
};