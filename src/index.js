require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {
  ActionRowBuilder,
  ActivityType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const TOKEN = process.env.BOT_TOKEN;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_HANDLE = '@Speedyboy1YT';
const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@Speedyboy1YT';
const STAFF_ROLE_ID = '1434165288248672277';
const ULTIMATE_ADMIN_USER_ID = '1388554248144293919';
const SERVER_OWNER_USER_ID = '1274093730197930015';
const INCIDENT_LOG_CHANNEL_ID = '1531267660262801488';
const SESSION_REVIEW_CHANNEL_ID = '1545016457673310258';
const CAR_SPOTTING_CHANNEL_ID = '1460381089158922260';
const GREETING_CHANNEL_ID = '1381319029351907358';
const REPLY_TARGET_MESSAGE_ID = '1551019718477873243';
const REPLY_TARGET_CONTENT = 'Good Fall 4:13 thanks for asking!';
const SESSION_PING_ROLE_ID = '1466900247681826929';
const YOUTUBE_STATS_REFRESH_INTERVAL = 30_000;
const WEEKLY_REPORT_SCAN_TIMEOUT = 10_000;
const WEEKLY_REPORT_REQUEST_TIMEOUT = 1_500;
const WEEKLY_REPORT_MEMBER_TIMEOUT = 3_000;
const WEEKLY_REPORT_MAX_PAGES_PER_CHANNEL = 25;
const DRIVER_LICENSE_COMMAND = 'driverlicense';
const DRIVER_LICENSE_GUILD = 'Westbrook City | Redcliff';
const WEEKLY_REPORT_COMMAND = 'weeklystats';
const PERSONAL_CAR_COLLECTION_COMMAND = 'vieewcarcollection';
const RESTRICTED_COMMAND_USER_IDS = [ULTIMATE_ADMIN_USER_ID, SERVER_OWNER_USER_ID];
const RESTRICTED_COMMAND_NAMES = new Set(['start', 'end', WEEKLY_REPORT_COMMAND]);
const CAR_SPOTTING_COMMAND_NAMES = new Set(['addcarspotting', 'carcollection']);
const WEEKLY_REPORT_GUILD = 'this server';
const WEEKLY_REPORT_GUILD_ID = '1381308127084810445';
const CHECK_MARK = '\u2705';
const RED_X = '\u274C';
const BIBLE_VERSE = 'Philippians 4:13 — "I can do all things through Christ who strengthens me."';
const STARTUP_IMAGE = path.join(__dirname, '..', 'assets', 'session-startup.png');
const RELEASE_IMAGE = path.join(__dirname, '..', 'assets', 'session-release.png');
const LICENSES_FILE = path.join(__dirname, '..', 'data', 'driver-licenses.json');
const CAR_SPOTTINGS_FILE = path.join(__dirname, '..', 'data', 'car-spottings.json');

if (!TOKEN || TOKEN === 'replace_with_your_bot_token') {
  throw new Error('Set BOT_TOKEN in .env before starting the bot.');
}

const commands = [
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Session startup actions.')
    .addSubcommandGroup((group) => group
      .setName('up')
      .setDescription('Session startup actions.')
      .addSubcommand((subcommand) => subcommand
        .setName('initiate')
        .setDescription('Open a session startup reaction check.')
        .addIntegerOption((option) => option
          .setName('reactions')
          .setDescription('Number of unique check-mark reactions required.')
          .setMinValue(1)
          .setRequired(true))
        .addStringOption((option) => option
          .setName('description')
          .setDescription('Extra host notes, such as roleplay style or session details.')
          .setMaxLength(1000)
          .setRequired(false)))
      .addSubcommand((subcommand) => subcommand
        .setName('release')
        .setDescription('Release the private server link.')
        .addIntegerOption((option) => option
          .setName('speed_limit')
          .setDescription('Speed limit in MPH.')
          .setMinValue(0)
          .setRequired(true))
        .addStringOption((option) => option
          .setName('link')
          .setDescription('Private Roblox server link.')
          .setRequired(true))
        .addStringOption((option) => option
          .setName('drifting')
          .setDescription('Drifting policy.')
          .setRequired(true)
          .addChoices(
            { name: 'Off', value: 'Off' },
            { name: 'Corners Only', value: 'Corners Only' },
            { name: 'Fully On', value: 'Fully On' }
          ))
        .addStringOption((option) => option
          .setName('description')
          .setDescription('Extra release notes, such as roleplay details or session information.')
          .setMaxLength(1000)
          .setRequired(false)))),
  new SlashCommandBuilder()
    .setName('end')
    .setDescription('End the current session.')
    .addStringOption((option) => option
      .setName('duration')
      .setDescription('How long the session lasted, for example 2 hours.')
      .setRequired(true)),
  new SlashCommandBuilder()
    .setName('sessionreview')
    .setDescription('Share your thoughts about the session.')
    .addStringOption((option) => option
      .setName('review')
      .setDescription('What did you think about the session?')
      .setRequired(true)
      .setMaxLength(4000)),
  new SlashCommandBuilder()
    .setName('incidentreport')
    .setDescription('Report an incident that occurred during the session.')
    .addStringOption((option) => option
      .setName('what_happened')
      .setDescription('Describe what happened.')
      .setRequired(true)
      .setMaxLength(2000))
    .addStringOption((option) => option
      .setName('evidence')
      .setDescription('Any evidence or details (screenshots, links, etc).')
      .setRequired(true)
      .setMaxLength(2000))
    .addStringOption((option) => option
      .setName('location')
      .setDescription('Where in the server did this happen?')
      .setRequired(true)
      .setMaxLength(500)),
  new SlashCommandBuilder()
    .setName('addcarspotting')
    .setDescription('Post a car spotting image for the community to rate.')
    .setDefaultMemberPermissions(null)
    .addAttachmentOption((option) => option
      .setName('image')
      .setDescription('The car spotting image to post.')
      .setRequired(true))
    .addStringOption((option) => option
      .setName('caption')
      .setDescription('A car name, question, or anything else to show with the image.')
      .setMaxLength(4000)
      .setRequired(false)),
  new SlashCommandBuilder()
    .setName('carcollection')
    .setDescription('Show all of your car spotting posts and their ratings.')
    .setDefaultMemberPermissions(null),
  new SlashCommandBuilder()
    .setName(PERSONAL_CAR_COLLECTION_COMMAND)
    .setDescription('Show saved car spotting posts for a user.')
    .setDefaultMemberPermissions(null)
    .addUserOption((option) => option
      .setName('user')
      .setDescription('User whose car spotting posts to show. Defaults to you.')
      .setRequired(false)),
  new SlashCommandBuilder()
    .setName('ytstats')
    .setDescription('Show Speedyboy1 YouTube subscribers and latest video.'),
  new SlashCommandBuilder()
    .setName('aboutspeedy')
    .setDescription('Learn about the owner of the server.'),
  new SlashCommandBuilder()
    .setName(WEEKLY_REPORT_COMMAND)
    .setDescription('Show activity from the past week.'),
  new SlashCommandBuilder()
    .setName('driverlicense')
    .setDescription('Create or view your driver license.')
    .addSubcommand((subcommand) => subcommand
      .setName('create')
      .setDescription('Create your one-time driver license.'))
    .addSubcommand((subcommand) => subcommand
      .setName('view')
      .setDescription('View your driver license.'))
].map((command) => command.toJSON());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const sessions = new Map();
const weeklyReports = new Map();
const carSpottings = loadCarSpottings();

function loadDriverLicenses() {
  if (!fs.existsSync(LICENSES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(LICENSES_FILE, 'utf8'));
  } catch (error) {
    console.warn(`Could not read driver licenses: ${error.message}`);
    return {};
  }
}

function saveDriverLicenses(licenses) {
  fs.mkdirSync(path.dirname(LICENSES_FILE), { recursive: true });
  fs.writeFileSync(LICENSES_FILE, `${JSON.stringify(licenses, null, 2)}\n`);
}

function loadCarSpottings() {
  if (!fs.existsSync(CAR_SPOTTINGS_FILE)) return [];
  try {
    const records = JSON.parse(fs.readFileSync(CAR_SPOTTINGS_FILE, 'utf8'));
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.warn(`Could not read car spottings: ${error.message}`);
    return [];
  }
}

function saveCarSpottings() {
  fs.mkdirSync(path.dirname(CAR_SPOTTINGS_FILE), { recursive: true });
  fs.writeFileSync(CAR_SPOTTINGS_FILE, `${JSON.stringify(carSpottings, null, 2)}\n`);
}

async function carSpottingReactionCount(message, emoji) {
  const reaction = message.reactions.cache.find((entry) => entry.emoji.name === emoji);
  if (!reaction) return 0;
  const users = await reaction.users.fetch();
  return users.filter((user) => !user.bot).size;
}

async function carCollectionEmbeds(records) {
  const results = await Promise.all(records.map(async (record) => {
    try {
      const channel = await client.channels.fetch(record.channelId);
      const message = channel?.isTextBased() ? await channel.messages.fetch(record.messageId) : null;
      if (!message) return null;

      const [likes, dislikes] = await Promise.all([
        carSpottingReactionCount(message, CHECK_MARK),
        carSpottingReactionCount(message, RED_X)
      ]);
      const timestamp = Math.floor((record.createdTimestamp || message.createdTimestamp) / 1000);
      const embed = new EmbedBuilder()
        .setColor(0xff3333)
        .setImage(record.imageUrl)
        .addFields(
          { name: 'Posted', value: `<t:${timestamp}:F>` },
          { name: 'Likes', value: String(likes), inline: true },
          { name: 'Dislikes', value: String(dislikes), inline: true }
        )
        .setFooter({ text: `Posted by ${record.authorId ? `<@${record.authorId}>` : 'a community member'}` });
      if (record.caption) embed.setDescription(record.caption.slice(0, 1500));
      return embed;
    } catch (error) {
      console.warn(`Could not load car spotting ${record.messageId}: ${error.message}`);
      return null;
    }
  }));

  return results.filter(Boolean);
}

function driverLicenseEmbed(interaction, license) {
  return new EmbedBuilder()
    .setColor(0x1683ff)
    .setTitle('Speedyboy1\'s Community | Driver License')
    .setDescription(`License holder: <@${interaction.user.id}>`)
    .addFields(
      { name: 'Roblox Username', value: license.robloxUsername, inline: true },
      { name: 'Name on License', value: license.fullName, inline: true },
      { name: 'Date of Birth', value: license.dateOfBirth, inline: true }
    )
    .setFooter({ text: 'This license belongs to the Discord user shown above.' })
    .setTimestamp();
}

function driverLicenseModal() {
  return new ModalBuilder()
    .setCustomId('driverlicense-create')
    .setTitle('Create Driver License')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('roblox_username')
          .setLabel('Roblox username')
          .setPlaceholder('Your Roblox username')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(20)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('full_name')
          .setLabel('Full name on the license')
          .setPlaceholder('Full name, or just your first name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('date_of_birth')
          .setLabel('Date of birth')
          .setPlaceholder('MM/DD/YYYY')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10)
      )
    );
}

