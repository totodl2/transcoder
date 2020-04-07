const Router = require('koa-router');
const Joi = require('@hapi/joi');
const gst = require('node-gstreamer-tools');
const Sentry = require('@sentry/node');

const queue = require('../queues/transco/queue');
const joi = require('../middlewares/joi');
const canTranscode = require('../services/canTranscode');
const presets = require('../presets');
const status = require('../services/workerStatus');

const router = new Router();

router.post(
  '/support',
  joi(
    Joi.object({
      media: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .required(),
    }),
  ),
  async ctx => {
    let media = null;
    try {
      media = await gst.discover(ctx.request.body.media);
      ctx.body = canTranscode(media.topology, presets.constraints);
    } catch (e) {
      Sentry.withScope(scope => {
        scope.addEventProcessor(event =>
          Sentry.Handlers.parseRequest(event, ctx.request),
        );
        Sentry.setExtra('media', media);
        Sentry.captureException(e);
      });
      ctx.body = false;
    }
  },
);

router.put(
  '/',
  joi(
    Joi.object({
      id: Joi.alternatives()
        .try(Joi.number(), Joi.string())
        .required(),
      media: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .required(),
      output: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .required(),
      end: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .required(),
    }),
  ),
  async ctx => {
    const { body } = ctx.request;
    await status.setWaiting(body.id);
    await queue.add(body);
    ctx.body = true;
  },
);

router.delete(
  '/:id',
  joi(
    Joi.object({
      id: Joi.alternatives()
        .try(Joi.number(), Joi.string())
        .required(),
    }),
    'params',
  ),
  async ctx => {
    const { id } = ctx.params;
    if (!(await status.exists(id))) {
      ctx.body = false;
      return;
    }

    await status.setCancelled(id);
    ctx.body = true;
  },
);

module.exports = router;
