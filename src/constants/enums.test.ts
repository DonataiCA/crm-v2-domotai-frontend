import { describe, it, expect } from 'vitest';

import {
  OrgRole,
  PROJECT_STATUS_OPTIONS,
  ProjectStatus,
  TEAM_ROLES,
  USER_ROLE_OPTIONS,
  UserRole,
  canEditProjects,
  getProjectStatusLabel,
  getTaskStatusLabel,
  getUserRoleLabel,
  isAdminRole,
  isClientRole,
  isProjectInProgress,
  isTeamMemberRole,
  isViewerRole,
  normalizeProjectStatus,
  normalizeRole,
  normalizeTaskPriority,
  normalizeTaskStatus,
  slugifyStage,
} from './enums';
import { getUserRoleBgColor } from './colors';

const PROFILE_ROLES = Object.values(UserRole);

describe('normalizeRole', () => {
  it('lleva cualquier casing a minúscula', () => {
    expect(normalizeRole('Admin')).toBe('admin');
    expect(normalizeRole('ADMIN')).toBe('admin');
    expect(normalizeRole('admin')).toBe('admin');
  });

  it('recorta espacios sobrantes', () => {
    expect(normalizeRole('  admin  ')).toBe('admin');
    expect(normalizeRole(' ADMIN ')).toBe('admin');
  });

  it('unifica espacios y guiones en guion bajo', () => {
    expect(normalizeRole('On Hold')).toBe('on_hold');
    expect(normalizeRole('free-lancer')).toBe('free_lancer');
  });

  it('devuelve cadena vacía para valores ausentes', () => {
    expect(normalizeRole(null)).toBe('');
    expect(normalizeRole(undefined)).toBe('');
    expect(normalizeRole('')).toBe('');
    expect(normalizeRole('   ')).toBe('');
  });

  it('es idempotente sobre valores ya canónicos', () => {
    for (const role of PROFILE_ROLES) {
      expect(normalizeRole(role)).toBe(role);
    }
  });
});

describe('catálogo', () => {
  it('declara los cinco roles de perfil en minúscula', () => {
    expect(PROFILE_ROLES.sort()).toEqual(['admin', 'client', 'freelancer', 'salesman', 'viewer']);
  });

  it('declara los tres roles de organización', () => {
    expect(Object.values(OrgRole).sort()).toEqual(['admin', 'client', 'member']);
  });

  it('USER_ROLE_OPTIONS cubre todos los roles, sin sobrantes', () => {
    expect(USER_ROLE_OPTIONS.map((o) => o.value).sort()).toEqual([...PROFILE_ROLES].sort());
  });

  it('TEAM_ROLES es un subconjunto que excluye client y viewer', () => {
    for (const role of TEAM_ROLES) expect(PROFILE_ROLES).toContain(role);
    expect(TEAM_ROLES).not.toContain(UserRole.CLIENT);
    expect(TEAM_ROLES).not.toContain(UserRole.VIEWER);
  });
});

describe('predicados', () => {
  it('isAdminRole tolera el casing', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('Admin')).toBe(true);
    expect(isAdminRole(' ADMIN ')).toBe(true);
  });

  it('isAdminRole rechaza cualquier otro rol', () => {
    expect(isAdminRole('salesman')).toBe(false);
    expect(isAdminRole('')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });

  // Este es el caso exacto del bug de AppLayout: 'client' !== 'CLIENT' devolvía
  // siempre true y el agente de IA acababa visible para los clientes.
  it('isClientRole reconoce al cliente venga como venga', () => {
    expect(isClientRole('client')).toBe(true);
    expect(isClientRole('Client')).toBe(true);
    expect(isClientRole('CLIENT')).toBe(true);
    expect(isClientRole(' client ')).toBe(true);
  });

  it('isClientRole distingue client de viewer', () => {
    expect(isClientRole('viewer')).toBe(false);
    expect(isClientRole('admin')).toBe(false);
    expect(isClientRole(null)).toBe(false);
  });

  it('isViewerRole tolera el casing', () => {
    expect(isViewerRole('viewer')).toBe(true);
    expect(isViewerRole('Viewer')).toBe(true);
    expect(isViewerRole('client')).toBe(false);
  });

  it('isTeamMemberRole acepta los tres roles internos', () => {
    expect(isTeamMemberRole('admin')).toBe(true);
    expect(isTeamMemberRole('Salesman')).toBe(true);
    expect(isTeamMemberRole('FREELANCER')).toBe(true);
  });

  it('isTeamMemberRole rechaza client, viewer y desconocidos', () => {
    expect(isTeamMemberRole('client')).toBe(false);
    expect(isTeamMemberRole('viewer')).toBe(false);
    expect(isTeamMemberRole('superuser')).toBe(false);
    expect(isTeamMemberRole(null)).toBe(false);
  });

  it('canEditProjects coincide con isTeamMemberRole', () => {
    const casos = ['admin', 'Admin', 'salesman', 'freelancer', 'client', 'viewer', 'superuser', '', null];
    for (const caso of casos) {
      expect(canEditProjects(caso)).toBe(isTeamMemberRole(caso));
    }
  });
});

