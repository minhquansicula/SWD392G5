import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness() {
  const local = new Map();
  const session = new Map();
  const events = [];
  const requests = [];
  const storage = map => ({
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key),
  });
  let requestInterceptor, responseInterceptor, errorInterceptor;
  let server = async () => ({ data: { data: {
    id: 'real-id', username: 'internal', fullName: 'Verified User', role: 'STUDENT', email: 'real@example.test',
  } } });
  const client = {
    interceptors: {
      request: { use: handler => { requestInterceptor = handler; } },
      response: { use: (ok, error) => { responseInterceptor = ok; errorInterceptor = error; } },
    },
    get: async (url, options = {}) => {
      const config = requestInterceptor({ url, method: 'get', baseURL: 'http://localhost:8080/api', headers: {}, ...options });
      try {
        if (config.adapter) return responseInterceptor(await config.adapter());
        requests.push(config);
        return responseInterceptor({ status: 200, config, ...await server(config) });
      } catch (error) {
        error.config = config;
        return errorInterceptor(error);
      }
    },
    post: async (url, data) => {
      const config = requestInterceptor({ url, method: 'post', data, baseURL: 'http://localhost:8080/api', headers: {} });
      try {
        requests.push(config);
        return responseInterceptor({ status: 200, config, ...await server(config) });
      } catch (error) {
        error.config = config;
        return errorInterceptor(error);
      }
    },
    put: async (url, data) => {
      const config = requestInterceptor({ url, method: 'put', data, baseURL: 'http://localhost:8080/api', headers: {} });
      requests.push(config);
      return responseInterceptor({ status: 200, config, ...await server(config) });
    },
  };
  const context = {
    localStorage: storage(local), sessionStorage: storage(session), console,
    window: { dispatchEvent: event => events.push(event.type) },
    Event: class { constructor(type) { this.type = type; } },
  };
  function load(path, require) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8')
      .replace('import.meta.env.VITE_API_URL', 'undefined');
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(output, { ...context, module, exports: module.exports, require });
    return module.exports;
  }
  const api = load('../src/services/apiClient.ts', id => {
    assert.equal(id, 'axios');
    return { __esModule: true, default: { create: () => client } };
  });
  const service = load('../src/services/authService.ts', id => {
    assert.equal(id, './apiClient');
    return { __esModule: true, ...api };
  });
  return { local, session, requests, events, api, service, server: handler => { server = handler; } };
}

test('/me bypasses cache and replaces a cached ADMIN role with backend identity', async () => {
  const h = harness();
  h.local.set('accessToken', 'fake-session-a');
  h.service.saveSession({ id: 'cached', username: 'cached', role: 'ADMIN' });
  const user = await h.service.verifyCurrentSession();
  assert.equal(user.id, 'real-id');
  assert.equal(user.role, 'STUDENT');
  assert.equal(h.requests[0].url, '/auth/me');
  assert.equal(h.requests[0].headers['Cache-Control'], 'no-cache');
  assert.equal(h.service.getCurrentSession().role, 'STUDENT');
});

test('/me 401 removes token, both profile stores and cached GET data', async () => {
  const h = harness();
  h.local.set('accessToken', 'fake-session-a');
  h.local.set('aives_auth_session', '{}');
  h.session.set('aives_auth_session', '{}');
  await h.api.default.get('/admin/users');
  h.server(async () => { throw { response: { status: 401 } }; });
  assert.equal(await h.service.verifyCurrentSession(), null);
  assert.equal(h.local.has('accessToken'), false);
  assert.equal(h.local.has('aives_auth_session'), false);
  assert.equal(h.session.has('aives_auth_session'), false);
  assert.deepEqual(h.events, ['auth:unauthorized']);
  h.local.set('accessToken', 'fake-session-a');
  h.server(async () => ({ data: { data: [] } }));
  await h.api.default.get('/admin/users');
  assert.equal(h.requests.length, 3);
});

for (const failure of [new Error('Network unavailable'), { response: { status: 503, data: { message: 'Service unavailable' } } }]) {
  test(`/me ${failure.response ? '5xx' : 'network error'} preserves token/profile and does not claim bad credentials`, async () => {
    const h = harness();
    h.local.set('accessToken', 'fake-session-a');
    h.service.saveSession({ id: 'id', username: 'internal', role: 'ADMIN' });
    const profile = h.local.get('aives_auth_session');
    h.server(async () => { throw failure; });
    await assert.rejects(h.service.verifyCurrentSession(), error => {
      assert.doesNotMatch(error.message, /credentials|password|mật khẩu/i);
      return true;
    });
    assert.equal(h.local.get('accessToken'), 'fake-session-a');
    assert.equal(h.local.get('aives_auth_session'), profile);
    assert.equal(h.events.length, 0);
  });
}