async function purgeMessages(commandMessage, requestedAmount) {
  let remaining = requestedAmount + 1;
  let deletedCount = 0;

  while (remaining > 0) {
    const messages = await commandMessage.channel.messages.fetch({ limit: Math.min(100, remaining) });
    if (messages.size === 0) break;

    const deleted = await commandMessage.channel.bulkDelete(messages, true);
    deletedCount += deleted.size;
    remaining -= messages.size;

    if (deleted.size === 0) break;
  }

  return Math.max(0, deletedCount - 1);
}

function hasStaffRole(interaction) {
  const userId = interaction.user?.id ?? interaction.author?.id;
  if (userId === ULTIMATE_ADMIN_USER_ID || userId === SERVER_OWNER_USER_ID) return true;
  return interaction.member?.roles?.cache?.has(STAFF_ROLE_ID) ?? false;
}

function canUseRestrictedCommands(interaction) {
  const userId = interaction.user?.id ?? interaction.author?.id;
  return userId === ULTIMATE_ADMIN_USER_ID || userId === SERVER_OWNER_USER_ID;
}

async function applyRestrictedCommandPermissions(rest, guild, commands) {
  for (const command of commands) {
    let permissions;
    if (command.name === PERSONAL_CAR_COLLECTION_COMMAND) {
      permissions = [
        { id: guild.roles.everyone.id, type: 1, permission: false },
        { id: ULTIMATE_ADMIN_USER_ID, type: 2, permission: true }
      ];
    } else if (CAR_SPOTTING_COMMAND_NAMES.has(command.name)) {
      if (!guild.channels.cache.has(CAR_SPOTTING_CHANNEL_ID)) continue;
      permissions = [
        { id: guild.roles.everyone.id, type: 1, permission: false },
        { id: CAR_SPOTTING_CHANNEL_ID, type: 3, permission: true }
      ];
    } else if (RESTRICTED_COMMAND_NAMES.has(command.name)) {
      permissions = [
        { id: guild.roles.everyone.id, type: 1, permission: false },
        ...RESTRICTED_COMMAND_USER_IDS.map((userId) => ({ id: userId, type: 2, permission: true }))
      ];
    } else {
      continue;
    }

    try {
      await rest.put(Routes.applicationCommandPermissions(client.user.id, guild.id, command.id), {
        body: { permissions }
      });
    } catch (error) {
      console.warn(`Could not update permissions for /${command.name} in ${guild.name}: ${error.message}`);
    }
  }
}

