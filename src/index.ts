import TelegramBot = require('node-telegram-bot-api');
import downloadUtils = require('./download_tools/utils');
import constants = require('./.constants');
import msgTools = require('./bot_utils/msg-tools');
import driveList = require('./drive/drive-list');
import driveDownload = require('./drive/drive-tar');
import { EventRegex } from './bot_utils/event_regex';
import checkDiskSpace = require('check-disk-space');
import gdUtils = require('./drive/gd-utils');
import { readFile, writeFile } from 'fs-extra';

const telegraph = require('telegraph-node')
const ph = new telegraph();
const eventRegex = new EventRegex();
const bot = new TelegramBot(constants.TOKEN, { polling: true });
const Heroku = require('heroku-client')
const heroku = new Heroku({ token: process.env.HEROKU_API_KEY })


if (constants.USE_SERVICE_ACCOUNT && !constants.IS_TEAM_DRIVE) {
  console.log('In order to use Service account for clone the drive should be Team drive. Please set IS_TEAM_DRIVE to true in .constants.js');
}

bot.on("polling_error", msg => console.error(msg.message));

function setEventCallback(regexp: RegExp, regexpNoName: RegExp,
  callback: ((msg: TelegramBot.Message, match?: RegExpExecArray) => void)): void {
  bot.onText(regexpNoName, (msg, match) => {
    // Return if the command didn't have the bot name for non PMs ("Bot name" could be blank depending on config)
    if (msg.chat.type !== 'private' && !match[0].match(regexp))
      return;
    callback(msg, match);
  });
}

setEventCallback(eventRegex.commandsRegex.start, eventRegex.commandsRegexNoName.start, (msg) => {
  if (msgTools.isAuthorized(msg) < 0) {
    msgTools.sendUnauthorizedMessage(bot, msg);
  } else {
    msgTools.sendMessage(bot, msg, 'Welcome to TAR Bot', -1);
  }
});

setEventCallback(eventRegex.commandsRegex.id, eventRegex.commandsRegexNoName.id, (msg) => {
  if (msgTools.isAuthorized(msg) < 0) {
    msgTools.sendUnauthorizedMessage(bot, msg);
  } else {
    msgTools.sendMessage(bot, msg, "This chat's id is: <code>" + msg.chat.id + "</code>", 60000);
  }
});


setEventCallback(eventRegex.commandsRegex.stats, eventRegex.commandsRegexNoName.stats, async (msg) => {
  if (msgTools.isAuthorized(msg) < 0) {
    msgTools.sendUnauthorizedMessage(bot, msg);
  } else {
    try {
      const diskSpace = await checkDiskSpace(constants.ARIA_DOWNLOAD_LOCATION_ROOT);
      const avgCpuLoad = await downloadUtils.getCPULoadAVG();
      const botUptime = downloadUtils.getProcessUptime()

      const usedDiskSpace = diskSpace.size - diskSpace.free;

      msgTools.sendMessage(bot, msg, `Total space: ${downloadUtils.formatSize(diskSpace.size)}\nUsed: ${downloadUtils.formatSize(usedDiskSpace)}\nAvailable: ${downloadUtils.formatSize(diskSpace.free)}\nCPU Load: ${avgCpuLoad}\nBot Uptime: ${botUptime}`);
    } catch (error) {
      console.log('stats: ', error.message);
      msgTools.sendMessage(bot, msg, `Error checking stats: ${error.message}`);
    }
  }
});

setEventCallback(eventRegex.commandsRegex.authorize, eventRegex.commandsRegexNoName.authorize, async (msg) => {
  if (msgTools.isAuthorized(msg) !== 0) {
    msgTools.sendMessage(bot, msg, `This command is only for SUDO_USERS`);
  } else {
    try {
      let alreadyAuthorizedChats: any = await readFile('./authorizedChats.json', 'utf8').catch(async err => {
        if (err.code === 'ENOENT') {
          // create authorizedChats.json
          await writeFile('./authorizedChats.json', JSON.stringify([]));
        } else {
          throw new Error(err);
        }
      });
      if (alreadyAuthorizedChats) {
        alreadyAuthorizedChats = JSON.parse(alreadyAuthorizedChats);
      } else {
        alreadyAuthorizedChats = [];
      }
      const allAuthorizedChats: number[] = constants.AUTHORIZED_CHATS.concat(alreadyAuthorizedChats, constants.SUDO_USERS);
      if (allAuthorizedChats.includes(msg.chat.id)) {
        msgTools.sendMessage(bot, msg, `Chat already authorized.`);
      } else {
        alreadyAuthorizedChats.push(msg.chat.id);
        await writeFile('./authorizedChats.json', JSON.stringify(alreadyAuthorizedChats)).then(() => {
          msgTools.sendMessage(bot, msg, `Chat authorized successfully.`, -1);
        });
      }
    } catch (error) {
      console.log('authorize: ', error.message);
      msgTools.sendMessage(bot, msg, `Error authorizing: ${error.message}`);
    }
  }
});

