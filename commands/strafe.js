const { SlashCommandBuilder } = require('discord.js');
const { readJson, writeJson, generateId } = require('../utils/helpers');
const { updateOverview } = require('../utils/overview');
const { getCurrentYear } = require('../utils/year');

const DEFAULT_FINE_CATALOG = [
  {
    key: 'spaetes_absagen',
    label: 'Zu spätes Absagen trotz Zusage (unter 60 Minuten)',
    amount: 1
  },
  {
    key: 'pflicht_umfrage_nicht_abgestimmt',
    label: 'Nicht abstimmen bei Pflicht-Umfragen',
    amount: 1
  },
  {
    key: 'zusage_nicht_erschienen',
    label: 'Zusagen und nicht erscheinen',
    amount: 5
  },
  {
    key: 'rote_karte_pflichtspiel',
    label: 'Rote Karte im Pflichtspiel',
    amount: 2
  },
  {
    key: 'sonstige_strafe',
    label: 'Sonstige Strafe',
    amount: 0
  }
];

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
    try {
      const user = interaction.options.getUser('spieler');
      const grundKey = interaction.options.getString('grund');
      const manuellerBetrag = interaction.options.getInteger('betrag');
      const notiz = interaction.options.getString('notiz');

      const config = readJson('data/config.json', {});
      const transactions = readJson('data/transactions.json', []);
      const currentYear = getCurrentYear();

      const fineCatalog =
        Array.isArray(config.fineCatalog) && config.fineCatalog.length > 0
          ? config.fineCatalog
          : DEFAULT_FINE_CATALOG;

      const strafe = fineCatalog.find(f => f.key === grundKey);

      if (!strafe) {
        return interaction.reply({
          content: `❌ Strafgrund nicht gefunden. Discord hat gesendet: ${grundKey}`,
          ephemeral: true
        });
      }

      let betrag = strafe.amount;
      const grundText = strafe.label;

      if (grundKey === 'sonstige_strafe') {
        if (!manuellerBetrag || manuellerBetrag <= 0) {
          return interaction.reply({
            content: '❌ Bei "Sonstige Strafe" musst du einen gültigen Betrag angeben.',
            ephemeral: true
          });
        }

        betrag = manuellerBetrag;
      }

      const strafenChannel = await client.channels.fetch(process.env.GANGBANK_STRAFEN_CHANNEL_ID);
      const transaktionenChannel = await client.channels.fetch(process.env.GANGBANK_TRANSACTIONS_CHANNEL_ID);

      let strafenMessage = null;

      if (strafenChannel) {
        strafenMessage = await strafenChannel.send(
          `⚖️ **Neue Strafe**\n\n` +
          `Spieler: <@${user.id}>\n` +
          `Grund: ${grundText}\n` +
          `Jahr: ${currentYear}\n` +
          `Betrag: ${betrag} €\n` +
          `Status: offen` +
          `${notiz ? `\nNotiz: ${notiz}` : ''}`
        );
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
        year: currentYear,
        strafenMessageId: strafenMessage ? strafenMessage.id : null,
        strafenChannelId: strafenChannel ? strafenChannel.id : null
      };

      transactions.push(neueTransaktion);
      writeJson('data/transactions.json', transactions);

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

      return interaction.reply({
        content: `✅ Strafe für ${user.username} wurde eingetragen.`,
        ephemeral: true
      });
    } catch (error) {
      console.error('❌ Fehler in /strafe:', error);

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({
          content: '❌ Beim Eintragen der Strafe ist ein Fehler aufgetreten.',
          ephemeral: true
        });
      }

      return interaction.reply({
        content: '❌ Beim Eintragen der Strafe ist ein Fehler aufgetreten.',
        ephemeral: true
      });
    }
  }
};