'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

try {
  require('./dist/app.js');
} catch (error) {
  console.error(
    'Unable to start backend from dist/app.js. Run "npm run build" first.',
  );
  console.error(error);
  process.exit(1);
}
