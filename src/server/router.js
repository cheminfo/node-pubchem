'use strict';

const api = require('api');

const router = require('koa-router')();

router.get('/search/em', function*() {
    const value = +this.query.value;
    if (!value) {
        return error(this, 'missing value');
    }
    const options = {};
    if (this.query.limit) options.limit = +this.query.limit;
    if (this.query.resolution) options.resolution = +this.query.resolution;
    if (this.query.accuracy) options.accuracy = +this.query.accuracy;
    this.body = {
        result: yield api.search.em(value, options)
    };
});

function error(ctx, message) {
    ctx.status = 400;
    ctx.body = {
        error: message
    };
}

module.exports = router;
