const { SlashCommandBuilder } = require('discord.js');
const { readJson, writeJson, generateId } = require('../utils/helpers');
const { updateOverview } = require('../utils/overview');
const { getCurrentYear } = require('../utils/year');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strafe')
    .setDescription('Trägt eine Strafe für einen Spieler ein')
    .addUserOption(option =>
      option
        .setName('spieler')
        .setDescription('Spieler der die Strafe bekommt')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('grund')
        .setDescription('Grund der Strafe')
        .setRequired(true)
        .addChoices(
          { name: 'Zu spätes Absagen', value: 'spaetes_absagen' },
          { name: 'Pflicht-Umfrage nicht abgestimmt', value: 'pflicht_umfrage_nicht_abgestimmt' },
          { name: 'Zusage nicht erschienen', value: 'zusage_nicht_erschienen' },
          { name: 'Rote Karte im Pflichtspiel', value: 'rote_karte_pflichtspiel' },
          { name: 'Sonstige Strafe', value: 'sonstige_strafe' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('betrag')
        .setDescription('Nur bei sonstiger Strafe: Betrag in Euro')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('notiz')
        .setDescription('Optionale Notiz')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const user = interaction.options.getUser('spieler');
    const grundKey = interaction.options.getString('grund');
    const manuellerBetrag = interaction.options.getInteger('betrag');
    const notiz = interaction.options.getString('notiz');

    const config = readJson('data/config.json', {});
    const transactions = readJson('data/transactions.json', []);
    const currentYear = getCurrentYear();

    const strafe = config.fineCatalog.find(f => f.key === grundKey);

    if (!strafe) {
      return interaction.reply({
        content: '❌ Strafgrund nicht gefunden.',
        ephemeral: true
      });
    }

    let betrag = strafe.amount;
    let grundText = strafe.label;

    if (grundKey === 'sonstige_strafe') {
      if (!manuellerBetrag || manuellerBetrag <= 0) {
        return interaction.reply({
          content: '❌ Bei "Sonstige Strafe" musst du einen Betrag angeben.',
          ephemeral: true
        });
      }

      betrag = manuellerBetrag;
    }

    const neueTransaktion = {
      id: generateId('txn'),
      userId: user.id,
      name: user.username,
      type: 'income',
      amount: betrag,
      reason: 'strafe',
      note: notiz ? `${grundText} | ${notiz}` : grundText,
      status: 'offen',
      year: currentYear
    };

    transactions.push(neueTransaktion);
    writeJson('data/transactions.json', transactions);

    const strafenChannel = await client.channels.fetch(process.env.GANGBANK_STRAFEN_CHANNEL_ID);
    const transaktionenChannel = await client.channels.fetch(process.env.GANGBANK_TRANSACTIONS_CHANNEL_ID);

    if (strafenChannel) {
      await strafenChannel.send(
        `⚖️ **Neue Strafe**\n\n` +
        `Spieler: <@${user.id}>\n` +
        `Grund: ${grundText}\n` +
        `Jahr: ${currentYear}\n` +
        `Betrag: ${betrag} €\n` +
        `Status: offen`
      );
    }

    if (transaktionenChannel) {
      await transaktionenChannel.send(
        `📒 **Neue Forderung eingetragen**\n\n` +
        `Spieler: <@${user.id}>\n` +
        `Typ: Strafe\n` +
        `Jahr: ${currentYear}\n` +
        `Grund: ${grundText}\n` +
        `Betrag: ${betrag} €\n` +
        `Status: offen`
      );
    }

    await updateOverview(client);

    await interaction.reply({
      content: `✅ Strafe ${currentYear} für ${user.username} wurde eingetragen.`,
      ephemeral: true
    });
  }
};