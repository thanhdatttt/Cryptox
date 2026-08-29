"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCrawlerNewsProvider = exports.createConfiguredNewsProviders = exports.createCoinDeskRssProvider = exports.COINDESK_RSS_FEED_URL = exports.PostgresNewsRepository = void 0;
exports.createNewsModule = createNewsModule;
const service_1 = require("../application/service");
function createNewsModule(deps) { return (0, service_1.createNewsModule)(deps); }
var postgres_repository_1 = require("../infrastructure/postgres-repository");
Object.defineProperty(exports, "PostgresNewsRepository", { enumerable: true, get: function () { return postgres_repository_1.PostgresNewsRepository; } });
var coindesk_rss_provider_1 = require("../infrastructure/coindesk-rss-provider");
Object.defineProperty(exports, "COINDESK_RSS_FEED_URL", { enumerable: true, get: function () { return coindesk_rss_provider_1.COINDESK_RSS_FEED_URL; } });
Object.defineProperty(exports, "createCoinDeskRssProvider", { enumerable: true, get: function () { return coindesk_rss_provider_1.createCoinDeskRssProvider; } });
Object.defineProperty(exports, "createConfiguredNewsProviders", { enumerable: true, get: function () { return coindesk_rss_provider_1.createConfiguredNewsProviders; } });
var crawler_provider_1 = require("../infrastructure/crawler-provider");
Object.defineProperty(exports, "createCrawlerNewsProvider", { enumerable: true, get: function () { return crawler_provider_1.createCrawlerNewsProvider; } });