function imageAttachment(filePath, name) {
  if (!fs.existsSync(filePath)) return { files: [], imageUrl: undefined };
  return {
    files: [new AttachmentBuilder(filePath, { name })],
    imageUrl: `attachment://${name}`
  };
}

function startupEmbed(interaction, requiredReactions, status, description = '') {
  const image = imageAttachment(STARTUP_IMAGE, 'session-startup.png');
  const embed = new EmbedBuilder()
    .setColor(status === 'Ready to start!' ? 0x22c55e : 0x1683ff)
    .setTitle('Speedyboy1\'s Community | Session Startup')
    .setDescription(`**${interaction.user.tag}** is hosting a session!\n\nIn order to start the session, the host has asked for **${requiredReactions}** check-mark reactions.`)
    .addFields({ name: 'Host', value: `<@${interaction.user.id}>`, inline: true })
    .setTimestamp()
    .setFooter({ text: 'React with the check mark to join the count.' });

  if (description && description.trim()) {
    embed.addFields({ name: 'Host Notes', value: description.trim() });
  }

  if (image.imageUrl) embed.setImage(image.imageUrl);

  return {
    embed,
    files: image.files
  };
}

function releaseEmbed(interaction, speedLimit, drifting, description = '') {
  const image = imageAttachment(RELEASE_IMAGE, 'session-release.png');
  const embed = new EmbedBuilder()
    .setColor(0x1683ff)
    .setTitle('Speedyboy1\'s Community | Session Release')
    .setDescription(`**${interaction.user.tag}** has released the session!`)
    .addFields(
      { name: 'Private server', value: 'React to the startup check to unlock the access button.' },
      { name: 'Speed Limit', value: `${speedLimit} MPH`, inline: true },
      { name: 'Drifting', value: drifting, inline: true }
    )
    .setTimestamp();

  if (description && description.trim()) {
    embed.addFields({ name: 'Description', value: description.trim() });
  }

  if (image.imageUrl) embed.setImage(image.imageUrl);

  return {
    embed,
    files: image.files
  };
}

function releaseButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('session-release-link')
      .setLabel('Access Private Server')
      .setStyle(ButtonStyle.Primary)
  );
}

function isUnknownInteractionError(error) {
  return error && (
    error.code === 10062 ||
    error.status === 404 ||
    /unknown interaction/i.test(error.message || '')
  );
}

async function safeDeferReply(interaction, options) {
  try {
    await interaction.deferReply(options);
    return true;
  } catch (error) {
    if (isUnknownInteractionError(error)) return false;
    throw error;
  }
}

async function safeEditReply(interaction, payload) {
  try {
    await interaction.editReply(payload);
    return true;
  } catch (error) {
    if (isUnknownInteractionError(error)) return false;
    throw error;
  }
}

