import { readFileSync } from 'jsonfile';
import { join } from 'path';
import * as appRootPathLib from 'app-root-path';
import { Client } from 'eris';
import { URL } from 'url';
import * as _ from 'lodash';
import * as debug from 'debug';
import * as express from 'express';
import * as bodyParser from 'body-parser';

const log = debug('discord');
const steamIdLib = require('steamid');

const appRootPath = appRootPathLib.toString();
const configPath = join(appRootPath, 'config', 'discord.json');
const config = readFileSync(configPath);

const bot = new Client(config.token);
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));

app.post('/', (req, res) => {
  const { body } = req;

  if (body.state === 'start') {
    const { cts, ts } = body;

    const ctIds = JSON.parse(cts);
    const tIds = JSON.parse(ts);

    const guild = bot.guilds.find((guild) => {
      return guild.id === config.guildId;
    });

    const mainVoice = guild.channels.find((channel) => {
      return channel.id === config.mainChannelId;
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
        const sid = new steamIdLib(steam.id);
        sid.instance = steamIdLib.Instance.DESKTOP;
        const steamId = sid.getSteamID64();

        if (ctIds.includes(steamId)) {
          await member.edit({
            channelID: config.ctChannelId,
          }).catch((e: any) => {
            console.error(e);
          });
        }

        if (tIds.includes(steamId)) {
          await member.edit({
            channelID: config.tChannelId,
          }).catch((e: any) => {
            console.error(e);
          });
        }
      }
    });

  }

  if (body.state === 'end') {
    const guild = bot.guilds.find((guild) => {
      return guild.id === config.guildId;
    });

    const ctsVoice = guild.channels.find((channel) => {
      return channel.id === config.ctChannelId;
    }) as any;

    const tsVoice = guild.channels.find((channel) => {
      return channel.id === config.tChannelId;
    }) as any;

    const ctsMembers = Array.from(ctsVoice.voiceMembers);
    const tsMembers = Array.from(tsVoice.voiceMembers);

    _.each(ctsMembers, async (m: any) => {
      const [id, member] = m;
      await member.edit({
        channelID: config.mainChannelId,
      }).catch((e: any) => {
        console.error(e);
      });
    });

    _.each(tsMembers, async (m: any) => {
      const [id, member] = m;
      await member.edit({
        channelID: config.mainChannelId,
      }).catch((e: any) => {
        console.error(e);
      });
    });
  }

  res.send('Success');
});

bot.on('ready', () => {
  app.listen(3535, () => {
    console.log('listening on port 3535!');
  });
});

bot.connect();