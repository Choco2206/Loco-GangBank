const { SlashCommandBuilder } = require('discord.js');
const { readJson, writeJson, generateId } = require('../utils/helpers');
const { updateOverview } = require('../utils/overview');
const { getCurrentYear } = require('../utils/year');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ausgabe')
    .setDescription('Trägt eine Ausgabe in die GangBank ein')
    .addStringOption(option =>
      option
        .setName('grund')
        .setDescription('Grund der Ausgabe')
        .setRequired(true)
        .addChoices(
          { name: 'Cupgebühr', value: 'cupgebuehr' },
          { name: 'Ligagebühr', value: 'ligagebuehr' },
          { name: 'Liga Premium Funktion', value: 'liga_premium_funktion' },
          { name: 'Geburtstagsgeschenk', value: 'geburtstagsgeschenk' },
          { name: 'Sonstiges', value: 'sonstiges' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('betrag')
        .setDescription('Betrag der Ausgabe in Euro')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('notiz')
        .setDescription('Optionale Zusatznotiz')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const grund = interaction.options.getString('grund');
    const betrag = interaction.options.getInteger('betrag');
    const notiz = interaction.options.getString('notiz');
    const currentYear = getCurrentYear();

    if (!betrag || betrag <= 0) {
      return interaction.reply({
        content: '❌ Bitte gib einen gültigen Betrag größer als 0 an.',
        ephemeral: true
      });
    }

    const transactions = readJson('data/transactions.json', []);
    const transaktionenChannel = await client.channels.fetch(
      process.env.GANGBANK_TRANSACTIONS_CHANNEL_ID
    );

    const labels = {
      cupgebuehr: 'Cupgebühr',
      ligagebuehr: 'Ligagebühr',
      liga_premium_funktion: 'Liga Premium Funktion',
      geburtstagsgeschenk: 'Geburtstagsgeschenk',
      sonstiges: 'Sonstiges'
    };

    const grundText = labels[grund] || grund;

    const neueTransaktion = {
      id: generateId('txn'),
      type: 'expense',
      amount: betrag,
      reason: grund,
      note: notiz || grundText,
      status: 'bezahlt',
      year: currentYear
    };

    transactions.push(neueTransaktion);
    writeJson('data/transactions.json', transactions);

    if (transaktionenChannel) {
      await transaktionenChannel.send(
        `📒 **Neue Ausgabe eingetragen**\n\n` +
        `Grund: ${grundText}\n` +
        `Jahr: ${currentYear}\n` +
        `Betrag: ${betrag} €\n` +
        `Status: bezahlt` +
        `${notiz ? `\nNotiz: ${notiz}` : ''}`
      );
    }

    await updateOverview(client);

    await interaction.reply({
      content: `✅ Ausgabe "${grundText}" für ${currentYear} über ${betrag} € wurde eingetragen.`,
      ephemeral: true
    });
  }
};