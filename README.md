# Transcoder

This program allows you to execute transcoding operation via an API using gstreamer.   
What you can do with it :
- Predefine your encoding / muxing presets in a json configuration file
- Post result(s) to another http(s) server ([upload sample](https://github.com/totodl2/muxer/blob/master/src/routes/index.js#L17))
- Follow transcoding progression and send notification to another http(s) server 
- Stop a transcoding operation
- Transcode subtitles except image based subtitles 
- Verify if the transcoder will be able to transcode media before adding media to queue 

What you can't do with it :
- Define demuxing / decoding operation in the json configuration file. 
- Muxing subtitles in the final container

## How does it work

1. (opt) Query the endpoint `/support` to verify that your media is supported
2. Query endpoint `/transcode` to add the media. It will re-test if the media can be transcoded 
   (like `/support` endpoint). When all is successful it will add the media to transcoding queue in redis.
3. Worker start transcoding using gstreamer
4. During the process, if `progress` url was sent to `/transcode`, it will periodically notify it with
   the progression data (`{ "status": "progress", "jobId": 123, "progress": 10.2 }` or if it failed 
   `{ "status": "failed", "jobId": 123 }`)
5. Once transcoding is completed / cancelled, if `end` url was sent to `/transcode`, 
   it will notify this url with media information as body and `cancelled`(=0|1) in query string.
   
## Dev installation 

### Starting 

First define `.env` file in the project, then `docker-compose -f ./docker-compose.dev.yml up`.   
Use `npm run warmup` to create `cache.json` if needed.

Sample basic .env :
```dotenv
STORAGE_PATH=.data
DEBUG=app:*
PRESET_FILE=./example_presets/presets-full.json
PORT=3000
ARENA_PORT=3001
ALLOW_QUERY_FILE_PATH=1
ALLOWED_API_KEYS=test
```

### Before transcoding

In dev env, before querying `/transcode`, please verify that the user 1000 has the permission to read / write in
`$STORAGE_PATH/virtual_storage` folder.

### Api test

You can import api definition (`<rootDir>/insomnia/transcoder.yml`) with [insomnia](https://insomnia.rest/download) 

### Env configuration

| name | example | description | 
| --- | --- | --- |
| PORT | 3000 | Exposed api listen port (mapped to 4000 in dev docker-compose) |
| REDIS_HOST | redis.host | Redis address |
| REDIS_PORT | 6379 | Redis port (this variable is used only by the app and don't change redis service in dev docker-compose) |
| REDIS_PASSWORD | | Redis password (this variable is used only by the app and don't change redis service in dev docker-compose) |
| REDIS_PREFIX | transco | Redis queue prefix  |
| DEBUG | app:* | Used to activate debug output see [debug](https://github.com/visionmedia/debug#windows-command-prompt-notes) for usage |
| ARENA_PORT | 3001 | Exposed arena port (mapped to 4001 in dev docker-compose) |
| ARENA_HOST | 0.0.0.0 | Listen address for arena |
| ALLOWED_API_KEYS | | Api keys used by the API, you can use alphanum char, to define multiple api keys use `,` separator. Theses api keys are case insensitive. To disable api key auth, let this variable empty |
| PRESET_FILE | ./example_presets/presets-full.json | Preset filepath (see example dir for some presets sample) |
| VERSION | | Version used by sentry |
| SENTRY_DSN | | Sentry DSN |
| PROXIED | | To define if this application is behind a reverse proxy |
| SENTRY_ENV | dev | Sentry env |
| ALLOW_QUERY_FILE_PATH | | Set value to 1 if you want to allow filepath in api queries |
| STORAGE_PATH | .data | Docker volumes path |
| DISCOVER_TIMEOUT | 60 | Timeout for discovering media's metadata (in seconds) |
| JOB_TIMEOUT | 300000 | Job timeout (max duration without progress in ms) |

## Preset file

| Key | Type | Required | Description |
| --- | --- | --- | --- |
| constraints | object | n | Plugins whitelist section |
| constraints.audio | object | n | Plugins whitelist for audio |
| constraints.audio.parsers | string[] | n | Plugins whitelist for audio parsers (unused if empty) |
| constraints.audio.decoders | string[] | n | Plugins whitelist for audio decoders (unused if empty) |
| constraints.video | object | n | Plugins whitelist for video |
| constraints.video.parsers | string[] | n | Plugins whitelist for video parsers (unused if empty) |
| constraints.video.decoders | string[] | n | Plugins whitelist for video decoders (unused if empty) |
| constraints.demuxers | string[] | n | Demuxers whitelist |
| queueProps | object | n | Queue element props |
| src | object | n | Src element section |
| src.http | object | n | Http src element section |
| src.http.element | string | n | Element name for http(s) links |
| src.http.props | object | n | Element props for http(s) links |
| src.file | object | n | File src element section |
| src.file.element | string | n | Element name for files |
| src.file.props | object | n | Element props for files |
| sink | object | n | Sink element section |
| sink.http | object | n | Http sink element section |
| sink.http.element | string | n | Element name |
| sink.http.props | object | Element props |
| sink.file | object | n | File sink element section |
| sink.file.element | string | n | Element name |
| sink.file.props | object | n | Element props |
| subtitles | object | n | Subtitles section (/!\ this feature has his decoding pipeline mostly hardcoded and can have hazardous behavior) |
| subtitles.accept | regex | y | Accepted subtitles mimetype |
| subtitles.filename | string | n | Output filename, `%i` will be remplaced by the stream offset |
| subtitles.encoder | object | y | Subtitles encoder section |
| subtitles.encoder.instance | string | y | Subtitle element name |
| subtitles.encoder.params | string | n | Subtitle element props |
| presets | object | y | Presets section |
| presets.\<name> | object | y | Preset section, you can use whatever you want as <name> | 
| presets.\<name>.minHeight | int | n | Min media height for this preset, it the original media is lower than this height, the preset will be ignored except if media's width is greater than minWidth |
| presets.\<name>.minWidth | int | n | Min media width for this preset, it the original media is lower than this width, the preset will be ignored except if media's height is greater than minHeight |
| presets.\<name>.muxer | object | y | Muxer section |
| presets.\<name>.muxer.type | string | y | Muxer element name |
| presets.\<name>.muxer.filename | string | y | Output filename |
| presets.\<name>.muxer.params | object | n | Muxer element properties, ex : `{ "streamable": true }` |
| presets.\<name>.video | array | n | Video pipeline |
| presets.\<name>.video[X] | object | n | Element / Caps definition |
| presets.\<name>.video[X].removeIfStreamHeight | int | n | Remove this element / caps if media's height equals removeIfStreamHeight |
| presets.\<name>.video[X].instance | string(element,caps) | y | Element type |
| presets.\<name>.video[X].params | object | y | Element or caps parameters |
| presets.\<name>.video[X].params.type | string | y | Element or caps type ex: `video/x-raw` or `videoscale` |
| presets.\<name>.video[X].params.props | object | n | Element or caps properties, ex: `{ "height": 480 }`. `bitrate` property is specific, you must define the unit associated to this value with `bitrateUnit` field. It will be used to keep the original bitrate if media's bitrate is lower than the one you wrote |
| presets.\<name>.audio | array | n | Audio pipeline |
| presets.\<name>.audio[X] | object | n | Element / Caps definition |
| presets.\<name>.audio[X].instance | string(element,caps) | y | Element type |
| presets.\<name>.audio[X].params | object | y | Element or caps parameters |
| presets.\<name>.audio[X].params.type | string | y | Element or caps type ex: `audio/x-raw` or `audioconvert` |
| presets.\<name>.audio[X].params.props | object | n | Element or caps properties, ex: `{ "bitrate": 160000, "bitrateUnit": "b" }`. `bitrate` property is specific, you must define the unit associated to this value with `bitrateUnit` field. It will be used to keep the original bitrate if media's bitrate is lower than the one you wrote |