async function safeReply(interaction, payload) {
  try {
    await interaction.reply(payload);
    return true;
  } catch (error) {
    if (isUnknownInteractionError(error)) return false;
    throw error;
  }
}

async function safeFollowUp(interaction, payload) {
  try {
    await interaction.followUp(payload);
    return true;
  } catch (error) {
    if (isUnknownInteractionError(error)) return false;
    throw error;
  }
}

async function fetchYouTubeStats() {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not configured.');
  }

  const channelParams = new URLSearchParams({
    part: 'statistics,contentDetails',
    forHandle: YOUTUBE_CHANNEL_HANDLE,
    key: YOUTUBE_API_KEY
  });
  const requestOptions = {
    signal: AbortSignal.timeout(10_000),
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    }
  };
  const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?${channelParams}`, requestOptions);
  if (!channelResponse.ok) throw new Error(`YouTube channel request failed (${channelResponse.status}).`);

  const channelData = await channelResponse.json();
  const channel = channelData.items?.[0];
  if (!channel) throw new Error('The Speedyboy1 YouTube channel could not be found.');

  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error('The YouTube uploads playlist could not be found.');

  const stats = {
    subscriberCount: channel.statistics?.subscriberCount,
    viewCount: channel.statistics?.viewCount
  };

  try {
    const videoParams = new URLSearchParams({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '1',
      key: YOUTUBE_API_KEY
    });
    const videoResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${videoParams}`, requestOptions);
    if (!videoResponse.ok) throw new Error(`YouTube video request failed (${videoResponse.status}).`);

    const videoData = await videoResponse.json();
    const video = videoData.items?.[0]?.snippet;
    if (!video?.resourceId?.videoId) throw new Error('No videos were found on the YouTube channel.');

    stats.videoTitle = video.title;
    stats.videoUrl = `https://www.youtube.com/watch?v=${video.resourceId.videoId}`;
    stats.thumbnailUrl = video.thumbnails?.maxres?.url
      ?? video.thumbnails?.high?.url
      ?? video.thumbnails?.medium?.url
      ?? video.thumbnails?.default?.url;
  } catch (error) {
    console.warn(`Could not refresh latest YouTube video: ${error.message}`);
  }

  return stats;
}

function formatCompactCount(count, fallback = 'Hidden') {
  if (count === undefined || count === null) return fallback;
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(count));
}

function aboutSpeedyEmbed(stats) {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('About Speedyboy1')
    .setDescription(BIBLE_VERSE)
    .addFields({
      name: 'Channel Info:',
      value: [
        'Started my channel: August 3rd, 2024',
        'SWFL Content Creator role: 27th January 2026'
      ].join('\n')
    }, {
      name: 'My YouTube Stats:',
      value: [
        'Videos Made: 368 Videos',
        `Total Views: ${Number(stats.viewCount ?? 5257637).toLocaleString()} views`,
        `Total Subscribers: ${formatCompactCount(stats.subscriberCount, '10.5K')} subscribers`
      ].join('\n')
    }, {
      name: 'What Applications I use?',
      value: 'Editing: Davinci Resolve'
    })
    .setURL(YOUTUBE_CHANNEL_URL)
    .setFooter({ text: 'More Info coming soon' })
    .setTimestamp();
}

async function refreshYouTubeChannelStats() {
  return fetchYouTubeStats();
}

function youtubeStatsEmbed(stats) {
  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('[Speedyboy1]')
    .setURL(YOUTUBE_CHANNEL_URL)
    .addFields(
      { name: 'Subscribers', value: stats.subscriberCount ? Number(stats.subscriberCount).toLocaleString() : 'Hidden', inline: true },
      {
        name: 'Latest video',
        value: stats.videoTitle && stats.videoUrl
          ? `[${stats.videoTitle}](${stats.videoUrl})`
          : 'Temporarily unavailable'
      }
    )
    .setTimestamp();

  if (stats.thumbnailUrl) embed.setImage(stats.thumbnailUrl);
  return embed;
}

function mondayAtUtc(date) {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() - (day === 1 ? 7 : (day + 6) % 7));
  return monday;
}

function formatReportDate(date) {
  return date.toISOString().slice(0, 10);
}

function snowflakeForTimestamp(timestamp) {
  return String(BigInt(Math.floor(timestamp - 1420070400000)) << 22n);
}

