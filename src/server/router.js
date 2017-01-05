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
    if (this.query.precision) options.precision = +this.query.precision;
    this.body = {
        result: yield api.search.em(value, options)
    };
});

router.get('/molecules/em', function*() {
    this.body = {
        result: yield api.molecules.em(this.query)
    };
});

router.get('/molecules/mf', function*() {
    this.body = {
        result: yield api.molecules.mf(this.query)
    };
});

router.get('/mfStats/search', function*() {
    this.body = {
        result: yield api.mfStats.search(this.query)
    };
});

router.get('/mfStats/toc', function*() {
    this.body = {
        result: yield api.mfStats.toc(this.query)
    };
});

function error(ctx, message) {
    ctx.status = 400;
    ctx.body = {
        error: message
    };
}

module.exports = router;
