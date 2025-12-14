import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { log } from '../utils/log';

/**
 * Registra todos os Slash Commands no Discord
 * Deve ser executado uma vez para registrar os comandos no servidor Discord
 */
export async function registerSlashCommands(token: string, clientId: string, guildId?: string) {
  const commands = [
    // Comandos de Admin
    new SlashCommandBuilder().setName('help').setDescription('Lista de comandos disponiveis'),

    new SlashCommandBuilder().setName('info').setDescription('Informacoes do servidor'),

    new SlashCommandBuilder().setName('meminfo').setDescription('Uso de CPU e memoria'),

    new SlashCommandBuilder().setName('metrics').setDescription('Metricas das salas'),

    new SlashCommandBuilder()
      .setName('open')
      .setDescription('Abrir uma sala')
      .addStringOption((option) =>
        option.setName('bot').setDescription('Nome do bot a abrir').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('token').setDescription('Token do Haxball').setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('setting')
          .setDescription('Configuracao customizada (opcional)')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('close')
      .setDescription('Fechar uma sala')
      .addStringOption((option) =>
        option
          .setName('pid')
          .setDescription('PID da sala ou "all" para fechar todas')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('reload')
      .setDescription('Recarregar configuracao do servidor'),

    new SlashCommandBuilder().setName('exit').setDescription('Desligar servidor'),

    new SlashCommandBuilder().setName('tokenlink').setDescription('Link para obter token Haxball'),

    // Comandos de Autenticacao (publicos)
    new SlashCommandBuilder()
      .setName('register')
      .setDescription('Criar conta CIRS')
      .addStringOption((option) =>
        option.setName('nick').setDescription('Seu nick do Haxball').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('senha').setDescription('Senha para sua conta').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('linkdiscord')
      .setDescription('Vincular Discord a conta existente')
      .addStringOption((option) =>
        option.setName('nick').setDescription('Seu nick do Haxball').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('senha').setDescription('Senha da sua conta').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('profile')
      .setDescription('Ver perfil de jogador')
      .addStringOption((option) =>
        option
          .setName('nick')
          .setDescription('Nick do jogador (deixe vazio para ver o seu)')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('ranking')
      .setDescription('Ver ranking de jogador')
      .addStringOption((option) =>
        option
          .setName('nick')
          .setDescription('Nick do jogador (deixe vazio para ver o seu)')
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('top')
      .setDescription('Ver top 10 jogadores')
      .addStringOption((option) =>
        option
          .setName('criterio')
          .setDescription('Ordenar por pontos ou ranking')
          .setRequired(false)
          .addChoices({ name: 'Ranking', value: 'ranking' }, { name: 'Pontos', value: 'pontos' })
      ),

    new SlashCommandBuilder()
      .setName('authhelp')
      .setDescription('Ajuda sobre sistema de autenticacao'),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    log('DISCORD', `Iniciando registro de ${commands.length} slash commands...`);

    // Limpa TODOS os comandos antigos (guild E global) para prevenir duplicacao
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      log('DISCORD', 'Comandos guild antigos removidos.');
    }
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    log('DISCORD', 'Comandos globais antigos removidos.');

    if (guildId) {
      // Registro em servidor especifico (mais rapido para testes)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      log('DISCORD', `Slash commands registrados no servidor ${guildId}!`);
    } else {
      // Registro global (pode levar ate 1 hora para propagar)
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      log('DISCORD', 'Slash commands registrados globalmente!');
    }

    return true;
  } catch (error) {
    console.error('Erro ao registrar slash commands:', error);
    return false;
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
