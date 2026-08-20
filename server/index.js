'use strict';
const app = require('./app');
const env = require('./config/env');

app.listen(env.porta, () => {
  console.log('');
  console.log('  ████  TEskBuy API');
  console.log(`  ▸ ambiente : ${env.nodeEnv}`);
  console.log(`  ▸ endereço : http://localhost:${env.porta}`);
  console.log(`  ▸ API      : http://localhost:${env.porta}/api/health`);
  console.log('');
});