setEventCallback(eventRegex.commandsRegex.unauthorize, eventRegex.commandsRegexNoName.unauthorize, async (msg) => {
  if (msgTools.isAuthorized(msg) !== 0) {
    msgTools.sendMessage(bot, msg, `This command is only for SUDO_USERS`);
  } else {
    try {
      let alreadyAuthorizedChats: any = await readFile('./authorizedChats.json', 'utf8').catch(err => {
        if (err.code === 'ENOENT') {
          return '';
        } else {
          throw new Error(err);
        }
      });
      if (alreadyAuthorizedChats) {
        alreadyAuthorizedChats = JSON.parse(alreadyAuthorizedChats);
        const index = alreadyAuthorizedChats.indexOf(msg.chat.id);
        if (index > -1) {
          alreadyAuthorizedChats.splice(index, 1);
          await writeFile('./authorizedChats.json', JSON.stringify(alreadyAuthorizedChats)).then(() => {
            msgTools.sendMessage(bot, msg, `Chat unauthorized successfully.`, -1);
          });
        } else {
          msgTools.sendMessage(bot, msg, `Cannot unauthorize this chat. Please make sure this chat was authorized using /authorize command only.`);
        }
      } else {
        msgTools.sendMessage(bot, msg, `No authorized chats found. Please make use this chat was authorized using /authorize command only.`);
      }
    } catch (error) {
      console.log('unauthorize: ', error.message);
      msgTools.sendMessage(bot, msg, `Error unauthorizing: ${error.message}`);
    }
  }
});


setEventCallback(eventRegex.commandsRegex.restart, eventRegex.commandsRegexNoName.restart, async (msg, match) => {
  if (msgTools.isAuthorized(msg) !== 0) {
    msgTools.sendMessage(bot, msg, `This command is only for SUDO_USERS`);
  } else {
    try {
      if (!process.env.HEROKU_API_KEY) {
        msgTools.sendMessage(bot, msg, `Can't restart as <code>HEROKU_API_KEY</code> is not provided`);
      } else {
        let restartingMsg = await bot.sendMessage(msg.chat.id, `Heroku dyno will be restarted now.`, {
          reply_to_message_id: msg.message_id,
          parse_mode: 'HTML'
        });
        await writeFile('./restartObj.json', JSON.stringify({ originalMsg: msg, restartingMsg }));
        const response = await heroku.delete(`/apps/${process.env.HEROKU_APP_NAME}/dynos`);
      }
    } catch (error) {
      console.log("Error while restart: ", error.message);
      msgTools.sendMessage(bot, msg, error.message, 60000);
    }
  }
});


