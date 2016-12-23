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
    const value = +this.query.value;
    if (!value) {
        return error(this, 'missing value');
    }
    this.body = {
        result: yield api.molecules.em(value)
    };
});

router.get('/molecules/mf', function*() {
    const value = this.query.value;
    if (!value) {
        return error(this, 'missing value');
    }
    this.body = {
        result: yield api.molecules.mf(value)
    };
});

function error(ctx, message) {
    ctx.status = 400;
    ctx.body = {
        error: message
    };
}

module.exports = router;
