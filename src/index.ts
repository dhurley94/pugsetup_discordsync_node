import { readFileSync } from 'jsonfile';
import { join } from 'path';
import * as appRootPathLib from 'app-root-path';
import * as Eris from 'eris';
import { URL } from 'url';
import * as _ from 'lodash';
import * as debug from 'debug';
import * as express from 'express';
import * as bodyParser from 'body-parser';

const log = debug('discord');
const steamIDLib = require('steamid');

const appRootPath = appRootPathLib.toString();
const configPath = join(appRootPath, 'config', 'discord.json');
const config = readFileSync(configPath);

const bot = new Eris.Client(config.token);
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));

app.post('/', (req, res) => {
  const { body } = req;

  if (body.state === 'start') {
    const { cts, ts } = body;
    startOfMatch(cts, ts);
  }

  if (body.state === 'end') {
    endOfMatch();
  }

  res.send('Success');
});

bot.on('ready', () => {
  app.listen(3535, () => {
    console.log('listening on port 3535!');
  });
});

function startOfMatch(cts: string, ts: string) {

  const ctIDs = JSON.parse(cts);
  const tIDs = JSON.parse(ts);

  const guild = bot.guilds.find((guild) => {
    return guild.id === config.guildID;
  });

  const mainVoice = guild.channels.find((channel) => {
    return channel.id === config.mainChannelID;
  }) as any;

  const mainMembers = Array.from(mainVoice.voiceMembers);

  _.each(mainMembers, async (m: any) => {
    const [id, member] = m;
    const profile = await member.user.getProfile();
    const accounts = profile.connected_accounts;

    const steam = _.find(accounts, {
      type: 'steam',
    });

    if (steam) {
      const sid = new steamIDLib(steam.id);
      sid.instance = steamIDLib.Instance.DESKTOP;
      const steamID = sid.getSteamID64();

      if (ctIDs.includes(steamID)) {
        await moveMemberToChannel(member, config.ctChannelID);
      }

      if (tIDs.includes(steamID)) {
        await moveMemberToChannel(member, config.tChannelID);
      }
    }
  });
}

function endOfMatch() {
  const guild = bot.guilds.find((guild) => {
    return guild.id === config.guildID;
  });

  const ctsVoice = guild.channels.find((channel) => {
    return channel.id === config.ctChannelID;
  }) as any;

  const tsVoice = guild.channels.find((channel) => {
    return channel.id === config.tChannelID;
  }) as any;

  const ctsMembers = Array.from(ctsVoice.voiceMembers);
  const tsMembers = Array.from(tsVoice.voiceMembers);

  _.each(ctsMembers, async (m: any) => {
    const [id, member] = m;
    await moveMemberToChannel(member, config.mainChannelID);
  });

  _.each(tsMembers, async (m: any) => {
    const [id, member] = m;
    await moveMemberToChannel(member, config.mainChannelID);
  });
}

async function moveMemberToChannel(member: any, channelID: string) {
  await member.edit({
    channelID,
  }).catch((e: any) => {
    console.error(e);
  });
}

bot.connect();
