import constants = require('../.constants');
import TelegramBot = require('node-telegram-bot-api');
import details = require('../dl_model/detail');
import dlm = require('../dl_model/dl-manager');
import { readFileSync } from 'fs-extra';
var dlManager = dlm.DlManager.getInstance();

export async function deleteMsg(bot: TelegramBot, msg: TelegramBot.Message, delay?: number): Promise<any> {
  if (delay) await sleep(delay);

  bot.deleteMessage(msg.chat.id, msg.message_id.toString())
    .catch(err => {
      console.log(`Failed to delete message. Does the bot have message delete permissions for this chat? ${err.message}`);
    });
}

export function editMessage(bot: TelegramBot, msg: TelegramBot.Message, text: string, suppressError?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (msg && msg.chat && msg.chat.id && msg.message_id) {
      bot.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
         disable_web_page_preview: true,
        parse_mode: 'HTML'
      })
        .then(resolve)
        .catch(err => {
          if (err.message !== suppressError) {
            console.log(`editMessage error: ${err.message}`);
          }
          reject(err);
        });
    } else {
      resolve('');
    }
  });
}

export function sendMessage(bot: TelegramBot, msg: TelegramBot.Message, text: string, delay?: number,
  callback?: (res: TelegramBot.Message) => void, quickDeleteOriginal?: boolean): void {
  if (!delay) delay = 10000;
  bot.sendMessage(msg.chat.id, text, {
    reply_to_message_id: msg.message_id,
    disable_web_page_preview: true,
    parse_mode: 'HTML'
  })
    .then((res) => {
      if (callback) callback(res);
      if (delay > -1) {
        deleteMsg(bot, res, delay);
        if (quickDeleteOriginal) {
          deleteMsg(bot, msg);
        } else {
          deleteMsg(bot, msg, delay);
        }
      }
    })
    .catch((err) => {
      console.error(`sendMessage error: ${err.message}`);
    });
}

export async function sendMessageAsync(bot: TelegramBot, msg: TelegramBot.Message, text: string, delay?: number, quickDeleteOriginal?: boolean, buttons?: [{ buttonName: string, url: string }]) {
  if (!delay) delay = 10000;
  return new Promise((resolve, reject) => {
    let inlineKeyboard: TelegramBot.InlineKeyboardButton[] = [];
    if (buttons && buttons.length > 0) {
      buttons.forEach(button => {
        inlineKeyboard.push({ text: button.buttonName, url: button.url });
      });
    }
    bot.sendMessage(msg.chat.id, text, {
      reply_to_message_id: msg.message_id,
      disable_web_page_preview: true,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [inlineKeyboard]
      }
    })
      .then((res) => {
        if (delay > -1) {
          deleteMsg(bot, res, delay);
          if (quickDeleteOriginal) {
            deleteMsg(bot, msg);
          } else {
            deleteMsg(bot, msg, delay);
          }
        }
        resolve(res);
      })
      .catch((err) => {
        console.error(`sendMessage error: ${err.message}`);
        reject(err);
      });
  });
}

export function sendUnauthorizedMessage(bot: TelegramBot, msg: TelegramBot.Message): void {
  sendMessage(bot, msg, `You aren't authorized to use this bot here.`);
}

export function sendMessageReplyOriginal(bot: TelegramBot, dlDetails: details.DlVars, message: string): Promise<TelegramBot.Message> {
  return bot.sendMessage(dlDetails.tgChatId, message, {
    reply_to_message_id: dlDetails.tgMessageId,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });
}

export function sleep(ms: number): Promise<any> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isAuthorized(msg: TelegramBot.Message, skipDlOwner?: boolean): number {
  for (var i = 0; i < constants.SUDO_USERS.length; i++) {
    if (constants.SUDO_USERS[i] === msg.from.id) return 0;
  }
  if (!skipDlOwner && msg.reply_to_message) {
    var dlDetails = dlManager.getDownloadByMsgId(msg.reply_to_message);
    if (dlDetails && msg.from.id === dlDetails.tgFromId) return 1;
  }

  // Read the authorizedChats.json and concat the value of AUTHORIZED_CHATS from .constants.js and continue with the check
  let alreadyAuthorizedChats: any = '';
  try {
    alreadyAuthorizedChats = readFileSync('./authorizedChats.json', 'utf8');
  } catch (error) {
    alreadyAuthorizedChats = ''; // if there is error while reading the file then just pass null so that the check doesn't fail
  }
  if (alreadyAuthorizedChats) {
    alreadyAuthorizedChats = JSON.parse(alreadyAuthorizedChats);
  } else {
    alreadyAuthorizedChats = [];
  }
  alreadyAuthorizedChats = alreadyAuthorizedChats.concat(constants.AUTHORIZED_CHATS);

  if (alreadyAuthorizedChats.indexOf(msg.chat.id) > -1 &&
    msg.chat.all_members_are_administrators) return 2;
  if (alreadyAuthorizedChats.indexOf(msg.chat.id) > -1) return 3;
  return -1;
}

export function isAdmin(bot: TelegramBot, msg: TelegramBot.Message, callback: (err: string, isAdmin: boolean) => void): void {
  bot.getChatAdministrators(msg.chat.id)
    .then(members => {
      for (var i = 0; i < members.length; i++) {
        if (members[i].user.id === msg.from.id) {
          callback(null, true);
          return;
        }
      }
      callback(null, false);
    })
    .catch(() => {
      callback(null, false);
    });
}

