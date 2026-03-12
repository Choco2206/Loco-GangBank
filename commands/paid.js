const { SlashCommandBuilder } = require('discord.js');
const { readJson, writeJson, generateId } = require('../utils/helpers');
const { updateOverview } = require('../utils/overview');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zahlung')
    .setDescription('Trägt eine Zahlung ein oder markiert eine Strafe als bezahlt')

    .addUserOption(option =>
      option
        .setName('spieler')
        .setDescription('Spieler, für den die Zahlung eingetragen wird')
        .setRequired(true)
    )

    .addStringOption(option =>
      option
        .setName('grund')
        .setDescription('Art der Zahlung')
        .setRequired(true)
        .addChoices(
          { name: 'Jahresbeitrag', value: 'jahresbeitrag' },
          { name: 'Sonderzahlung', value: 'sonderzahlung' },
          { name: 'Strafe bezahlen', value: 'strafe_bezahlen' }
        )
    )

    .addIntegerOption(option =>
      option
        .setName('betrag')
        .setDescription('Betrag in Euro, nur bei Jahresbeitrag oder Sonderzahlung nötig')
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
    const grund = interaction.options.getString('grund');
    const manuellerBetrag = interaction.options.getInteger('betrag');
    const notiz = interaction.options.getString('notiz');

    const config = readJson('data/config.json', {});
    const transactions = readJson('data/transactions.json', []);

    const transaktionenChannel = await client.channels.fetch(
      process.env.GANGBANK_TRANSACTIONS_CHANNEL_ID
    );

    if (grund === 'jahresbeitrag') {
      const betrag = manuellerBetrag ?? config.yearlyFee ?? 12;

      const bereitsBezahlt = transactions.some(
        tx =>
          tx.userId === user.id &&
          tx.reason === 'jahresbeitrag' &&
          tx.status === 'bezahlt'
      );

      if (bereitsBezahlt) {
        return interaction.reply({
          content: `❌ ${user.username} hat den Jahresbeitrag bereits als bezahlt eingetragen.`,
          ephemeral: true
        });
      }

      const neueTransaktion = {
        id: generateId('txn'),
        userId: user.id,
        name: user.username,
        type: 'income',
        amount: betrag,
        reason: 'jahresbeitrag',
        note: notiz || 'Jahresbeitrag',
        status: 'bezahlt'
      };

      transactions.push(neueTransaktion);
      writeJson('data/transactions.json', transactions);

      if (transaktionenChannel) {
        await transaktionenChannel.send(
          `📒 **Neue Zahlung eingetragen**\n\n` +
          `Spieler: <@${user.id}>\n` +
          `Typ: Jahresbeitrag\n` +
          `Betrag: ${betrag} €\n` +
          `Status: bezahlt` +
          `${notiz ? `\nNotiz: ${notiz}` : ''}`
        );
      }

      await updateOverview(client);

      return interaction.reply({
        content: `✅ Jahresbeitrag für ${user.username} wurde als bezahlt eingetragen.`,
        ephemeral: true
      });
    }

    if (grund === 'sonderzahlung') {
      if (!manuellerBetrag || manuellerBetrag <= 0) {
        return interaction.reply({
          content: '❌ Bei einer Sonderzahlung musst du einen gültigen Betrag angeben.',
          ephemeral: true
        });
      }

      const neueTransaktion = {
        id: generateId('txn'),
        userId: user.id,
        name: user.username,
        type: 'income',
        amount: manuellerBetrag,
        reason: 'sonderzahlung',
        note: notiz || 'Sonderzahlung',
        status: 'bezahlt'
      };

      transactions.push(neueTransaktion);
      writeJson('data/transactions.json', transactions);

      if (transaktionenChannel) {
        await transaktionenChannel.send(
          `📒 **Neue Zahlung eingetragen**\n\n` +
          `Spieler: <@${user.id}>\n` +
          `Typ: Sonderzahlung\n` +
          `Betrag: ${manuellerBetrag} €\n` +
          `Status: bezahlt` +
          `${notiz ? `\nNotiz: ${notiz}` : ''}`
        );
      }

      await updateOverview(client);

      return interaction.reply({
        content: `✅ Sonderzahlung für ${user.username} wurde eingetragen.`,
        ephemeral: true
      });
    }

    if (grund === 'strafe_bezahlen') {
      const offeneStrafen = transactions.filter(
        tx =>
          tx.userId === user.id &&
          tx.reason === 'strafe' &&
          tx.status === 'offen'
      );

      if (offeneStrafen.length === 0) {
        return interaction.reply({
          content: `❌ ${user.username} hat aktuell keine offene Strafe.`,
          ephemeral: true
        });
      }

      const letzteOffeneStrafe = offeneStrafen[offeneStrafen.length - 1];
      letzteOffeneStrafe.status = 'bezahlt';

      if (notiz) {
        letzteOffeneStrafe.note = `${letzteOffeneStrafe.note} | bezahlt: ${notiz}`;
      }

      writeJson('data/transactions.json', transactions);

      if (transaktionenChannel) {
        await transaktionenChannel.send(
          `📒 **Strafe als bezahlt markiert**\n\n` +
          `Spieler: <@${user.id}>\n` +
          `Grund: ${letzteOffeneStrafe.note}\n` +
          `Betrag: ${letzteOffeneStrafe.amount} €\n` +
          `Status: bezahlt`
        );
      }

      await updateOverview(client);

      return interaction.reply({
        content: `✅ Offene Strafe von ${user.username} wurde als bezahlt markiert.`,
        ephemeral: true
      });
    }

    return interaction.reply({
      content: '❌ Ungültige Zahlungsart.',
      ephemeral: true
    });
  }
};