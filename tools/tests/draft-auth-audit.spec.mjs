import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { auditDraftAuthContract } from '../draft-auth-audit.mjs';

const DOMAIN = 'zoositioweb.com.mx';
const AUTH_PROFILE_ID = 'staff';
const CLIENT_GROUP = 'zoosite-client';
const ADMIN_GROUP = 'zoosite-admin';

const publicAuthRoutes = [
  ['/acceso', 'acceso'],
  ['/registro', 'registro'],
  ['/confirmar-cuenta', 'confirmar-cuenta'],
  ['/recuperar-contrasena', 'recuperar-contrasena'],
  ['/cambiar-contrasena', 'cambiar-contrasena'],
  ['/verificar-acceso', 'verificar-acceso'],
  ['/configurar-mfa', 'configurar-mfa'],
  ['/auth/callback', 'auth-callback'],
];

const authRoutePaths = [
  ...publicAuthRoutes.map(([routePath]) => routePath),
  '/mi-cuenta',
  '/admin/usuarios',
];

function createSiteConfig(overrides = {}) {
  return {
    version: 1,
    domain: DOMAIN,
    defaultPageId: 'default',
    notFoundPageId: 'not-found',
    routes: [
      { path: '/', pageId: 'default', label: 'Inicio' },
      ...publicAuthRoutes.map(([routePath, pageId]) => ({ path: routePath, pageId, label: pageId })),
      {
        path: '/mi-cuenta',
        pageId: 'mi-cuenta',
        label: 'Mi cuenta',
        auth: {
          required: true,
          redirectTo: '/acceso',
          allowedGroups: [CLIENT_GROUP, ADMIN_GROUP],
        },
      },
      {
        path: '/admin/usuarios',
        pageId: 'admin-usuarios',
        label: 'Administrar usuarios',
        auth: {
          required: true,
          redirectTo: '/acceso',
          allowedGroups: [ADMIN_GROUP],
        },
      },
    ],
    sitemap: {
      excludePaths: authRoutePaths,
    },
    site: {
      appIdentity: { identifier: 'zoosite', name: 'zoositioweb' },
      theme: {
        palettes: {
          light: {
            bgColor: '#ffffff',
            textColor: '#111111',
            titleColor: '#111111',
            linkColor: '#111111',
            accentColor: '#111111',
            secondaryBgColor: '#eeeeee',
            secondaryTextColor: '#111111',
            secondaryTitleColor: '#111111',
            secondaryLinkColor: '#111111',
            secondaryAccentColor: '#111111',
          },
          dark: {
            bgColor: '#000000',
            textColor: '#ffffff',
            titleColor: '#ffffff',
            linkColor: '#ffffff',
            accentColor: '#ffffff',
            secondaryBgColor: '#222222',
            secondaryTextColor: '#ffffff',
            secondaryTitleColor: '#ffffff',
            secondaryLinkColor: '#ffffff',
            secondaryAccentColor: '#ffffff',
          },
        },
      },
      i18n: { defaultLanguage: 'es', supportedLanguages: ['es'] },
    },
    runtime: {
      authRemote: {
        enabled: true,
        authProfileId: AUTH_PROFILE_ID,
        endpoint: '/auth/runtime-config',
      },
      dataSources: [
        {
          id: 'auth-account',
          kind: 'auth-admin',
          authAdminSource: 'account',
          target: 'remote.auth.account',
          statusTarget: 'remoteStatus.authAccount',
          pageIds: ['mi-cuenta'],
          mapper: {
            singleItem: true,
            fields: {
              email: 'email',
              approvalStatus: 'approvalStatus',
              isAdminText: 'isAdmin',
              environment: 'environment',
              mfaStatus: 'mfa.status',
              mfaSoftwareTokenEnabled: 'mfa.softwareTokenEnabled',
            },
          },
        },
        {
          id: 'auth-admin-users',
          kind: 'auth-admin',
          authAdminSource: 'adminUsers',
          target: 'remote.auth.adminUsers',
          statusTarget: 'remoteStatus.adminUsers',
          pageIds: ['admin-usuarios'],
          mapper: {
            itemsPath: 'users',
            fields: {
              email: 'email',
              subject: 'subject',
              rolesText: 'roles',
              statusLabel: 'approvalStatus',
              enabledLabel: 'enabled',
              clientApproveInstructions: {
                path: 'subject',
                prefix: 'authAdminAction:approveUser,',
                suffix: `,${CLIENT_GROUP},remoteStatus.adminUsersAction`,
              },
              adminApproveInstructions: {
                path: 'subject',
                prefix: 'authAdminAction:approveUser,',
                suffix: `,${CLIENT_GROUP}|${ADMIN_GROUP},remoteStatus.adminUsersAction`,
              },
              suspendInstructions: {
                path: 'subject',
                prefix: 'authAdminAction:suspendUser,',
                suffix: ',,remoteStatus.adminUsersAction',
              },
              reactivateInstructions: {
                path: 'subject',
                prefix: 'authAdminAction:reactivateUser,',
                suffix: ',,remoteStatus.adminUsersAction',
              },
              resetMfaInstructions: {
                path: 'subject',
                prefix: 'authAdminAction:resetUserMfa,',
                suffix: ',,remoteStatus.adminUsersAction',
              },
            },
          },
        },
      ],
    },
    ...overrides,
  };
}