async function resolveWithTimeout(promise, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function collectWeeklyActivity(guild, start) {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  const activity = new Map();
  const scanDeadline = Date.now() + WEEKLY_REPORT_SCAN_TIMEOUT;
  const startSnowflake = snowflakeForTimestamp(start.getTime());
  const endSnowflake = snowflakeForTimestamp(end.getTime());

  for (const channel of guild.channels.cache.values()) {
    if (Date.now() >= scanDeadline || !channel.isTextBased() || !channel.messages) continue;

    let after = startSnowflake;
    for (let page = 0; page < WEEKLY_REPORT_MAX_PAGES_PER_CHANNEL && Date.now() < scanDeadline; page += 1) {
      const messages = await resolveWithTimeout(
        channel.messages.fetch({ limit: 100, after, before: endSnowflake }).catch(() => null),
        WEEKLY_REPORT_REQUEST_TIMEOUT
      );
      if (!messages?.size) break;

      for (const message of messages.values()) {
        if (message.createdTimestamp < start.getTime() || message.createdTimestamp >= end.getTime() || message.author.bot) continue;
        activity.set(message.author.id, (activity.get(message.author.id) ?? 0) + 1);
      }

      if (messages.size < 100) break;
      const newestId = [...messages.keys()].reduce((largest, id) => BigInt(id) > BigInt(largest) ? id : largest);
      if (newestId === after) break;
      after = newestId;
    }
  }

  await resolveWithTimeout(guild.members.fetch().catch(() => null), WEEKLY_REPORT_MEMBER_TIMEOUT);
  const members = guild.members.cache.filter((member) => !member.user.bot);
  const inactiveUsers = members
    .filter((member) => !activity.has(member.id))
    .map((member) => ({ id: member.id, tag: member.user.tag }));
  const mostActive = [...activity.entries()]
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)[0];

  return {
    start,
    end,
    inactiveUsers,
    mostActive: mostActive ? {
      id: mostActive[0],
      count: mostActive[1],
      tag: guild.members.cache.get(mostActive[0])?.user.tag ?? mostActive[0]
    } : null,
    totalMessages: [...activity.values()].reduce((total, count) => total + count, 0)
  };
}

function weeklyReportEmbed(report) {
  return new EmbedBuilder()
    .setColor(0x1683ff)
    .setTitle('Weekly Activity Report')
    .setDescription(`Activity from **${formatReportDate(report.start)}** through **${formatReportDate(report.end)}**.`)
    .addFields(
      {
        name: 'Most active user',
        value: report.mostActive
          ? `<@${report.mostActive.id}> with **${report.mostActive.count}** message${report.mostActive.count === 1 ? '' : 's'}`
          : 'No messages were sent.'
      },
      { name: 'Messages sent', value: report.totalMessages.toLocaleString(), inline: true },
      { name: 'People who did not interact', value: report.inactiveUsers.length.toLocaleString(), inline: true }
    )
    .setTimestamp();
}

function weeklyReportButton(reportId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`weeklyreport-view:${reportId}`)
      .setLabel('View Users')
      .setStyle(ButtonStyle.Danger)
  );
}

function inactiveUsersText(report) {
  if (report.inactiveUsers.length === 0) return 'Everyone interacted this week.';
  const mentions = report.inactiveUsers.map((user) => `<@${user.id}>`);
  return mentions.join('\n').slice(0, 1800);
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const guilds = client.guilds.cache;

  for (const guild of guilds.values()) {
    try {
      const existingCommands = await rest.get(Routes.applicationGuildCommands(client.user.id, guild.id));
      await Promise.all(existingCommands.map((command) =>
        rest.delete(Routes.applicationGuildCommand(client.user.id, guild.id, command.id)).catch(() => {})
      ));
    } catch (error) {
      console.warn(`Could not clear stale commands in ${guild.name}: ${error.message}`);
    }

    const guildCommands = commands.filter((command) => {
      if (command.name === DRIVER_LICENSE_COMMAND && guild.name !== DRIVER_LICENSE_GUILD) return false;
      if (command.name === WEEKLY_REPORT_COMMAND && guild.id !== WEEKLY_REPORT_GUILD_ID) return false;
      if (CAR_SPOTTING_COMMAND_NAMES.has(command.name) && !guild.channels.cache.has(CAR_SPOTTING_CHANNEL_ID)) return false;
      return true;
    });
    const registeredCommands = await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: guildCommands });
    await applyRestrictedCommandPermissions(rest, guild, registeredCommands);
  }

  console.log(`Registered ${commands.length} commands in ${guilds.size} guild(s).`);
}

