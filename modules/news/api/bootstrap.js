"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCrawlerNewsProvider = exports.createDemoNewsProvider = exports.createConfiguredNewsProviders = exports.PostgresNewsRepository = void 0;
exports.createNewsModule = createNewsModule;
const service_1 = require("../application/service");
function createNewsModule(deps) { return (0, service_1.createNewsModule)(deps); }
var postgres_repository_1 = require("../infrastructure/postgres-repository");
Object.defineProperty(exports, "PostgresNewsRepository", { enumerable: true, get: function () { return postgres_repository_1.PostgresNewsRepository; } });
var demo_provider_1 = require("../infrastructure/demo-provider");
Object.defineProperty(exports, "createConfiguredNewsProviders", { enumerable: true, get: function () { return demo_provider_1.createConfiguredNewsProviders; } });
Object.defineProperty(exports, "createDemoNewsProvider", { enumerable: true, get: function () { return demo_provider_1.createDemoNewsProvider; } });
var crawler_provider_1 = require("../infrastructure/crawler-provider");
Object.defineProperty(exports, "createCrawlerNewsProvider", { enumerable: true, get: function () { return crawler_provider_1.createCrawlerNewsProvider; } });