function createRegistry(overrides = {}) {
  return {
    version: 1,
    profiles: [
      {
        domain: DOMAIN,
        authProfileId: AUTH_PROFILE_ID,
        tenantId: 'zoosite',
        status: 'active',
        provider: 'cognito',
        issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE',
        userPoolId: 'us-east-1_EXAMPLE',
        hostedUiDomain: 'https://zoosite-staff-example.auth.us-east-1.amazoncognito.com',
        clientId: 'public-client-id',
        audiences: ['public-client-id'],
        callbackUrls: [`https://${DOMAIN}/auth/callback`],
        logoutUrls: [`https://${DOMAIN}/acceso`],
        loginPath: '/acceso',
        logoutPath: '/acceso',
        postLoginPath: '/mi-cuenta',
        postLogoutPath: '/acceso',
        tenantClaim: 'custom:tenant_id',
        environmentClaim: 'custom:zoolanding_env',
        groupClaim: 'cognito:groups',
        allowedGroups: [CLIENT_GROUP, ADMIN_GROUP],
        allowedTokenUses: ['id', 'access'],
        adminGroups: [ADMIN_GROUP],
        manageableGroups: [CLIENT_GROUP, ADMIN_GROUP],
        defaultUserStatus: 'pending',
        adminGroupsAutoApproved: true,
        maxSessionSeconds: 43200,
        mfa: {
          mode: 'optional',
          totp: {
            enabled: true,
            issuer: 'zoositioweb',
            accountLabelTemplate: '{email}',
            friendlyDeviceName: 'zoositioweb acceso',
          },
        },
        session: {
          mode: 'server-cookie',
          signinPath: '/auth/session/signin',
          mePath: '/auth/session/me',
          logoutPath: '/auth/session/logout',
          challengeRespondPath: '/auth/session/challenge/respond',
          mfaSetupPath: '/auth/session/mfa/setup',
          mfaVerifyPath: '/auth/session/mfa/verify',
          mfaEnrollStartPath: '/auth/session/mfa/enroll/start',
          mfaEnrollVerifyPath: '/auth/session/mfa/enroll/verify',
          mfaDisablePath: '/auth/session/mfa/disable',
          csrfCookieName: 'zlp_csrf',
          challengeCsrfCookieName: 'zlp_challenge_csrf',
          mfaEnrollCsrfCookieName: 'zlp_mfa_enroll_csrf',
          csrfHeaderName: 'X-ZLP-CSRF',
        },
        admin: {
          usersPath: '/auth/admin/users',
          approveUserPathTemplate: '/auth/admin/users/{subject}/approve',
          groupsPathTemplate: '/auth/admin/users/{subject}/groups',
          suspendUserPathTemplate: '/auth/admin/users/{subject}/suspend',
          reactivateUserPathTemplate: '/auth/admin/users/{subject}/reactivate',
          resetUserMfaPathTemplate: '/auth/admin/users/{subject}/mfa/reset',
        },
        customAuth: {
          signin: { enabled: true },
          signup: {
            enabled: true,
            setTenantClaim: true,
            setEnvironmentClaim: true,
            defaultGroups: [CLIENT_GROUP],
          },
          passwordRecovery: { enabled: true },
        },
        ...overrides,
      },
    ],
  };
}

