/** Never put the access token in a WebSocket URL (URLs can be logged). */
export function getAiAccessToken(): string {
  let token: string | null = null;
  try { token = localStorage.getItem('accessToken'); } catch { /* Storage is unavailable. */ }
  if (!token) throw new Error('Phiên đăng nhập không khả dụng. Vui lòng đăng nhập lại trước khi sử dụng dịch vụ AI.');
  return token;
}
