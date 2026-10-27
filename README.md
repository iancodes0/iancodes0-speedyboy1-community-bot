# Speedyboy1's Community Bot

Discord session coordination bot for the Southwest Florida Roblox roleplay server.

## Setup

1. Install Node.js 18.17 or newer.
2. Put the bot token in `.env` as `BOT_TOKEN=...`.
3. Add a YouTube Data API v3 key to `.env` as `YOUTUBE_API_KEY=...` for `/ytstats`.
4. Invite the bot with the `bot` and `applications.commands` scopes. It needs View Channel, Send Messages, Embed Links, Add Reactions, Read Message History, and Manage Server if role-based command visibility is required.
5. Put the supplied startup and release images in `assets/` using the filenames described in `assets/README.md`.
6. Run `npm install`.
7. Test with `npm start`.
8. Keep it running with `npm run pm2:start`, then persist PM2 with `pm2 save` and `pm2 startup`.

Commands are guild-registered when the bot starts. The role gate is enforced in code, and the bot also applies Discord command permissions to role `1434165288248672277` when it has Manage Server.

`/start up initiate` opens the reaction check. The bot's check mark counts toward the required total, and the host receives a DM when the total is reached. `/start up release` announces the release and reveals the private-server button only after the reaction check passes. Clicking the button sends the link as a private Discord message. Staff can use `?purge <number>` to delete messages. `/end` closes the active session.

`/driverlicense create` opens a form for a Roblox username, the name shown on the license, and a date of birth in `MM/DD/YYYY` format. Each Discord user can create one license, which is saved in `data/driver-licenses.json`; `/driverlicense view` displays it as a private embed.

`/ytstats` displays the current subscriber count and latest video for `@Speedyboy1YT`. It requires a YouTube Data API v3 key in `YOUTUBE_API_KEY`.

`/addcarspotting` posts a required image and optional caption in an embed, then adds check-mark and red-X reactions for likes and dislikes.

`/carcollection` shows your saved car spotting images, captions, viewer-local posting times, and live like/dislike totals.
