# Email đăng nhập và MSSV

Từ migration `V7__use_email_and_student_code.sql`, tài khoản có ba định danh với mục đích riêng:

- `users.id` (UUID): khóa nội bộ, dùng trong JWT subject và các quan hệ lịch thi/điểm.
- `users.email` và `users.email_normalized`: địa chỉ đăng nhập, nhận link mật khẩu; email chuẩn hóa có ràng buộc duy nhất.
- `users.student_code`: MSSV, bắt buộc và duy nhất với `STUDENT`; `ADMIN` và `LECTURER` để `NULL`.

`username` không còn nằm trong API hay bảng `users`. Spring Security vẫn dùng tên phương thức `loadUserByUsername`, nhưng tham số của phương thức là UUID từ JWT.

## Triển khai

1. Kiểm tra mọi tài khoản có email và email chuẩn hóa, sinh viên có MSSV. Migration tự đổi MSSV rỗng của tài khoản không phải sinh viên thành `NULL`.
2. Triển khai backend mới cùng migration Flyway V7. V7 bỏ trigger đồng bộ cũ, thêm ràng buộc, đánh dấu admin hệ thống theo `username = 'admin'`, rồi xóa cột `username`.
3. Triển khai web/mobile mới cùng thời điểm. Sau thay đổi, đăng nhập gửi `{ "email": "...", "password": "..." }`; import sinh viên gửi `studentCode`, `fullName`, `email`.
4. Người dùng có JWT cũ cần đăng nhập lại, vì JWT subject cũ là `username` còn subject mới là UUID.

Không chạy riêng file SQL trên database đang phục vụ backend cũ; Flyway áp dụng khi backend mới khởi động. Nếu migration báo thiếu email hoặc MSSV, xử lý bản ghi được báo trước khi khởi động lại backend.
