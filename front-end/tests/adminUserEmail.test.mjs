import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadService() {
  const source = readFileSync(new URL('../src/services/authService.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const calls = [];
  const stored = new Map();
  let reply = {
    id: 'new-id', username: 'new', fullName: 'New',
    role: 'STUDENT', email: null, createdAt: '2026-10-08',
  };
  const storage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: key => stored.delete(key),
  };
  let failure = null;
  const client = {
    post: async (url, payload) => {
      calls.push({ method: 'POST', url, payload });
      if (failure) throw failure;
      return { data: { data: reply } };
    },
    put: async (url, payload) => {
      calls.push({ method: 'PUT', url, payload });
      if (failure) throw failure;
      return { data: { data: reply } };
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
    reply: value => { reply = value; },
    fail: value => { failure = value; },
  };
}

// Execute the component's actual FileReader callback, not a rewritten parser.
function parseRows(rows) {
  const source = readFileSync(new URL('../src/components/admin/UserManagementPage.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('UserManagementPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks = [];
  function visit(node) {
    if (ts.isBinaryExpression(node)
        && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && ts.isPropertyAccessExpression(node.left)
        && ts.isIdentifier(node.left.expression)
        && node.left.expression.text === 'reader'
        && node.left.name.text === 'onload') {
      callbacks.push(node.right.getText(ast));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(callbacks.length, 1);
  const output = ts.transpileModule(`module.exports = ${callbacks[0]};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const state = { parsed: null, error: '', readCalls: 0, sheetCalls: 0 };
  const sheet = {};
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    isVi: true,
    console,
    setImportError: value => { state.error = value; },
    setParsedStudents: value => { state.parsed = value; },
    XLSX: {
      read: (data, options) => {
        state.readCalls++;
        assert.equal(data.byteLength, 0);
        assert.equal(options.type, 'array');
        assert.equal(options.raw, true);
        return { SheetNames: ['Students'], Sheets: { Students: sheet } };
      },
      utils: {
        sheet_to_json: (worksheet, options) => {
          state.sheetCalls++;
          assert.equal(worksheet, sheet);
          assert.equal(options.raw, true);
          assert.equal(options.defval, '');
          assert.equal(options.blankrows, false);
          return rows;
        },
      },
    },
  });
  module.exports({ target: { result: new ArrayBuffer(0) } });
  assert.equal(state.readCalls, 1);
  assert.equal(state.sheetCalls, 1);
  return state;
}

test('create sends literal Unicode/whitespace email and never a password', async () => {
  const { service, calls } = loadService();
  const raw = ' É+Tag@EXAMPLE.COM ';
  await service.createUserByAdmin({
    username: 'new', fullName: 'New', password: 'chosen-by-admin', role: 'STUDENT', email: raw,
  });
  assert.equal(calls[0].url, '/admin/users');
  assert.equal(calls[0].payload.email, raw);
  assert.equal(Object.hasOwn(calls[0].payload, 'password'), false);
  assert.equal(service.mapBackendUserToAccount({
    id: 'legacy', username: 'legacy', fullName: 'Legacy', role: 'STUDENT', email: null,
  }).email, '');
  assert.equal(service.mapBackendUserToAccount({
    id: 'p', username: 'p', fullName: 'P', role: 'STUDENT', email: 'p@example.com', passwordStatus: 'PENDING',
  }).passwordStatus, 'PENDING');
});

test('update omits untouched email and preserves explicit null/empty/raw values', async () => {
  const { service, calls } = loadService();
  await service.updateUserAccount('id', { fullName: 'Updated' });
  assert.equal(Object.hasOwn(calls[0].payload, 'email'), false);
  await service.updateUserAccount('id', { email: null });
  assert.equal(calls[1].payload.email, null);
  await service.updateUserAccount('id', { email: '' });
  assert.equal(calls[2].payload.email, '');
  await service.updateUserAccount('id', { email: ' New@EXAMPLE.COM ' });
  assert.equal(calls[3].payload.email, ' New@EXAMPLE.COM ');
});

test('batch sends no password and returns one result per row with its reason', async () => {
  const harness = loadService();
  harness.reply({
    total: 4, created: 1, skipped: 3,
    rows: [
      { row: 1, username: 'valid', email: ' Valid@EXAMPLE.COM ', status: 'CREATED', reason: null,
        user: { id: 'id', username: 'valid', fullName: 'Valid', role: 'STUDENT',
          email: ' Valid@EXAMPLE.COM ', passwordStatus: 'PENDING' } },
      { row: 2, username: '', email: '', status: 'SKIPPED', reason: 'MISSING_REQUIRED', user: null },
      { row: 3, username: 'bad', email: 'not-an-email', status: 'SKIPPED', reason: 'INVALID_EMAIL', user: null },
      { row: 4, username: 'dup', email: 'valid@example.com', status: 'SKIPPED', reason: 'DUPLICATE_IN_FILE', user: null },
    ],
  });
  const rows = [
    { username: 'valid', fullName: 'Valid', email: ' Valid@EXAMPLE.COM ', password: 'from-old-file' },
    { username: '', fullName: '', email: '' },
    { username: 'bad', fullName: 'Bad', email: 'not-an-email' },
    { username: 'dup', fullName: 'Dup', email: 'valid@example.com' },
  ];
  const result = await harness.service.importStudentsBatch(rows);
  const payload = harness.calls[0].payload;
  assert.equal(harness.calls[0].url, '/admin/users/batch');
  assert.equal(payload.length, rows.length);
  assert.equal(payload[0].email, ' Valid@EXAMPLE.COM ');
  assert.equal(payload[1].email, '');
  assert.equal(payload[1].fullName, '');
  for (const entry of payload) {
    assert.equal(Object.hasOwn(entry, 'password'), false);
    assert.equal(entry.role, 'STUDENT');
  }
  assert.equal(result.success, 1);
  assert.equal(result.failed, 3);
  assert.equal(result.created[0].username, 'valid');
  assert.equal(result.rows.length, 4);
  assert.equal(result.rows[0].status, 'CREATED');
  assert.equal(result.rows[0].reason, null);
  assert.equal(result.rows[0].passwordStatus, 'PENDING');
  assert.deepEqual(result.rows.slice(1).map(r => r.reason),
    ['MISSING_REQUIRED', 'INVALID_EMAIL', 'DUPLICATE_IN_FILE']);
  assert.equal(result.rows[2].row, 3);
  assert.equal(result.rows[2].email, 'not-an-email');
});

test('actual Excel callback ignores any password column and keeps raw email and invalid records', async () => {
  const rawEmail = ' É+Tag@EXAMPLE.COM ';
  const base = { Username: ' SE001 ', FullName: ' Name ', Email: rawEmail };
  const rows = [
    { ...base },
    { ...base, 'Mật khẩu': 'old-template-password' },
    { ...base, Password: '' },
    { ...base, password: 'short' },
    { Username: '', FullName: '', Email: '' },
  ];
  const state = parseRows(rows);
  assert.equal(state.error, '');
  assert.equal(state.parsed.length, rows.length);
  for (let index = 0; index < rows.length; index++) {
    assert.equal(Object.hasOwn(state.parsed[index], 'password'), false);
    assert.equal(state.parsed[index].email, index === 4 ? '' : rawEmail);
  }
  assert.equal(state.parsed[0].username, 'se001');
  assert.equal(state.parsed[4].username, '');
  assert.equal(state.parsed[4].fullName, '');

  const harness = loadService();
  harness.reply({ total: rows.length, created: 0, skipped: rows.length, rows: [] });
  await harness.service.importStudentsBatch(state.parsed);
  for (let index = 0; index < rows.length; index++) {
    assert.equal(Object.hasOwn(harness.calls[0].payload[index], 'password'), false);
    assert.equal(harness.calls[0].payload[index].email, index === 4 ? '' : rawEmail);
  }
});

test('nothing created reports every row as skipped', async () => {
  const harness = loadService();
  harness.reply({
    total: 1, created: 0, skipped: 1,
    rows: [{ row: 1, username: 'bad', email: '', status: 'SKIPPED', reason: 'MISSING_REQUIRED', user: null }],
  });
  const result = await harness.service.importStudentsBatch([{ username: 'bad', fullName: 'Bad', email: '' }]);
  assert.equal(result.success, 0);
  assert.equal(result.failed, 1);
  assert.equal(result.created.length, 0);
  assert.equal(result.rows[0].reason, 'MISSING_REQUIRED');
});

test('batch infrastructure failure warns that earlier rows may already exist', async () => {
  const harness = loadService();
  harness.fail({ response: { status: 500, data: { message: 'boom' } } });
  await assert.rejects(
    harness.service.importStudentsBatch([{ username: 'a', fullName: 'A', email: 'a@example.com' }]),
    /Một số dòng có thể đã được tạo/);
});

test('resend password link posts to the user and maps mail failure', async () => {
  const harness = loadService();
  harness.reply({ id: 'u1', username: 'u1', fullName: 'U', role: 'STUDENT',
    email: 'u@example.com', passwordStatus: 'PENDING' });
  const updated = await harness.service.resendPasswordLink('u1');
  assert.equal(harness.calls[0].url, '/admin/users/u1/password-link');
  assert.equal(updated.passwordStatus, 'PENDING');
  harness.fail({ response: { status: 502, data: { error: 'MAIL_NOT_SENT', message: 'x' } } });
  await assert.rejects(harness.service.resendPasswordLink('u1'), /Không gửi được email/);
  harness.fail({ response: { status: 409, data: { error: 'USER_HAS_NO_EMAIL', message: 'x' } } });
  await assert.rejects(harness.service.resendPasswordLink('u1'), /chưa có email/);
});

test('admin user errors are shown by code in Vietnamese, else by server message, else by fallback', async () => {
  const harness = loadService();
  const user = { username: 'new', fullName: 'New', role: 'STUDENT', email: 'new@example.com' };
  harness.fail({ response: { status: 409, data: { error: 'DATA_INTEGRITY_CONFLICT', message: 'Data conflicts' } } });
  await assert.rejects(harness.service.createUserByAdmin(user), /Email đã được dùng bởi tài khoản khác/);
  await assert.rejects(harness.service.updateUserAccount('id', { email: 'new@example.com' }),
    /Email đã được dùng bởi tài khoản khác/);
  harness.fail({ response: { status: 409, data: { error: 'USER_ALREADY_EXISTS', message: 'x' } } });
  await assert.rejects(harness.service.createUserByAdmin(user), /Username đã tồn tại/);
  harness.fail({ response: { status: 400, data: { error: 'VALIDATION_FAILED', message: 'Invalid user data' } } });
  await assert.rejects(harness.service.createUserByAdmin(user), /Dữ liệu không hợp lệ/);
  harness.fail({ response: { status: 418, data: { error: 'SOMETHING_NEW', message: 'Server explains' } } });
  await assert.rejects(harness.service.createUserByAdmin(user), /Server explains/);
  harness.fail({ message: 'Network Error' });
  await assert.rejects(harness.service.createUserByAdmin(user), /Network Error/);
  await assert.rejects(harness.service.updateUserAccount('id', { fullName: 'x' }),
    /Không thể cập nhật thông tin người dùng/);
});

test('password link endpoints send the raw token and tell an invalid link from an outage', async () => {
  const harness = loadService();
  harness.reply({ email: ' A@EXAMPLE.COM ', fullName: 'A', activation: true });
  const info = await harness.service.checkPasswordLink('raw-token');
  assert.equal(harness.calls[0].url, '/auth/password/link');
  assert.equal(harness.calls[0].payload.token, 'raw-token');
  assert.equal(info.activation, true);

  await harness.service.setPasswordWithLink('raw-token', ' my password ');
  assert.equal(harness.calls[1].url, '/auth/password/set');
  assert.equal(harness.calls[1].payload.token, 'raw-token');
  assert.equal(harness.calls[1].payload.newPassword, ' my password ');

  await harness.service.requestPasswordReset(' User@EXAMPLE.COM ');
  assert.equal(harness.calls[2].url, '/auth/password/forgot');
  assert.equal(harness.calls[2].payload.email, ' User@EXAMPLE.COM ');

  harness.fail({ response: { status: 400, data: { error: 'INVALID_PASSWORD_LINK' } } });
  await assert.rejects(harness.service.checkPasswordLink('used'), error => error.invalidLink === true);
  await assert.rejects(harness.service.setPasswordWithLink('used', 'password123'), error => error.invalidLink === true);
  harness.fail({ response: { status: 400, data: { error: 'VALIDATION_FAILED' } } });
  await assert.rejects(harness.service.setPasswordWithLink('ok', 'short'),
    error => error.invalidLink === false && /ít nhất 8 ký tự/.test(error.message));
  for (const outage of [{ message: 'Network Error' }, { response: { status: 503, data: {} } }]) {
    harness.fail(outage);
    await assert.rejects(harness.service.checkPasswordLink('ok'), error => error.invalidLink === false);
    await assert.rejects(harness.service.setPasswordWithLink('ok', 'password123'), error => error.invalidLink === false);
    await assert.rejects(harness.service.requestPasswordReset('a@example.com'), /thử lại/);
  }
  assert.equal(harness.stored.size, 0);
});

test('stored session without email does not manufacture one', () => {
  const { service, stored } = loadService();
  stored.set('aives_auth_session', JSON.stringify({
    id: 'legacy', username: 'legacy', fullName: 'Legacy', role: 'ADMIN',
  }));
  assert.equal(service.getCurrentSession().email, '');
});
