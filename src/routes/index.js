const Router = require('koa-router');
const get = require('lodash.get');
const Joi = require('@hapi/joi');
const gst = require('node-gstreamer-tools');
const Sentry = require('@sentry/node');

const queue = require('../queues/transco/queue');
const joi = require('../middlewares/joi');
const canTranscode = require('../services/canTranscode');
const presets = require('../presets');
const status = require('../services/workerStatus');

const discoverTimeout = process.env.DISCOVER_TIMEOUT || 60;
const allowFilePath = process.env.ALLOW_QUERY_FILE_PATH === '1';
const router = new Router();

const removeBuffer = (key, value) => {
  if (get(value, 'type') === 'Buffer' && Array.isArray(get(value, 'data'))) {
    return null;
  }
  return value;
};

const mediaValidator = allowFilePath
  ? Joi.string()
  : Joi.string().uri({ scheme: ['http', 'https'] });

router.post(
  '/support',
  joi(
    Joi.object({
      media: mediaValidator.required(),
    }),
  ),
  async ctx => {
    let media = null;
    try {
      const filepath = ctx.request.body.media;
      const isHttp = filepath.substr(0, 4).toLowerCase() === 'http';
      media = await gst.discover(
        `${!isHttp ? 'file://' : ''}${filepath}`,
        discoverTimeout,
      );
      ctx.body = canTranscode(media.topology, presets.constraints);
    } catch (e) {
      Sentry.withScope(scope => {
        console.warn(e);
        scope.addEventProcessor(event =>
          Sentry.Handlers.parseRequest(event, ctx.request),
        );
        Sentry.setExtra('media', media);
        Sentry.setExtra('message', e.message);
        Sentry.setExtra('stack', e.stack);
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
      media: mediaValidator.required(),
      output: mediaValidator.required(),
      end: Joi.string().uri({ scheme: ['http', 'https'] }),
      progress: Joi.string().uri({ scheme: ['http', 'https'] }),
    }),
  ),
  async ctx => {
    const { body } = ctx.request;
    let media = null;
    try {
      const isHttp = body.media.substr(0, 4).toLowerCase() === 'http';
      media = await gst.discover(
        `${!isHttp ? 'file://' : ''}${body.media}`,
        discoverTimeout,
      );
      if (!canTranscode(media.topology, presets.constraints)) {
        ctx.body = false;
        return;
      }

      await status.setWaiting(body.id);
      await queue.add(
        JSON.parse(
          JSON.stringify(
            {
              ...body,
              discovered: media,
            },
            removeBuffer,
          ),
        ),
      );

      ctx.body = true;
    } catch (e) {
      Sentry.withScope(scope => {
        console.warn(e);
        scope.addEventProcessor(event =>
          Sentry.Handlers.parseRequest(event, ctx.request),
        );
        Sentry.setExtra('media', media);
        Sentry.setExtra('message', e.message);
        Sentry.setExtra('stack', e.stack);
        Sentry.captureException(e);
      });
      ctx.body = false;
    }
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
