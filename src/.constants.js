module.exports = Object.freeze({
  TOKEN: 'bot_token',
  ARIA_DOWNLOAD_LOCATION: '/home/user/path/to/download/dir (no trailing "/")',
  ARIA_DOWNLOAD_LOCATION_ROOT: '/', //The mountpoint that contains ARIA_DOWNLOAD_LOCATION
  GDRIVE_PARENT_DIR_ID: 'id_of_Drive_folder_to_upload_into',
  OTHER_GDRIVE_DIR_IDS: [], // This is needed if u want to look for files in multiple dirs on list command
  SUDO_USERS: [012, 345],	// Telegram user IDs. These users can use the bot in any chat.
  AUTHORIZED_CHATS: [678, 901],	// Telegram chat IDs. Anyone in these chats can use the bot.
  STATUS_UPDATE_INTERVAL_MS: 12000, // A smaller number will update faster, but might cause rate limiting
  DRIVE_FILE_PRIVATE: {
    ENABLED: false,
    EMAILS: ['someMail@gmail.com', 'someOtherMail@gmail.com']
  },
  COMMANDS_USE_BOT_NAME: {
    ENABLED: false,  // If true, all commands except '/list' has to have the bot username after the command
    NAME: "@nameOf_bot"
  },
  IS_TEAM_DRIVE: false,
  USE_SERVICE_ACCOUNT: false,
  INDEX_DOMAIN: "",
  TELEGRAPH_TOKEN: '' // Telegraph token, if you want to show search results in telegra.ph else keep it blank
});