test('GET cache is isolated by account and cleared on logout, including same-token relogin', async () => {
  const h = harness();
  h.local.set('accessToken', 'fake-session-a');
  await h.api.default.get('/admin/users');
  await h.api.default.get('/admin/users');
  assert.equal(h.requests.length, 1);
  h.local.set('accessToken', 'fake-session-b');
  await h.api.default.get('/admin/users');
  assert.equal(h.requests.length, 2);
  h.service.clearSession();
  h.local.set('accessToken', 'fake-session-a');
  await h.api.default.get('/admin/users');
  assert.equal(h.requests.length, 3);
});

test('late GET/401 from an old session cannot refill cache or invalidate a relogin', async () => {
  const h = harness();
  h.local.set('accessToken', 'fake-session-a');
  let resolve;
  h.server(() => new Promise(done => { resolve = done; }));
  const old = h.api.default.get('/admin/users');
  h.service.clearSession();
  h.local.set('accessToken', 'fake-session-a');
  resolve({ data: { data: ['old'] } });
  await old;
  h.server(async () => ({ data: { data: ['new'] } }));
  await h.api.default.get('/admin/users');
  assert.equal(h.requests.length, 2);
  let reject;
  h.server(() => new Promise((_, fail) => { reject = fail; }));
  const oldFailure = h.api.default.get('/auth/me');
  h.service.clearSession();
  h.local.set('accessToken', 'fake-session-a');
  reject({ response: { status: 401 } });
  await assert.rejects(oldFailure);
  assert.equal(h.local.get('accessToken'), 'fake-session-a');
  assert.equal(h.events.length, 0);
});

test('late GET before a mutation cannot repopulate the cache with stale roles', async () => {
  const h = harness();
  h.local.set('accessToken', 'fake-session-a');
  let resolve;
  h.server(() => new Promise(done => { resolve = done; }));
  const oldList = h.api.default.get('/admin/users');
  h.server(async () => ({ data: { data: ['updated-role'] } }));
  await h.api.default.put('/admin/users/id', { role: 'LECTURER' });
  resolve({ data: { data: ['old-role'] } });
  await oldList;
  const fresh = await h.api.default.get('/admin/users');
  assert.equal(h.requests.length, 3);
  assert.equal(fresh.data.data[0], 'updated-role');
});

test('cached profile without a token cannot grant a session', async () => {
  const h = harness();
  h.service.saveSession({ id: 'id', username: 'internal', role: 'ADMIN' });
  assert.equal(await h.service.verifyCurrentSession(), null);
  assert.equal(h.service.getCurrentSession(), null);
  assert.equal(h.requests.length, 0);
});

test('late /me failure cannot erase a same-token relogin', async () => {
  const h = harness();
  h.local.set('accessToken', 'fake-session-a');
  let reject;
  h.server(() => new Promise((_, fail) => { reject = fail; }));
  const old = h.service.verifyCurrentSession();
  h.service.clearSession();
  h.local.set('accessToken', 'fake-session-a');
  reject({ response: { status: 401 } });
  assert.equal(await old, null);
  assert.equal(h.local.get('accessToken'), 'fake-session-a');
});

test('/me unknown role fails closed without discarding credentials', async () => {
  const h = harness();
  h.local.set('accessToken', 'fake-session-a');
  h.server(async () => ({ data: { data: { id: 'id', username: 'internal', role: 'UNKNOWN' } } }));
  await assert.rejects(h.service.verifyCurrentSession());
  assert.equal(h.local.get('accessToken'), 'fake-session-a');
  assert.equal(h.service.getCurrentSession(), null);
});

test('password link endpoints never carry or invalidate the current session', async () => {
  const h = harness();
  h.local.set('accessToken', 'fake-session-a');
  h.service.saveSession({ id: 'a', username: 'a', role: 'ADMIN' });
  for (const url of ['/auth/password/link', '/auth/password/set', '/auth/password/forgot']) {
    await h.api.default.post(url, { token: 'raw' });
    assert.equal(h.requests.at(-1).headers.Authorization, undefined);
  }
  h.server(async () => { throw { response: { status: 401 } }; });
  await assert.rejects(h.api.default.post('/auth/password/set', { token: 'raw' }));
  assert.equal(h.local.get('accessToken'), 'fake-session-a');
  assert.equal(h.service.getCurrentSession().role, 'ADMIN');
  assert.deepEqual(h.events, []);

  // A protected POST still attaches the session and a 401 on it still ends the session.
  h.server(async () => ({ data: {} }));
  await h.api.default.post('/admin/users/u1/password-link');
  assert.equal(h.requests.at(-1).headers.Authorization, 'Bearer fake-session-a');
  h.server(async () => { throw { response: { status: 401 } }; });
  await assert.rejects(h.api.default.post('/admin/users/u1/password-link'));
  assert.equal(h.local.get('accessToken'), undefined);
  assert.deepEqual(h.events, ['auth:unauthorized']);
});
