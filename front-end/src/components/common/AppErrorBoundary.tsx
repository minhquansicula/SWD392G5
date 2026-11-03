import { Component, type ReactNode } from 'react';

/** Last-resort protection for render errors; never display exception details. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="min-h-screen bg-[var(--canvas)] p-6 text-[var(--ink)]">
      <section role="alert" className="ui-panel mx-auto mt-16 max-w-lg space-y-4 p-6">
        <h1 className="text-xl font-semibold">Không thể hiển thị trang</h1>
        <p>Đã xảy ra lỗi giao diện. Vui lòng tải lại trang. Nếu đang thi hoặc vừa lưu điểm, hãy kiểm tra trạng thái trước khi gửi lại yêu cầu.</p>
        <button type="button" className="ui-button ui-button-primary" onClick={() => window.location.reload()}>Tải lại trang</button>
      </section>
    </main>;
  }
}