describe('etiquetas y colores', () => {
  it('getUserRoleLabel devuelve la etiqueta del catálogo', () => {
    expect(getUserRoleLabel('admin')).toBe('Admin');
    expect(getUserRoleLabel('client')).toBe('Client');
    expect(getUserRoleLabel('viewer')).toBe('Viewer');
  });

  it('getUserRoleLabel tolera el casing', () => {
    expect(getUserRoleLabel('ADMIN')).toBe('Admin');
    expect(getUserRoleLabel(' Freelancer ')).toBe('Freelancer');
  });

  it('getUserRoleLabel devuelve el valor crudo si no lo reconoce', () => {
    expect(getUserRoleLabel('superuser')).toBe('superuser');
  });

  it('getUserRoleBgColor tolera el casing', () => {
    expect(getUserRoleBgColor('ADMIN')).toBe(getUserRoleBgColor('admin'));
    expect(getUserRoleBgColor('Salesman')).toBe(getUserRoleBgColor('salesman'));
  });

  it('getUserRoleBgColor cae al color neutro si no lo reconoce', () => {
    expect(getUserRoleBgColor('superuser')).toContain('gray');
    expect(getUserRoleBgColor('')).toContain('gray');
  });
});

describe('catálogo de estado de proyecto', () => {
  it('expone los cinco estados canónicos en el orden del backend', () => {
    expect(Object.values(ProjectStatus)).toEqual([
      'NOT_STARTED',
      'IN_PROGRESS',
      'ON_HOLD',
      'COMPLETED',
      'ARCHIVED',
    ]);
  });

  it('el desplegable ofrece los cuatro seleccionables, sin ARCHIVED', () => {
    expect(PROJECT_STATUS_OPTIONS.map((o) => o.value)).toEqual([
      'NOT_STARTED',
      'IN_PROGRESS',
      'ON_HOLD',
      'COMPLETED',
    ]);
  });

  it('normaliza la grafía con espacios que había en la base', () => {
    expect(normalizeProjectStatus('In Progress')).toBe('IN_PROGRESS');
    expect(normalizeProjectStatus('not started')).toBe('NOT_STARTED');
    expect(normalizeProjectStatus('on-hold')).toBe('ON_HOLD');
  });

  it('resuelve los alias históricos', () => {
    expect(normalizeProjectStatus('active')).toBe('IN_PROGRESS');
    expect(normalizeProjectStatus('done')).toBe('COMPLETED');
    expect(normalizeProjectStatus('paused')).toBe('ON_HOLD');
  });

  it('devuelve null para lo que no reconoce, en vez de inventar un estado', () => {
    expect(normalizeProjectStatus('Cancelled')).toBeNull();
    expect(normalizeProjectStatus('')).toBeNull();
    expect(normalizeProjectStatus(null)).toBeNull();
  });

  it('getProjectStatusLabel devuelve la etiqueta legible', () => {
    expect(getProjectStatusLabel('IN_PROGRESS')).toBe('In Progress');
    expect(getProjectStatusLabel('In Progress')).toBe('In Progress');
    expect(getProjectStatusLabel('ARCHIVED')).toBe('Archived');
  });

  it('getProjectStatusLabel devuelve el valor crudo si no lo reconoce', () => {
    expect(getProjectStatusLabel('Cancelled')).toBe('Cancelled');
  });

  it('isProjectInProgress tolera ambas grafías', () => {
    expect(isProjectInProgress('IN_PROGRESS')).toBe(true);
    expect(isProjectInProgress('In Progress')).toBe(true);
    expect(isProjectInProgress('active')).toBe(true);
    expect(isProjectInProgress('COMPLETED')).toBe(false);
    expect(isProjectInProgress(null)).toBe(false);
  });
});

describe('catálogo de tareas', () => {
  it('normaliza los alias históricos de estado', () => {
    expect(normalizeTaskStatus('Done')).toBe('COMPLETED');
    expect(normalizeTaskStatus('in progress')).toBe('IN_PROGRESS');
    expect(normalizeTaskStatus('Blocked')).toBe('ON_HOLD');
    expect(normalizeTaskStatus('Not Started')).toBe('TODO');
  });

  it('getTaskStatusLabel tolera la grafía y cae al valor crudo', () => {
    expect(getTaskStatusLabel('IN_PROGRESS')).toBe('In Progress');
    expect(getTaskStatusLabel('done')).toBe('Completed');
    expect(getTaskStatusLabel('Vaporware')).toBe('Vaporware');
  });

  it('normalizeTaskPriority no acepta prioridades fuera del catálogo', () => {
    expect(normalizeTaskPriority('urgent')).toBe('URGENT');
    expect(normalizeTaskPriority('Critical')).toBeNull();
  });
});

describe('slugifyStage', () => {
  it('produce el slug que la base acepta: minúsculas, sin tildes', () => {
    expect(slugifyStage('Negociación')).toBe('negociacion');
    expect(slugifyStage('Primer Contacto')).toBe('primer_contacto');
  });

  it('coincide con el formato que exige leads_stage_slug_check', () => {
    expect(slugifyStage('Contacto Establecido')).toMatch(/^[a-z0-9_]+$/);
  });

  it('devuelve cadena vacía para valores ausentes', () => {
    expect(slugifyStage(null)).toBe('');
    expect(slugifyStage(undefined)).toBe('');
  });
});