function componentsFor(pageId) {
  const byPage = {
    acceso: [
      { id: 'signinStatus', type: 'text', condition: 'all:varEq,authForm.signin.state,error' },
      { id: 'signinSubmit', type: 'button', eventInstructions: 'authFormAction:signin,authForm.signin' },
    ],
    registro: [
      { id: 'signupSubmit', type: 'button', eventInstructions: 'authFormAction:signup,authForm.signup' },
    ],
    'confirmar-cuenta': [
      { id: 'confirmSubmit', type: 'button', eventInstructions: 'authFormAction:confirmSignup,authForm.confirmSignup' },
      {
        id: 'resendSubmit',
        type: 'button',
        eventInstructions: 'authFormAction:resendConfirmation,authForm.resendConfirmation',
      },
    ],
    'recuperar-contrasena': [
      {
        id: 'recoverSubmit',
        type: 'button',
        eventInstructions: 'authFormAction:forgotPassword,authForm.forgotPassword',
      },
    ],
    'cambiar-contrasena': [
      {
        id: 'resetSubmit',
        type: 'button',
        eventInstructions: 'authFormAction:confirmForgotPassword,authForm.confirmForgotPassword',
      },
    ],
    'verificar-acceso': [
      {
        id: 'challengeSubmit',
        type: 'button',
        eventInstructions: 'authFormAction:respondMfaChallenge,authForm.respondMfaChallenge',
      },
    ],
    'configurar-mfa': [
      { id: 'setupStart', type: 'button', eventInstructions: 'authFormAction:startMfaSetup,authForm.startMfaSetup' },
      { id: 'setupQr', type: 'qr-code', valueInstructions: 'set:config.value,var,authForm.startMfaSetup.data.setup.otpauthUri' },
      { id: 'setupVerify', type: 'button', eventInstructions: 'authFormAction:verifyMfaSetup,authForm.verifyMfaSetup' },
    ],
    'auth-callback': [
      { id: 'retryLogin', type: 'button', eventInstructions: 'authAction:login' },
    ],
    'mi-cuenta': [
      { id: 'accountLoading', type: 'text', condition: 'all:varEq,remoteStatus.authAccount.state,loading' },
      { id: 'accountError', type: 'text', condition: 'all:varEq,remoteStatus.authAccount.state,error' },
      { id: 'accountPanel', type: 'text', condition: 'all:varEq,remoteStatus.authAccount.state,success' },
      { id: 'accountEmail', type: 'text', valueInstructions: 'set:config.text,var,remote.auth.account.items.0.email' },
      { id: 'mfaDisabled', type: 'text', condition: 'all:varEq,remote.auth.account.items.0.mfaSoftwareTokenEnabled,false' },
      { id: 'mfaUnknown', type: 'text', condition: 'all:varEq,remote.auth.account.items.0.mfaStatus,unknown' },
      { id: 'mfaStart', type: 'button', eventInstructions: 'authFormAction:startMfaEnrollment,authForm.startMfaEnrollment' },
      { id: 'mfaQr', type: 'qr-code', valueInstructions: 'set:config.value,var,authForm.startMfaEnrollment.data.setup.otpauthUri' },
      { id: 'mfaVerify', type: 'button', eventInstructions: 'authFormAction:verifyMfaEnrollment,authForm.verifyMfaEnrollment' },
      { id: 'mfaDisable', type: 'button', eventInstructions: 'authFormAction:disableMfa,authForm.disableMfa' },
      { id: 'logout', type: 'button', eventInstructions: 'authFormAction:logout,authForm.logout' },
    ],
    'admin-usuarios': [
      { id: 'adminActionStatus', type: 'text', condition: 'any:varEq,remoteStatus.adminUsersAction.state,success;any:varEq,remoteStatus.adminUsersAction.state,error' },
      { id: 'adminActionLoading', type: 'text', condition: 'all:varEq,remoteStatus.adminUsersAction.state,loading' },
      { id: 'adminLoading', type: 'text', condition: 'all:varEq,remoteStatus.adminUsers.state,loading' },
      { id: 'adminError', type: 'text', condition: 'all:varEq,remoteStatus.adminUsers.state,error' },
      { id: 'adminEmpty', type: 'text', condition: 'all:varEq,remoteStatus.adminUsers.state,empty' },
      {
        id: 'adminList',
        type: 'repeater',
        condition: 'all:varEq,remoteStatus.adminUsers.state,success',
        config: { path: 'remote.auth.adminUsers.items' },
      },
      { id: 'logout', type: 'button', eventInstructions: 'authFormAction:logout,authForm.logout' },
    ],
  };

  return {
    version: 1,
    pageId,
    components: byPage[pageId] ?? [{ id: `${pageId}Root`, type: 'text', config: { text: pageId } }],
  };
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function createDraftFixture({ siteConfig = createSiteConfig(), registry = createRegistry(), pageOverrides = {} } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'draft-auth-audit-'));
  const draftRoot = path.join(root, DOMAIN);
  await writeJson(path.join(draftRoot, 'site-config.json'), siteConfig);
  await writeJson(path.join(draftRoot, 'server', 'auth-profile-registry.json'), registry);

  for (const route of siteConfig.routes) {
    const pageId = route.pageId;
    if (pageId === 'default') continue;
    await writeJson(path.join(draftRoot, pageId, 'page-config.json'), {
      version: 1,
      domain: DOMAIN,
      pageId,
      rootIds: [`${pageId}Root`],
      seo: {
        title: `${pageId} | zoositioweb`,
        description: `${pageId} auth route`,
        canonical: `https://${DOMAIN}${route.path}`,
        robots: { default: 'noindex,nofollow' },
      },
      ...(pageOverrides[pageId]?.pageConfig ?? {}),
    });
    await writeJson(path.join(draftRoot, pageId, 'components.json'), pageOverrides[pageId]?.components ?? componentsFor(pageId));
  }

  return {
    root,
    draftRoot,
    async cleanup() {
      await rm(root, { recursive: true, force: true });
    },
  };
}