setEventCallback(eventRegex.commandsRegex.list, eventRegex.commandsRegexNoName.list, async (msg, match) => {
  if (msgTools.isAuthorized(msg) < 0) {
    msgTools.sendUnauthorizedMessage(bot, msg);
  } else {
    const searchingMsg = await bot.sendMessage(msg.chat.id, `🔍Searching for files.... Please wait.`, {
      reply_to_message_id: msg.message_id,
      parse_mode: 'HTML'
    });
    driveList.listFiles(match[4], async (err, res) => {
      msgTools.deleteMsg(bot, searchingMsg);
      if (err) {
        msgTools.sendMessage(bot, msg, 'Failed to fetch the list of files');
      } else {
        if (constants.TELEGRAPH_TOKEN) {
          try {
            if (res.length === 0) {
              msgTools.sendMessage(bot, msg, 'There are no files matching your parameters');
              return;
            }
            var g = JSON.stringify(res).replace(/[\[\]\,\"]/g, ''); //stringify and remove all "stringification" extra data
            console.log('Size of telegraph node-->', g.length);
            const telegraPhObj = await createTelegraphPage(res);
            msgTools.sendMessageAsync(bot, msg, `Search results for ${match[4]} 👇🏼`, 60000, false, [{ buttonName: 'Here', url: telegraPhObj.url }]).catch(console.error);
          } catch (error) {
            msgTools.sendMessage(bot, msg, 'Failed to fetch the list of files, Telegra.ph error: ' + error);
          }
        } else {
          msgTools.sendMessage(bot, msg, res.toString(), 60000);
        }
      }
    });
  }
});

async function createTelegraphPage(content: any) {
  return ph.createPage(constants.TELEGRAPH_TOKEN, 'Mirror Bot Search', content, {
    return_content: true,
    author_name: 'TAR Bot',
    author_url: 'https://github.com/Nenokkadine/TarBot'
  });
}

setEventCallback(eventRegex.commandsRegex.tar, eventRegex.commandsRegexNoName.tar, async (msg, match) => {
  if (msgTools.isAuthorized(msg) < 0) {
    msgTools.sendUnauthorizedMessage(bot, msg);
  } else {
    tar(msg, match);
  }
});

setEventCallback(eventRegex.commandsRegex.count, eventRegex.commandsRegexNoName.count, async (msg, match) => {
  if (msgTools.isAuthorized(msg) < 0) {
    msgTools.sendUnauthorizedMessage(bot, msg);
  } else {
    // get the drive filed id from url
    const fileId = downloadUtils.getIdFromUrl(match[4]);
    if (fileId) {
      let countMsg = await bot.sendMessage(msg.chat.id, `Collecting info about ${fileId}，Please wait...`, {
        reply_to_message_id: msg.message_id,
        parse_mode: 'HTML'
      });
      const name = await gdUtils.get_folder_name(fileId);

      const gen_text = (payload: any) => {
        const { obj_count, processing_count, pending_count } = payload || {}
        return `<b>Name:</b> ${name}\n<b>Number of Files:</b> ${obj_count || ''}\n${pending_count ? ('<b>Pending:</b> ' + pending_count) : ''}\n${processing_count ? ('<b>Ongoing:</b> ' + processing_count) : ''}`
      }

      const message_updater = async (payload: any) => await msgTools.editMessage(bot, countMsg, gen_text(payload)).catch(err => console.error(err.message));

      try {
        let countResult = await gdUtils.gen_count_body({ fid: fileId, tg: message_updater });
        let table = countResult.table;
        if (!table) {
          msgTools.deleteMsg(bot, countMsg);
          msgTools.sendMessage(bot, msg, `Failed to obtain info for: ${name}`, 10000);
          return;
        }

        msgTools.deleteMsg(bot, countMsg);
        msgTools.sendMessageAsync(bot, msg, `<b>Source Folder Name:</b> <code>${name}</code>\n<b>Source Folder Link:</b> <code>${match[4]}</code>\n<pre>${table}</pre>`, -1).catch(async err => {
          if (err && ((err.body && err.body.error_code == 413 && err.body.description.includes('Entity Too Large')) || (err.response && err.response.body && err.response.body.error_code == 400 && err.response.body.description.includes('message is too long')))) {
            const limit = 20
            countResult = await gdUtils.gen_count_body({ fid: fileId, limit, smy: countResult.smy });
            table = countResult.table;
            msgTools.sendMessage(bot, msg, `<b>Source Folder Name:</b> <code>${name}</code>\n<b>Source Folder Link:</b> <code>${match[4]}</code>\nThe table is too long and exceeds the telegram message limit, only the first ${limit} will be displayed:\n<pre>${table}</pre>`, -1)
          } else {
            msgTools.sendMessage(bot, msg, err.message, 10000);
          }
        });
      } catch (error) {
        msgTools.deleteMsg(bot, countMsg);
        msgTools.sendMessage(bot, msg, error.message, 10000);
      }

    } else {
      msgTools.sendMessage(bot, msg, `Google drive ID could not be found in the provided link`);
    }
  }
});



async function tar(msg: TelegramBot.Message, match: RegExpExecArray) {
  // get the drive filed id from url
  const driveId = match[4].match(/[-\w]{25,}/);
  const fileId: string = Array.isArray(driveId) && driveId.length > 0 ? driveId[0] : '';
  if (fileId) {
    const tarMsg = await bot.sendMessage(msg.chat.id, `Creating Tar: <code>` + match[4] + `</code>`, {
      reply_to_message_id: msg.message_id,
      parse_mode: 'HTML'
    });

    driveDownload.driveDownloadAndTar(fileId, bot, tarMsg).then((res: string) => {
      msgTools.deleteMsg(bot, tarMsg);
      msgTools.sendMessage(bot, msg, res, -1);
    }).catch(e => {
      msgTools.deleteMsg(bot, tarMsg);
      msgTools.sendMessage(bot, msg, e, 10000);
    });
  } else {
    msgTools.sendMessage(bot, msg, `Google drive ID could not be found in the provided link`);
  }
}


setEventCallback(eventRegex.commandsRegex.help, eventRegex.commandsRegexNoName.help, async (msg, match) => {
  if (msgTools.isAuthorized(msg) < 0) {
    msgTools.sendUnauthorizedMessage(bot, msg);
  } else {
    const text = `
    <b>Command ｜ Description</b>
    ➖➖➖➖➖➖➖➖➖➖➖➖
    <code>/list </code>filename or <code>/l </code>filename <b>|</b> Send links to downloads with the filename substring in the name. In case of too many downloads, only show the most recent few.
    ➖➖➖➖➖➖➖➖➖➖➖➖
    <code>/count </code>driveUrl or <code>/cnt </code>driveUrl <b>|</b> Obtain informations about a drive folder and send it as a table.
    ➖➖➖➖➖➖➖➖➖➖➖➖
    <code>/tar </code>driveUrl or <code>/t </code>driveUrl <b>|</b> Create a tar of drive folder and upload to drive.
    ➖➖➖➖➖➖➖➖➖➖➖➖
    <code>/stats</code> <b>|</b> Send disk information, cpu load of the machine & bot uptime.
    ➖➖➖➖➖➖➖➖➖➖➖➖
    <code>/help</code> or <code>/h</code> <b>|</b> You already know what it does.
    ➖➖➖➖➖➖➖➖➖➖➖➖\n<i>Note: All the above command can also be called using dot(.) instead of slash(/). For e.x: <code>.mirror </code>url or <code>.m </code>url</i>
    `
    msgTools.sendMessage(bot, msg, text, 60000);
  }
});
