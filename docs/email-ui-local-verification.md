# Email UI: môi trường local và kiểm chứng

## Môi trường đã chuẩn bị

- PostgreSQL 18.6 tại `127.0.0.1:5432`.
- Database riêng: `aives_email_ui_local_20261009`, owner `postgres`, schema `public`, UTF8, locale C/C.
- 9 bảng ứng dụng và bảng Flyway history; baseline 4, V5 đã apply, current 5, không pending/failed.
- Kiểm tra catalog đạt: 10 bảng, 21 index, 16 FK và delete action; constraint V5 enforced; canonical nullable, không default, collation C.
- Database được giữ lại, bao gồm dữ liệu giả được tạo trong các lượt kiểm thử. Không chạy lại Bootstrap trên database đã tồn tại.

Fixture local được tạo riêng từ `database/db_final.sql`: giữ các bảng, CHECK, PK, UNIQUE, FK và index không trùng; chỉ bỏ các lệnh tạo lại index của constraint, câu tạo public và phần history để Flyway quản lý. File gốc không được chỉnh sửa trong công việc này.

## Tài khoản seed

| Username nội bộ | Role | Email đăng nhập |
| --- | --- | --- |
| local_admin | ADMIN | admin.local@example.test |
| local_lecturer | LECTURER | lecturer.local@example.test |
| local_student | STUDENT | student.local@example.test |
| local_legacy | STUDENT | Chưa có email; fixture legacy, không đăng nhập bằng username |

Mật khẩu fixture là mật khẩu thử nghiệm đã thống nhất ở bước bootstrap. Runner dùng BCrypt và `EmailNormalizer` của ứng dụng; dữ liệu account thật không được sao chép.

## Khởi động

Runner và các artifact local nằm tại:

```text
C:\Users\dat\AppData\Local\Temp\opencode
```

### Terminal 1: backend

```powershell
& 'C:\Users\dat\AppData\Local\Temp\opencode\LocalEmailUi.ps1' -Mode Backend
```

Runner xác nhận datasource local và Flyway history bằng kết nối read-only trước startup. Spring Boot dùng bean datasource local không có password property, xác thực qua passfile `C:\Users\dat\AppData\Local\opencode-auth-it.pgpass`; nội dung passfile không được in.

Cấu hình chạy nằm trong `email-ui-local.yml`: Flyway disabled, Hibernate validate, SQL/bind logging off, bind `127.0.0.1:8080`, CORS `http://localhost:5173`. JWT signing key được sinh trong bộ nhớ mỗi lần khởi động, không ghi file/log. Vì thế phiên của lần chạy trước sẽ cần đăng nhập lại sau khi backend restart.

Wrapper lấy dependency classpath từ report `AuthServiceTest` đã tạo bởi lệnh test bên dưới; `back-end/target/classes` phải tồn tại.

### Terminal 2: frontend, mở tại thư mục front-end

```powershell
$env:VITE_API_URL = 'http://localhost:8080/api'
npm run dev -- --host localhost --port 5173 --strictPort
```

Mở `http://localhost:5173`. Đây là cấu hình theo process, không chỉnh endpoint ứng dụng trong file cấu hình.

### Dừng

Nhấn `Ctrl+C` trong từng terminal backend/frontend. Database được giữ lại. Harness tự dừng các process thử nghiệm do nó tạo sau khi hoàn tất.

## Lệnh kiểm chứng

Tại `back-end`:

```powershell
mvn -o "-Dtest=EmailNormalizerTest,AuthServiceTest,AuthControllerTest,EmailLoginHttpTest,AdminEmailFlowTest" test
```

Tại `front-end`:

```powershell
node --test tests/emailLogin.test.mjs tests/adminUserEmail.test.mjs tests/session.test.mjs
.\node_modules\.bin\tsc.cmd --noEmit
npm run build
```

Browser/API harness, chỉ chạy khi port 8080/5173/9222 rảnh:

```powershell
node 'C:\Users\dat\AppData\Local\Temp\opencode\email-ui-browser-check.mjs'
```

Harness dùng Chrome profile riêng và Node/CDP, không thêm dependency dự án. Mỗi lần chạy tạo thêm account giả với tên duy nhất trong DB local và giữ lại dữ liệu; không gọi Bootstrap, DROP hoặc DELETE.

## Kết quả

- Backend focused tests: 40 pass.
- Frontend tests: 24 pass, bao gồm 401, network/5xx, cache account isolation, logout và GET cũ hoàn tất sau PUT.
- TypeScript và Vite build pass.
- Browser/API: 12 nhóm kiểm tra pass; email-only login, real /me, reload giữ phiên, phân quyền ba role, tạo/sửa email, đổi role, account legacy và XLSX batch.
- Import kiểm chứng: tạo 1/bỏ qua 4; tạo 0/bỏ qua 5; tạo 1/bỏ qua 0. Kết quả giữ mở để đọc; password thiếu cột và password supplied được phân biệt.
- Fault injection tại Chrome cho /me 503, lỗi mạng và 401 được ghi rõ là mô phỏng; các luồng còn lại dùng backend/PostgreSQL thật.
- /me network/503 giữ credentials nhưng ẩn nội dung bảo vệ, retry phục hồi. /me 401 reset phiên. Không đọc token từ browser để làm bằng chứng.
- Viewport 320/768/1024/1440 không gây page overflow; overlay import được kiểm tra bám viewport trên danh sách dài.
- Không có uncaught exception hoặc application console error/warning trong lượt browser cuối. HTTP lỗi chủ đích được ghi riêng.

Bằng chứng cuối:

```text
C:\Users\dat\AppData\Local\Temp\opencode\email-ui-evidence-1791535277448
```

`results.json` chỉ lưu method/path/status và boolean xác thực; không lưu request/response body hay giá trị Authorization. Screenshot có kết quả import, màn hình quyền và trạng thái /me lỗi. Log process được lọc; không log Axios error object chứa credentials.

## Các sửa wiring

- App xác nhận identity/role qua /me trước khi render nội dung bảo vệ; lỗi hạ tầng có retry.
- 401 xóa profile ở cả hai storage, token và cache; App lắng nghe event unauthorized.
- Cache tách theo Authorization và generation, invalidation khi logout/login/401/mutation; response cũ không nạp lại cache sau PUT hoặc account switch.
- Email hiển thị trong bảng user, form được gắn label và mật khẩu tạo mới được che.
- Import thành công toàn bộ không tự đóng modal.
- Animation tab không giữ transform/fill-mode sau khi kết thúc, tránh làm modal fixed lệch khỏi viewport trên bảng dài.

Không thay contract API, chính sách email hay cấu hình DB ứng dụng. Migration Neon đang tạm dừng; không truy cập Neon trong công việc này.

## Cảnh báo còn lại

- Vite cảnh báo chunk JS lớn hơn 500 kB.
- Backend cảnh báo serialization PageImpl; response hiện tại được kiểm chứng tương thích FE. Không đổi pagination contract để xử lý cảnh báo này.

Các cảnh báo không chặn các luồng email đã kiểm chứng; không tuyên bố đã kiểm thử toàn bộ hệ thống thi/AI.
