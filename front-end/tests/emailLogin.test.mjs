import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadLogin() {
  const source = readFileSync(
    new URL('../src/services/authService.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const calls = [];
  const stored = new Map();
  let failure = null;
  const user = {
    id: 'id', username: 'internal-user', fullName: 'User',
    role: 'STUDENT', email: ' Stored@EXAMPLE.COM ',
  };
  const storage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: key => stored.delete(key),
  };
  const client = {
    post: async (url, payload) => {
      calls.push({ url, payload });
      if (failure) throw failure;
      return {
        data: { data: { token: 'token', tokenType: 'Bearer', user } },
      };
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module, exports: module.exports,
    require: id => {
      assert.equal(id, './apiClient');
      return { __esModule: true, default: client, clearApiCache: () => {} };
    },
    localStorage: storage, sessionStorage: storage, console,
  });
  return {
    service: module.exports, calls, stored,
    fail: value => { failure = value; },
  };
}

test('login sends raw email in username and preserves password/internal username', async () => {
  const harness = loadLogin();
  const raw = ' É+Tag@EXAMPLE.COM ';
  const user = await harness.service.loginUser(raw, ' password123 ');
  const payload = harness.calls[0].payload;

  assert.equal(harness.calls[0].url, '/auth/login');
  assert.equal(payload.username, raw);
  assert.equal(payload.password, ' password123 ');
  assert.equal(Object.keys(payload).length, 2);
  assert.equal(Object.hasOwn(payload, 'email'), false);
  assert.equal(user.username, 'internal-user');
  assert.equal(harness.stored.get('accessToken'), 'token');
});

test('backend credentials message is preserved and no session is saved', async () => {
  const harness = loadLogin();
  harness.fail({
    response: {
      status: 401,
      data: { error: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' },
    },
  });
  await assert.rejects(
    harness.service.loginUser('missing@example.com', 'wrong'),
    { message: 'Email or password is incorrect' },
  );
  assert.equal(harness.stored.size, 0);
});

test('network/infrastructure error is not replaced by a credentials claim', async () => {
  const harness = loadLogin();
  harness.fail(new Error('Network unavailable'));
  await assert.rejects(
    harness.service.loginUser('user@example.com', 'password123'),
    { message: 'Network unavailable' },
  );
  assert.equal(harness.stored.size, 0);
});

function loadSubmit(component, loginIdentifier, loginPassword) {
  const source = readFileSync(
    new URL(`../src/components/auth/${component}.tsx`, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(
    `${component}.tsx`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const handlers = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name)
        && node.name.text === 'handleLoginSubmit'
        && node.initializer) {
      handlers.push(node.initializer.getText(ast));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(handlers.length, 1);

  const output = ts.transpileModule(`module.exports = ${handlers[0]};`, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const state = { errors: [], calls: [], prevented: false, completed: 0 };
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    isVi: true,
    loginIdentifier,
    loginPassword,
    setErrorMessage: value => state.errors.push(value),
    setSuccessMessage: () => {},
    setIsLoading: () => {},
    loginUser: async (email, password) => {
      state.calls.push({ email, password });
      return { fullName: 'User' };
    },
    setTimeout: callback => callback(),
    onLoginSuccess: () => { state.completed++; },
    onSuccess: () => { state.completed++; },
    onClose: () => {},
  });
  return { state, submit: module.exports };
}

for (const component of ['AuthLandingPage', 'AuthModal']) {
  test(`${component} actual handler forwards raw email/password`, async () => {
    const raw = ' User+Tag@EXAMPLE.COM ';
    const { state, submit } = loadSubmit(component, raw, ' password123 ');
    await submit({ preventDefault: () => { state.prevented = true; } });
    assert.equal(state.prevented, true);
    assert.equal(state.calls.length, 1);
    assert.equal(state.calls[0].email, raw);
    assert.equal(state.calls[0].password, ' password123 ');
    assert.equal(state.completed, 1);
  });

  test(`${component} empty identifier is labelled as missing email`, async () => {
    const { state, submit } = loadSubmit(component, '', 'password123');
    await submit({ preventDefault: () => {} });
    assert.equal(state.calls.length, 0);
    assert.equal(state.errors.at(-1), 'Vui lòng nhập email');
  });
}
