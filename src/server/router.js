'use strict';

const router = require('koa-router')();

/*
router.get('/search/em', () => {
  const value = +this.query.value;
  if (!value) {
    return error(this, 'missing value');
  }
  const options = {};
  if (this.query.limit) options.limit = +this.query.limit;
  if (this.query.precision) options.precision = +this.query.precision;
  this.body = {
    result: await api.search.em(value, options)
  };
});
*/


router.get('/mfs/em', async (ctx) => {
  const search = require('../search/mfsFromEm');
  const result = await search(ctx.request.query.em, ctx.request.query);
  ctx.body = {
    result
  };
});

router.get('/molecules/em', async (ctx) => {
  const search = require('../search/moleculesFromEm');
  const result = await search(ctx.request.query.em, ctx.request.query);
  ctx.body = {
    result
  };
});

router.get('/molecules/mf', async (ctx) => {
  const search = require('../search/moleculesFromMf');
  const result = await search(ctx.request.query.mf, ctx.request.query);
  ctx.body = {
    result
  };
});

/*
router.get('/mfStats/search', async () => {
  this.body = {
    result: await api.mfStats.search(this.query)
  };
});
*/

/*
router.get('/mfStats/toc', () => {
  this.body = {
    result: await api.mfStats.toc(this.query)
  };
});
*/
function error(ctx, message) {
  ctx.status = 400;
  ctx.body = {
    error: message
  };
}

module.exports = router;
