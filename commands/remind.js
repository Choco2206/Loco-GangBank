const { SlashCommandBuilder } = require('discord.js');
const { sendReminder } = require('../utils/reminder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Sendet einen Reminder für offene Zahlungen in den Reminder-Channel'),

  async execute(interaction, client) {
    await sendReminder(client);

    await interaction.reply({
      content: '✅ Reminder wurde im Reminder-Channel gepostet.',
      ephemeral: true
    });
  }
};