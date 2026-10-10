# Cấu hình gửi mail (link đặt mật khẩu)

Backend gửi mail qua Gmail SMTP khi ADMIN tạo tài khoản, import Excel, bấm "gửi lại link", và khi người dùng bấm "Quên mật khẩu". Mặc định backend gửi bằng hộp thư `datntse180352@fpt.edu.vn` (địa chỉ và App password đã có sẵn trong `application.yml`), nên **chạy lên là gửi được, không cần đặt gì**. Muốn gửi bằng hộp thư của mình thì đặt hai biến môi trường bên dưới; không cần sửa `application.yml`.

## Tóm tắt

| Biến môi trường | Bắt buộc | Ý nghĩa |
|---|---|---|
| `MAIL_PASSWORD` | Không | App password của hộp thư gửi. Mặc định là App password của hộp thư ở dòng dưới. |
| `MAIL_USERNAME` | Không | Hộp thư dùng để gửi. Mặc định `datntse180352@fpt.edu.vn`. |
| `MAIL_FROM` | Không | Địa chỉ hiện ở ô "Người gửi". Mặc định bằng `MAIL_USERNAME`. |
| `FRONTEND_BASE_URL` | Không | Địa chỉ frontend đặt trong link. Mặc định `http://localhost:5173`. |

`MAIL_USERNAME` và `MAIL_PASSWORD` phải thuộc **cùng một hộp thư**. Muốn gửi bằng mail của mình thì đặt cả hai; chỉ đặt một trong hai thì Gmail sẽ từ chối. Các bước 1 và 2 dưới đây chỉ dành cho trường hợp đó.

## Bước 1: tạo App password

Mật khẩu đăng nhập Gmail thường không dùng được; Gmail yêu cầu App password.

1. Đăng nhập hộp thư sẽ dùng để gửi (Gmail cá nhân hoặc mail `@fpt.edu.vn`).
2. Bật **Xác minh 2 bước** trong phần Bảo mật của tài khoản Google.
3. Mở https://myaccount.google.com/apppasswords, đặt tên (ví dụ `AIVES local`) và bấm tạo.
4. Chép chuỗi 16 ký tự, bỏ các dấu cách.

## Bước 2: đặt biến môi trường

Đặt một lần, dùng cho mọi lần chạy sau (Windows, PowerShell hoặc cmd):

```powershell
setx MAIL_USERNAME "dia-chi-cua-ban@gmail.com"
setx MAIL_PASSWORD "apppassword16kytu"
```

Sau đó **đóng terminal và mở terminal mới**; `setx` không áp dụng cho cửa sổ đang mở.

Chỉ đặt cho một lần chạy:

```powershell
# PowerShell
$env:MAIL_USERNAME = 'dia-chi-cua-ban@gmail.com'
$env:MAIL_PASSWORD = 'apppassword16kytu'
.\mvnw.cmd spring-boot:run
```

```bat
:: cmd
set MAIL_USERNAME=dia-chi-cua-ban@gmail.com
set MAIL_PASSWORD=apppassword16kytu
mvnw.cmd spring-boot:run
```

macOS / Linux:

```bash
export MAIL_USERNAME='dia-chi-cua-ban@gmail.com'
export MAIL_PASSWORD='apppassword16kytu'
./mvnw spring-boot:run
```

Khi deploy lên dịch vụ host, thêm hai biến này vào mục Environment Variables của dịch vụ, cạnh các biến `SPRING_DATASOURCE_*`.

## Bước 3: kiểm tra

1. Đăng nhập ADMIN, vào Quản lý người dùng, tạo một tài khoản với email thật của bạn.
2. Cột trạng thái hiện "Đã gửi link – chờ đặt mật khẩu" và hộp thư đó nhận được thư `[AIVES] Đặt mật khẩu cho tài khoản của bạn`.
3. Mở link trong thư, đặt mật khẩu, rồi đăng nhập bằng email đó.

## Khi mail không gửi được

| Dòng trong log backend | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Authentication failed` / `535` / `Username and Password not accepted` | App password sai, đã bị thu hồi, hoặc không thuộc hộp thư trong `MAIL_USERNAME` | Tạo App password mới cho đúng hộp thư |
| `534 5.7.9 Application-specific password required` | Đang dùng mật khẩu đăng nhập thường thay cho App password | Tạo App password theo Bước 1 |
| Đặt biến bằng `setx` rồi mà backend vẫn dùng giá trị cũ | Terminal tích hợp của IDE giữ biến môi trường từ lúc IDE mở | Đóng hẳn IDE rồi mở lại |
| `Could not connect to SMTP host` / timeout | Mạng chặn cổng 587 | Đổi sang mạng không chặn cổng 587 (ví dụ 4G) |
| Không có lỗi nhưng không thấy thư | Thư vào Spam, hoặc gõ sai địa chỉ nhận | Kiểm tra Spam; ADMIN sửa email rồi bấm "gửi lại link" |

Mail gửi lỗi không làm mất tài khoản: tài khoản vẫn được tạo với trạng thái "Chưa gửi được email", và ADMIN gửi lại được sau khi sửa cấu hình.

## Quy ước

- App password mặc định trong `application.yml` là của hộp thư `datntse180352@fpt.edu.vn`; mọi thư gửi bằng cấu hình mặc định đều đi từ hộp thư đó. Không đưa repo này lên nơi công khai khi mật khẩu còn trong file.
- App password của riêng bạn thì đặt bằng biến môi trường, không ghi thêm vào `application.yml`, tài liệu hay tin nhắn nhóm công khai.
- Các bài test tự động không gửi mail thật (`src/test/resources/application.properties` để trống mật khẩu).
- Lộ App password thì thu hồi ngay tại https://myaccount.google.com/apppasswords và tạo cái mới.