async function refreshStartup(message, session) {
  const reaction = message.reactions.cache.get(CHECK_MARK);
  const count = reaction?.count ?? 0;
  const ready = count >= session.requiredReactions;
  session.ready = ready;
  const payload = startupEmbed(
    { user: { tag: session.hostTag, id: session.hostId } },
    session.requiredReactions,
    ready ? 'Ready to start!' : 'Not able to start',
    session.description
  );
  await message.edit({ embeds: [payload.embed], files: payload.files });
  if (session.releaseMessageId && session.releaseLink) {
    const releaseMessage = await message.channel.messages.fetch(session.releaseMessageId).catch(() => null);
    if (releaseMessage) {
      await releaseMessage.edit({
        components: ready ? [releaseButton()] : []
      });
    }
  }
  if (ready && !session.notified) {
    session.notified = true;
    const host = await client.users.fetch(session.hostId);
    await host.send(`Your session has reached the required amount of reactions! ${message.url}`);
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: 'online',
    activities: [{
      name: 'Custom Status',
      type: ActivityType.Custom,
      state: 'Philippians 4:13 - I can do all things through Christ who strengthens me.',
      emoji: { name: '\u{1F4AD}' }
    }]
  });
  try {
    const greetingChannel = await client.channels.fetch(GREETING_CHANNEL_ID);
    if (!greetingChannel?.isTextBased()) {
      throw new Error('The greeting channel is unavailable or not text-based.');
    }
    await greetingChannel.send('Hi, how are you guys?');

    const targetMessage = await greetingChannel.messages.fetch(REPLY_TARGET_MESSAGE_ID);
    const recentMessages = await greetingChannel.messages.fetch({ limit: 100 });
    const alreadyReplied = recentMessages.some((message) => (
      message.author.id === client.user.id
      && message.reference?.messageId === REPLY_TARGET_MESSAGE_ID
      && message.content === REPLY_TARGET_CONTENT
    ));
    if (!alreadyReplied) await targetMessage.reply(REPLY_TARGET_CONTENT);
  } catch (error) {
    console.warn('Could not send startup messages:', error.message);
  }
  await registerCommands();
  refreshYouTubeChannelStats().catch((error) => {
    console.warn('Could not refresh YouTube channel stats:', error.message);
  });
  setInterval(() => {
    refreshYouTubeChannelStats().catch((error) => {
      console.warn('Could not refresh YouTube channel stats:', error.message);
    });
  }, YOUTUBE_STATS_REFRESH_INTERVAL).unref();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isModalSubmit()) return;
  if (!interaction.guild) return;

  if (interaction.isButton() && interaction.customId === 'session-release-link') {
    const session = sessions.get(interaction.guildId);
    if (!session?.ready || !session.releaseLink) {
      await interaction.reply({ content: 'This session link is not available yet.', ephemeral: true });
      return;
    }
    await interaction.reply({ content: session.releaseLink, ephemeral: true });
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('weeklyreport-view:')) {
    const report = weeklyReports.get(interaction.customId.slice('weeklyreport-view:'.length));
    if (!report) {
      await interaction.reply({ content: 'That weekly report has expired. Run `/weeklystats` again.', ephemeral: true });
      return;
    }
    await interaction.reply({
      content: inactiveUsersText(report),
      ephemeral: true,
      allowedMentions: { parse: [] }
    });
    return;
  }

  if (interaction.isChatInputCommand()
    && CAR_SPOTTING_COMMAND_NAMES.has(interaction.commandName)
    && interaction.channelId !== CAR_SPOTTING_CHANNEL_ID) {
    await interaction.reply({
      content: `Use /${interaction.commandName} in <#${CAR_SPOTTING_CHANNEL_ID}>.`,
      ephemeral: true
    });
    return;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'driverlicense-create') {
    const licenses = loadDriverLicenses();
    if (licenses[interaction.user.id]) {
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xff3333)
          .setTitle('Driver License Already Exists')
          .setDescription('You can only create one driver license. Use `/driverlicense view` to see it.')],
        ephemeral: true
      });
      return;
    }

    const robloxUsername = interaction.fields.getTextInputValue('roblox_username').trim();
    const fullName = interaction.fields.getTextInputValue('full_name').trim();
    const dateOfBirth = interaction.fields.getTextInputValue('date_of_birth').trim();
    if (!robloxUsername || !fullName || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateOfBirth)) {
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xff3333)
          .setTitle('Could Not Create Driver License')
          .setDescription('Please provide a Roblox username, a name, and a date of birth in `MM/DD/YYYY` format.')],
        ephemeral: true
      });
      return;
    }

    licenses[interaction.user.id] = { robloxUsername, fullName, dateOfBirth };
    saveDriverLicenses(licenses);
    await interaction.reply({ embeds: [driverLicenseEmbed(interaction, licenses[interaction.user.id])], ephemeral: true });
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === 'driverlicense') {
    const licenses = loadDriverLicenses();
    const license = licenses[interaction.user.id];

    if (interaction.options.getSubcommand() === 'create') {
      if (license) {
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xff3333)
            .setTitle('Driver License Already Exists')
            .setDescription('You can only create one driver license. Use `/driverlicense view` to see it.')],
          ephemeral: true
        });
        return;
      }
      await interaction.showModal(driverLicenseModal());
      return;
    }

    if (!license) {
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xffa500)
          .setTitle('No Driver License Found')
          .setDescription('Use `/driverlicense create` to make your one driver license.')],
        ephemeral: true
      });
      return;
    }

    await interaction.reply({ embeds: [driverLicenseEmbed(interaction, license)], ephemeral: true });
    return;
  }

  // Public commands (everyone can use)
  if (interaction.commandName === 'sessionreview') {
    const review = interaction.options.getString('review', true);
    const reviewEmbed = new EmbedBuilder()
      .setColor(0x1683ff)
      .setTitle('Session Review')
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(review)
      .setTimestamp();

    await interaction.deferReply({ ephemeral: true });
    const reviewChannel = await client.channels.fetch(SESSION_REVIEW_CHANNEL_ID);
    if (!reviewChannel?.isTextBased()) {
      await interaction.editReply('The session review channel is unavailable.');
      return;
    }

    await reviewChannel.send({ embeds: [reviewEmbed] });
    await interaction.editReply('Your session review was submitted.');
    return;
  }

  if (interaction.commandName === 'incidentreport') {
    const whatHappened = interaction.options.getString('what_happened', true);
    const evidence = interaction.options.getString('evidence', true);
    const location = interaction.options.getString('location', true);

    const embed = new EmbedBuilder()
      .setColor(0xff3333)
      .setTitle('Incident Report')
      .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .addFields(
        { name: 'What Happened', value: whatHappened },
        { name: 'Evidence', value: evidence },
        { name: 'Location', value: location }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    try {
      const logChannel = await client.channels.fetch(INCIDENT_LOG_CHANNEL_ID);
      if (logChannel?.isTextBased()) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff3333)
              .setTitle('Incident Report Logged')
              .addFields(
                { name: 'Reporter', value: `<@${interaction.user.id}> (${interaction.user.tag})` },
                { name: 'Channel', value: `<#${interaction.channelId}>` },
                { name: 'What Happened', value: whatHappened },
                { name: 'Evidence', value: evidence },
                { name: 'Location', value: location }
              )
              .setTimestamp()
          ]
        });
      }
    } catch (error) {
      console.warn('Could not log incident report:', error.message);
    }
    return;
  }

  if (interaction.commandName === 'addcarspotting') {
    const image = interaction.options.getAttachment('image', true);
    if (image.contentType && !image.contentType.startsWith('image/')) {
      await interaction.reply({ content: 'Please attach an image file.', ephemeral: true });
      return;
    }
    const caption = interaction.options.getString('caption')?.trim();
    const embed = new EmbedBuilder()
      .setColor(0xff3333)
      .setDescription(`**Please react to one of the following reactions if you liked or disliked this post.**${caption ? `\n\n${caption}` : ''}`)
      .setImage(image.url)
      .setTimestamp();

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    carSpottings.push({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      messageId: message.id,
      authorId: interaction.user.id,
      imageUrl: image.url,
      caption: caption || '',
      createdTimestamp: message.createdTimestamp
    });
    saveCarSpottings();
    await message.react(CHECK_MARK);
    await message.react(RED_X);
    return;
  }

  if (interaction.commandName === PERSONAL_CAR_COLLECTION_COMMAND && interaction.user.id !== ULTIMATE_ADMIN_USER_ID) {
    await interaction.reply({ content: 'You do not have access to this command.', ephemeral: true });
    return;
  }

  if (interaction.commandName === 'carcollection' || interaction.commandName === PERSONAL_CAR_COLLECTION_COMMAND) {
    const selectedUser = interaction.options.getUser('user') ?? interaction.user;
    const records = carSpottings
      .filter((record) => record.guildId === interaction.guildId && record.authorId === selectedUser.id)
      .sort((first, second) => second.createdTimestamp - first.createdTimestamp);

    const isPrivateCarCollection = interaction.commandName === PERSONAL_CAR_COLLECTION_COMMAND;
    if (!(await safeDeferReply(interaction, { ephemeral: isPrivateCarCollection }))) return;
    if (records.length === 0) {
      await safeEditReply(interaction, `${selectedUser.id === interaction.user.id ? 'You have' : `${selectedUser.username} has`} not added any car spotting posts yet.`);
      return;
    }

    const embeds = await carCollectionEmbeds(records);
    if (embeds.length === 0) {
      await safeEditReply(interaction, `${selectedUser.id === interaction.user.id ? 'Your' : `${selectedUser.username}'s`} car spotting posts are no longer available.`);
      return;
    }

    const batches = [];
    for (let index = 0; index < embeds.length; index += 3) {
      batches.push(embeds.slice(index, index + 3));
    }
    await safeEditReply(interaction, {
      content: `${selectedUser.id === interaction.user.id ? 'Your' : `${selectedUser.username}'s`} car collection (${embeds.length} post${embeds.length === 1 ? '' : 's'}):`,
      embeds: batches[0]
    });
    for (const batch of batches.slice(1)) {
      await interaction.followUp({ embeds: batch, ephemeral: isPrivateCarCollection });
    }
    return;
  }

  if (interaction.commandName === 'ytstats') {
    if (!(await safeDeferReply(interaction))) return;
    try {
      const stats = await refreshYouTubeChannelStats();
      await safeEditReply(interaction, { embeds: [youtubeStatsEmbed(stats)] });
    } catch (error) {
      console.error('Could not fetch YouTube stats:', error.message);
      await safeEditReply(interaction, 'YouTube stats are temporarily unavailable. Please try again later.');
    }
    return;
  }

  if (interaction.commandName === 'aboutspeedy') {
    if (!(await safeDeferReply(interaction))) return;
    try {
      const stats = await refreshYouTubeChannelStats();
      await safeEditReply(interaction, { embeds: [aboutSpeedyEmbed(stats)] });
    } catch (error) {
      console.error('Could not fetch YouTube stats for aboutspeedy:', error.message);
      await safeEditReply(interaction, { embeds: [aboutSpeedyEmbed({})] });
    }
    return;
  }

  if (interaction.commandName === WEEKLY_REPORT_COMMAND) {
    if (!canUseRestrictedCommands(interaction)) {
      await interaction.reply({ content: 'You do not have access to this command.', ephemeral: true });
      return;
    }
    if (interaction.guildId !== WEEKLY_REPORT_GUILD_ID) {
      await interaction.reply({ content: 'This command is only available in this server.', ephemeral: true });
      return;
    }

    if (!(await safeDeferReply(interaction, { ephemeral: false }))) return;
    try {
      const report = await collectWeeklyActivity(interaction.guild, mondayAtUtc(new Date()));
      const reportId = `${interaction.guildId}-${Date.now()}`;
      weeklyReports.set(reportId, report);
      await safeEditReply(interaction, {
        embeds: [weeklyReportEmbed(report)],
        components: [weeklyReportButton(reportId)],
        allowedMentions: { parse: [] }
      });
    } catch (error) {
      console.error('Could not build weekly report:', error.message);
      await safeEditReply(interaction, 'I could not build the weekly report. Check that I can read the server channels.');
    }
    return;
  }

  // Staff-only commands
  if (interaction.commandName === 'start' || interaction.commandName === 'end') {
    if (!canUseRestrictedCommands(interaction)) {
      await interaction.reply({ content: 'You do not have access to this command.', ephemeral: true });
      return;
    }
  } else if (!hasStaffRole(interaction)) {
    await interaction.reply({ content: 'You need the Speedyboy1 Community staff role to use this command.', ephemeral: true });
    return;
  }

  try {
    if (interaction.commandName === 'start' && interaction.options.getSubcommandGroup() === 'up' && interaction.options.getSubcommand() === 'initiate') {
      if (sessions.has(interaction.guildId)) {
        await safeReply(interaction, { content: 'A session is already active in this server.', ephemeral: true });
        return;
      }
      const requiredReactions = interaction.options.getInteger('reactions', true);
      const description = interaction.options.getString('description');
      const payload = startupEmbed(interaction, requiredReactions, 'Not able to start', description);
      const message = await interaction.reply({
        content: `<@&${SESSION_PING_ROLE_ID}>`,
        embeds: [payload.embed],
        files: payload.files,
        fetchReply: true,
        allowedMentions: { parse: ['roles'] }
      }).catch((error) => {
        if (isUnknownInteractionError(error)) return null;
        throw error;
      });
      if (!message) return;
      const session = {
        hostId: interaction.user.id,
        hostTag: interaction.user.tag,
        requiredReactions,
        description: description?.trim() ?? '',
        notified: false,
        messageId: message.id,
        ready: false,
        releaseMessageId: null,
        releaseLink: null
      };
      sessions.set(interaction.guildId, session);
      try {
        await message.react(CHECK_MARK);
        await refreshStartup(message, session);
      } catch (error) {
        sessions.delete(interaction.guildId);
        console.error('Could not finish session startup setup:', error);
      }
      return;
    }

    if (interaction.commandName === 'start' && interaction.options.getSubcommandGroup() === 'up' && interaction.options.getSubcommand() === 'release') {
      const session = sessions.get(interaction.guildId);
      if (!session) {
        await interaction.reply({ content: 'Start a session reaction check before releasing the private server link.', ephemeral: true });
        return;
      }
      const speedLimit = interaction.options.getInteger('speed_limit', true);
      const link = interaction.options.getString('link', true);
      const drifting = interaction.options.getString('drifting', true);
      const description = interaction.options.getString('description');
      const { embed, files } = releaseEmbed(interaction, speedLimit, drifting, description);
      const releaseMessage = await interaction.reply({
        content: `<@&${SESSION_PING_ROLE_ID}>`,
        embeds: [embed],
        files,
        components: session.ready ? [releaseButton()] : [],
        fetchReply: true,
        allowedMentions: { parse: ['roles'] }
      });
      session.releaseMessageId = releaseMessage.id;
      session.releaseLink = link;
      return;
    }

    if (interaction.commandName === 'end') {
      const duration = interaction.options.getString('duration', true);
      const session = sessions.get(interaction.guildId);
      sessions.delete(interaction.guildId);

      const endReply = await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1683ff)
            .setTitle('Speedyboy1\'s Community | Session Ended')
            .setDescription(`Session ended by <@${interaction.user.id}>.`)
            .addFields({ name: 'Duration', value: duration })
            .setTimestamp()
        ],
        fetchReply: true
      });

      try {
        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: 100 });
        const sessionMessages = messages.filter((msg) => {
          if (msg.id === endReply.id) return false;
          if (session && msg.id === session.messageId) return true;
          if (session?.releaseMessageId && msg.id === session.releaseMessageId) return true;
          return msg.author.id === client.user.id;
        });

        for (const [, msg] of sessionMessages) {
          await msg.delete().catch(() => {});
        }
      } catch (error) {
        console.warn('Could not delete session messages:', error.message);
      }
    }
  } catch (error) {
    console.error(error);
    const response = { content: 'Something went wrong while handling that command.', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) await safeFollowUp(interaction, response);
      else await safeReply(interaction, response);
    } catch (responseError) {
      console.error('Could not send interaction error response:', responseError);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (!message.content.startsWith('?purge')) return;

  const [command, amountText, ...extraArguments] = message.content.trim().split(/\s+/);
  if (command !== '?purge' || extraArguments.length > 0 || !/^\d+$/.test(amountText ?? '')) {
    await message.reply('Usage: `?purge <number>`');
    return;
  }

  const amount = Number(amountText);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000) {
    await message.reply('Choose a number from 1 to 1000.');
    return;
  }

  const canManageMessages = message.member?.permissions?.has(PermissionFlagsBits.ManageMessages) ?? false;
  if (!hasStaffRole(message) || (!canManageMessages && message.author.id !== ULTIMATE_ADMIN_USER_ID)) {
    await message.reply('You need the Speedyboy1 Community staff role and Manage Messages permission to use this command.');
    return;
  }

  try {
    const deletedCount = await purgeMessages(message, amount);
    const confirmation = await message.channel.send(`Purged ${deletedCount} message${deletedCount === 1 ? '' : 's'}.`);
    setTimeout(() => confirmation.delete().catch(() => {}), 5000);
  } catch (error) {
    console.error('Could not purge messages:', error);
    await message.channel.send('I could not purge those messages. Check that I have Manage Messages permission.');
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (user.bot) return;
  const session = sessions.get(reaction.message.guildId);
  if (!session || reaction.message.id !== session.messageId || reaction.emoji.name !== CHECK_MARK) return;
  await refreshStartup(reaction.message, session);
});

client.on('messageReactionRemove', async (reaction) => {
  if (reaction.partial) await reaction.fetch();
  const session = sessions.get(reaction.message.guildId);
  if (!session || reaction.message.id !== session.messageId || reaction.emoji.name !== CHECK_MARK) return;
  await refreshStartup(reaction.message, session);
});

client.login(TOKEN);