test('audits a custom auth draft contract without real credentials', async () => {
  const fixture = await createDraftFixture();
  try {
    const result = await auditDraftAuthContract({
      draftRoot: fixture.draftRoot,
      domain: DOMAIN,
      authProfileId: AUTH_PROFILE_ID,
      clientGroup: CLIENT_GROUP,
      adminGroup: ADMIN_GROUP,
    });

    assert.equal(result.ok, true, JSON.stringify(result.issues, null, 2));
    assert.deepEqual(result.issues, []);
    assert.equal(result.summary.domain, DOMAIN);
    assert.equal(result.summary.authProfileId, AUTH_PROFILE_ID);
    assert.equal(result.summary.authRouteCount, 10);
    assert.equal(result.summary.runtimeMode, 'authRemote');
    assert.equal(result.summary.sessionMode, 'server-cookie');
    assert.equal(result.summary.mfaMode, 'optional');
  } finally {
    await fixture.cleanup();
  }
});

test('reports public secrets, robots, mapper, admin, and MFA contract drift', async () => {
  const brokenSiteConfig = createSiteConfig({
    runtime: {
      ...createSiteConfig().runtime,
      authRemote: {
        enabled: true,
        authProfileId: AUTH_PROFILE_ID,
        endpoint: '/auth/runtime-config',
        clientSecret: 'must-not-ship',
      },
      dataSources: [
        {
          ...createSiteConfig().runtime.dataSources[0],
          mapper: {
            ...createSiteConfig().runtime.dataSources[0].mapper,
            fields: {
              email: 'email',
              approvalStatus: 'approvalStatus',
              isAdminText: 'isAdmin',
              environment: 'environment',
              mfaStatus: 'mfa.status',
            },
          },
        },
        createSiteConfig().runtime.dataSources[1],
      ],
    },
  });
  brokenSiteConfig.routes = brokenSiteConfig.routes.map(route => {
    if (route.path !== '/admin/usuarios') return route;
    return {
      ...route,
      auth: {
        ...route.auth,
        allowedGroups: [CLIENT_GROUP, ADMIN_GROUP],
      },
    };
  });

  const fixture = await createDraftFixture({
    siteConfig: brokenSiteConfig,
    registry: createRegistry({ mfa: { mode: 'off', totp: { enabled: false } } }),
    pageOverrides: {
      'mi-cuenta': {
        pageConfig: {
          seo: {
            title: 'Mi cuenta | zoositioweb',
            description: 'Private account area',
            canonical: `https://${DOMAIN}/mi-cuenta`,
            robots: { default: 'index,follow' },
          },
        },
      },
    },
  });

  try {
    const result = await auditDraftAuthContract({
      draftRoot: fixture.draftRoot,
      domain: DOMAIN,
      authProfileId: AUTH_PROFILE_ID,
      clientGroup: CLIENT_GROUP,
      adminGroup: ADMIN_GROUP,
    });

    assert.equal(result.ok, false);
    const codes = new Set(result.issues.map(issue => issue.code));
    assert.equal(codes.has('public-auth-secret'), true);
    assert.equal(codes.has('route-robots'), true);
    assert.equal(codes.has('data-source-condition'), true);
    assert.equal(codes.has('admin-route-groups'), true);
    assert.equal(codes.has('mfa-profile'), true);
  } finally {
    await fixture.cleanup();
  }
});
