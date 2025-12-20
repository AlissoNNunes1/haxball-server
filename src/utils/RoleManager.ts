import { log } from './log';

export type CommandRole = 'master' | 'moderator' | 'user';

export interface RoleConfig {
  canOpenRooms: boolean;
  canCloseRooms: boolean;
  canReload: boolean;
  canExit: boolean;
  canViewMetrics: boolean;
  canManageChampionship: boolean;
}

// Sistema de roles e permissoes para controlar acesso a comandos
export class RoleManager {
  private userRoles: Map<string, CommandRole> = new Map();
  private rolePermissions: Map<CommandRole, RoleConfig> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  // Define permissoes padroes para cada role
  private initializeDefaultRoles(): void {
    this.rolePermissions.set('master', {
      canOpenRooms: true,
      canCloseRooms: true,
      canReload: true,
      canExit: true,
      canViewMetrics: true,
      canManageChampionship: true,
    });

    this.rolePermissions.set('moderator', {
      canOpenRooms: true,
      canCloseRooms: true,
      canReload: false,
      canExit: false,
      canViewMetrics: true,
      canManageChampionship: false,
    });

    this.rolePermissions.set('user', {
      canOpenRooms: false,
      canCloseRooms: false,
      canReload: false,
      canExit: false,
      canViewMetrics: false,
      canManageChampionship: false,
    });

    log('ROLES', 'Sistema de roles inicializado com permissoes padrao');
  }

  // Atribui role a um usuario
  setUserRole(discordId: string, role: CommandRole): void {
    this.userRoles.set(discordId, role);
    log('ROLES', `Usuario ${discordId} atribuido ao role '${role}'`);
  }

  // Obtem role de um usuario
  getUserRole(discordId: string): CommandRole {
    return this.userRoles.get(discordId) || 'user';
  }

  // Verifica se usuario tem permissao para acao especifica
  hasPermission(discordId: string, action: keyof RoleConfig): boolean {
    const role = this.getUserRole(discordId);
    const permissions = this.rolePermissions.get(role);

    if (!permissions) return false;

    return permissions[action] === true;
  }

  // Verifica se usuario e master
  isMaster(discordId: string): boolean {
    return this.getUserRole(discordId) === 'master';
  }

  // Verifica se usuario e moderador ou master
  isModeratorOrAbove(discordId: string): boolean {
    const role = this.getUserRole(discordId);
    return role === 'master' || role === 'moderator';
  }

  // Atribui multiplos moderadores de uma vez
  setModerators(moderatorIds: string[]): void {
    for (const id of moderatorIds) {
      this.setUserRole(id, 'moderator');
    }

    log('ROLES', `${moderatorIds.length} moderador(es) atribuido(s)`);
  }

  // Obtem lista de moderadores
  getModerators(): string[] {
    const moderators: string[] = [];

    for (const [id, role] of this.userRoles.entries()) {
      if (role === 'moderator') {
        moderators.push(id);
      }
    }

    return moderators;
  }

  // Obtem permissoes de um role
  getRolePermissions(role: CommandRole): RoleConfig {
    return this.rolePermissions.get(role) || this.rolePermissions.get('user')!;
  }

  // Customiza permissoes de um role
  setRolePermissions(role: CommandRole, permissions: Partial<RoleConfig>): void {
    const existing = this.rolePermissions.get(role);

    if (existing) {
      this.rolePermissions.set(role, { ...existing, ...permissions });
      log('ROLES', `Permissoes do role '${role}' atualizadas`);
    }
  }

  // Remove user role (volta para 'user' padrao)
  removeUserRole(discordId: string): void {
    this.userRoles.delete(discordId);
    log('ROLES', `Role do usuario ${discordId} removido`);
  }
}

/* ASCII SIGNATURE
  __  ____ ____ _  _ 
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/
*/
