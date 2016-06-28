'use strict';

const api = require('api');

const router = require('koa-router')();

router.get('/search/em', function*() {
    const value = +this.query.value;
    if (!value) {
        return error(this, 'missing value');
    }
    this.body = yield api.search.em(value, this.query);
});

function error(ctx, message) {
    ctx.status = 400;
    ctx.body = {
        error: message
    };
}

module.exports = router;
