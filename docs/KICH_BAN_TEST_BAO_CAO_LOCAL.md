# Kịch bản test Phản hồi & Báo cáo với Docker local

Tài liệu này dành cho nhánh `function6`, kiểm thử thủ công dữ liệu báo cáo, điểm giảng viên, thống kê và Excel. Bộ dữ liệu đi kèm là **dữ liệu mô phỏng**, không phải kết quả Gemini thật. Các bước chấm/xóa điểm sẽ thay đổi database local dành riêng cho bài test.

## Test nhanh: hai tài khoản xem cùng một sinh viên

Sau khi chạy các dịch vụ ở mục 1–2, dùng đúng kỳ thi **`TEST ĐỐI CHIẾU - Trần Thị Bình`**. Kỳ thi này chỉ có một ca, của `student@aives.edu.vn` / `Student@123`; giảng viên là `lecturer@aives.edu.vn` / `Lecturer@123`. Đăng nhập hai tài khoản ở hai trình duyệt khác nhau hoặc một cửa sổ thường và một cửa sổ riêng tư để tránh ghi đè phiên đăng nhập.

Trong cả hai trình duyệt, mở cùng đường dẫn sau sau khi đăng nhập:

```text
http://localhost:5173/#/analytics?exam=31000000-0000-0000-0000-000000000001&schedule=41000000-0000-0000-0000-000000000001
```

Lần khởi tạo mới, cả hai trang đều hiển thị **điểm cuối 7.00**; điểm AI của ba câu lần lượt `8`, `6`, `7`. Nếu bạn đã từng test và chỉnh sửa ca này, hệ thống giữ kết quả đã lưu, không tự reset.

1. Ở bảng điểm theo tiêu chí của giảng viên, nhập `9` vào ô điểm tiêu chí **Phân tích**, để trống các tiêu chí khác.
2. Bấm **Lưu điểm cuối cùng**. Điểm tổng là `8 × 35% + 9 × 35% + 7 × 30% = 8.05`.
3. Ở trang sinh viên, bấm **Làm mới**. Cùng ca hiển thị điểm `8.05`, tiêu chí Phân tích có điểm `9` và dòng “Giáo viên cho điểm”; các tiêu chí khác giữ điểm AI.
4. Có thể nhập nhận xét ở câu 2 và bấm **Lưu** tại câu đó; sinh viên bấm **Làm mới** để xem. Điểm câu hỏi không thay đổi điểm tổng rubric.
5. Xóa điểm tiêu chí Phân tích rồi bấm **Lưu điểm cuối cùng** để dùng lại điểm tổng AI `7.00`.

Nếu bạn đang dùng volume Docker được tạo trước khi có bộ dữ liệu đối chiếu này, từ thư mục gốc chạy hai lệnh dưới. Script chỉ thêm dữ liệu chưa có, không ghi đè điểm hay nhận xét đã lưu:

```powershell
docker compose -f compose.reporting-test.yml up -d
docker compose -f compose.reporting-test.yml exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d aives_reporting_local -f /docker-entrypoint-initdb.d/04_reporting_same_student.sql
```

Các kịch bản ở mục 3–4 bên dưới dùng một kỳ thi khác có **hai sinh viên** để test thống kê lớp; không so sánh điểm của hai sinh viên đó với nhau.

## 1. Chuẩn bị

- Cài Docker Desktop và bật Docker Engine, Java 17+, Maven, Node.js và Python 3.11+.
- Mở PowerShell tại thư mục gốc `SWD392G5`. Các lệnh dưới đây dùng PowerShell: giữ nguyên dấu `$env:` và `_`.
- Dùng đúng file `compose.reporting-test.yml`: PostgreSQL riêng chỉ nghe tại `127.0.0.1:55432`, database `aives_reporting_local`, user `postgres`, password `local_test_only`. Không dùng thông tin Neon cho bài test này.
- Đảm bảo cổng 55432, 8080, 8000, 5173 chưa bị chương trình khác chiếm. Dừng các tiến trình backend/Python cũ đang kết nối Neon trước khi bắt đầu.
- **Không chạy** `database/reset_docker_db.ps1`, `database/reset_docker_db.sh`, hoặc các lệnh xóa volume để thực hiện bài test này. Khởi tạo bằng Compose riêng bên dưới.

## 2. Chạy database và ứng dụng

Mở Docker Desktop; tại PowerShell ở thư mục gốc:

```powershell
docker compose -f compose.reporting-test.yml up -d
docker compose -f compose.reporting-test.yml ps
```

Chờ service `db` có trạng thái healthy. Lần đầu, Docker chạy schema, dữ liệu mẫu gốc và `database/fixtures/reporting-local.sql`. Dữ liệu được giữ trong volume riêng qua các lần dừng/chạy.

**Cửa sổ PowerShell 1 — Python:**

```powershell
cd python
$env:DATABASE_URL = "postgresql+psycopg://postgres:local_test_only@127.0.0.1:55432/aives_reporting_local"
$env:BACKEND_API_URL = "http://localhost:8080/api"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Nếu chưa có `.venv`, tạo bằng `py -3.12 -m venv .venv` và cài bằng `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`. Kiểm thử báo cáo mô phỏng **không cần Gemini API key**. Kiểm thử thi thật ở TC-09 cần đặt `$env:GEMINI_API_KEY` trong cửa sổ này trước khi chạy Python.

**Cửa sổ PowerShell 2 — Java**, bắt đầu từ thư mục gốc:

```powershell
cd back-end
$env:SPRING_PROFILES_ACTIVE = "local"
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://127.0.0.1:55432/aives_reporting_local"
$env:SPRING_DATASOURCE_USERNAME = "postgres"
$env:SPRING_DATASOURCE_PASSWORD = "local_test_only"
$env:PYTHON_SERVER_AUTO_START = "false"
mvn.cmd spring-boot:run
```

Không chọn profile `docker`: profile đó đang trỏ tới cổng 5432 của cấu hình khác. Flyway tự chạy các migration mới, gồm V8–V12; chờ log `Started BackEndApplication`. Dòng cảnh báo V8 nói `ai_report ... already exists, skipping` là bình thường với schema Docker mẫu.

**Cửa sổ PowerShell 3 — React**, bắt đầu từ thư mục gốc:

```powershell
cd front-end
npm.cmd install
npm.cmd run dev
```

Mở địa chỉ Vite in trên màn hình, thường là `http://localhost:5173`. Nếu có `front-end/.env.local`, kiểm tra `VITE_API_URL=http://localhost:8080/api` và `VITE_AI_API_URL=http://localhost:8000`; khởi động lại Vite sau khi sửa. Mở `http://localhost:8000/health`: cần `status: UP` và `database_connected: true`.

## 3. Tài khoản và dữ liệu sẵn có

| Vai trò | Email | Mật khẩu local | Mục đích |
|---|---|---|---|
| Admin | `admin@aives.edu.vn` | `Admin@123` | Kiểm tra quyền quản trị |
| Giảng viên phụ trách | `lecturer@aives.edu.vn` | `Lecturer@123` | Xem, sửa và xuất báo cáo |
| Sinh viên 1 | `student@aives.edu.vn` | `Student@123` | Xem ca hoàn thành, có thêm ca chờ để thi thật |
| Sinh viên 2 | `report.student2@aives.test` | `Student@123` | Kiểm tra quyền và thống kê lớp |

Các mật khẩu này chỉ dùng cho database local thử nghiệm. Mã sinh viên lần lượt là `SE180001` và `TEST002`.

Chọn kỳ thi **“Kỳ thi Vấn đáp: Kiến trúc Phần mềm (Đợt 1 - Đã hoàn thành)”**, môn `SWD392`. Trước khi sửa bất kỳ điểm nào:

| Dữ liệu | Giá trị ban đầu |
|---|---|
| Số ca hoàn thành / có điểm | 2 / 2 |
| Điểm tổng sinh viên 1 / sinh viên 2 | 8.85 / 6.20 |
| Số câu được giao cho mỗi sinh viên | 3 |
| Câu SOLID: điểm trung bình, tỷ lệ tốt | 7.93; 100% |
| Câu Monolith/Microservices | 7.00; 50% |
| Câu CAP/Saga | 3.50; 0% — khó nhất |
| Tỷ lệ trả lời tốt toàn kỳ thi | 50% (3/6 lượt đã chấm; ngưỡng ≥ 7/10) |
| Phân bố điểm | Một ca trong [6, 8), một ca trong [8, 10] |

Điểm câu SOLID của sinh viên 1 có sẵn điểm giảng viên `8.85`, thay cho điểm AI `9`. Các nhận xét/báo cáo trong seed có tính chất mô phỏng.

## 4. Kịch bản kiểm thử

Thực hiện TC-01 đến TC-06 theo thứ tự vì các bước sau phụ thuộc kết quả bước trước. Có thể ghi Đạt/Không đạt và ảnh chụp giao diện vào cột cuối.

| Mã | Vai trò và thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| TC-01 | Sinh viên 1 đăng nhập → **Kết quả** → chọn ca thi đã hoàn thành ở mục 3. | Thấy điểm lịch thi `8.85`, 3 câu hỏi; câu SOLID hiện điểm/nhận xét giảng viên, các câu chưa có đánh giá giảng viên dùng điểm/nhận xét AI. Bảng rubric có 3 tiêu chí AI. | ☐ Đạt ☐ Lỗi |
| TC-02 | Giảng viên đăng nhập → **Kết quả** → chọn kỳ thi hoàn thành → **Phân tích kỳ thi**. | Số ca, biểu đồ và bảng câu hỏi khớp mục 3; CAP/Saga đứng đầu, tỷ lệ tốt toàn kỳ thi 50%. | ☐ Đạt ☐ Lỗi |
| TC-03 | Về tab **Kết quả**, chọn sinh viên 1. Ở câu CAP/Saga, nhập nhận xét `Đã bổ sung ví dụ` và bấm **Lưu**. | Điểm và nhận xét AI vẫn hiện; điểm tổng vẫn `8.85`, trang không tải lại toàn bộ. Lịch sử ghi thay đổi. | ☐ Đạt ☐ Lỗi |
| TC-04 | Mở lại **Phân tích kỳ thi** sau TC-03. | Thống kê điểm không thay đổi: câu CAP/Saga trung bình `3.50`, tỷ lệ tốt `0%`; tỷ lệ tốt toàn kỳ thi `50%`. | ☐ Đạt ☐ Lỗi |
| TC-05 | Chọn lại ca sinh viên 1, nhập `8` vào điểm giảng viên của tiêu chí Phân tích và bấm **Lưu điểm cuối cùng**. | Điểm cuối `8.50` = 9 × 35% + 8 × 35% + 8.5 × 30%; điểm tổng AI vẫn `8.85`. | ☐ Đạt ☐ Lỗi |
| TC-06 | Đăng nhập lại sinh viên 1; vào **Kết quả**, chọn ca hoàn thành. | Thấy điểm tổng `8.50`, điểm AI `8.85`, điểm tiêu chí và nhận xét giảng viên. Không có ô sửa điểm. | ☐ Đạt ☐ Lỗi |
| TC-07 | Giảng viên → **Phân tích kỳ thi** → **Xuất bảng điểm (.xlsx)**. | Sheet `Summary` có hai sinh viên; sinh viên 1 có điểm tổng `8.50`, nguồn `Lecturer`. Sheet chi tiết có điểm tiêu chí giảng viên. | ☐ Đạt ☐ Lỗi |
| TC-08 | Ở ca sinh viên 1, xóa nhận xét tại câu CAP/Saga, xóa điểm tiêu chí Phân tích rồi bấm **Lưu điểm cuối cùng**. | Nhận xét câu trở lại AI; điểm tổng trở lại AI `8.85`; lịch sử có các lần xóa. | ☐ Đạt ☐ Lỗi |
| TC-09 | Sinh viên 1 vào **Kỳ thi**, chọn ca `PENDING` của kỳ thi chưa hoàn thành → **Chuẩn bị & Vào thi** → bật mic → trả lời → **Kết thúc & Chấm điểm**. | Ca chuyển `IN_PROGRESS` rồi `COMPLETED`; transcript lưu theo câu. Báo cáo AI chỉ có điểm tổng khi tất cả tiêu chí có bằng chứng hợp lệ. Cần Gemini key, quota, mạng và micro. | ☐ Đạt ☐ Lỗi |
| TC-10 | Sinh viên 2 mở **Kết quả** và thử truy cập URL/API chấm điểm của giảng viên. | Chỉ xem ca của mình; API `/api/lecturer/...` từ tài khoản sinh viên bị từ chối `403`. | ☐ Đạt ☐ Lỗi |

Ca chờ của sinh viên 1 mở trong **7 ngày từ lúc khởi tạo volume**. Sau thời điểm đó, tạo kỳ thi/ca thử mới trong giao diện. Không chấm lại ca mô phỏng chỉ để kiểm tra báo cáo: chạy AI có thể thay đổi dữ liệu mẫu.

Điểm cuối được tính khi giảng viên bấm **Lưu điểm cuối cùng**: mỗi tiêu chí dùng điểm giảng viên nếu có, nếu không dùng điểm AI; nhân điểm với trọng số rubric rồi cộng lại. Nếu không nhập điểm giảng viên ở tiêu chí nào, hệ thống dùng điểm tổng AI. Nhận xét và điểm theo câu được lưu riêng, không tự thay đổi điểm tổng rubric.

Để thực hiện phần API của TC-10: đăng nhập sinh viên 2 tại frontend local, mở DevTools → Console và chạy đoạn dưới. Chỉ kiểm tra tại máy local; không sao chép token hoặc kết quả đăng nhập vào báo cáo.

```javascript
fetch('http://localhost:8080/api/lecturer/schedules/40000000-0000-0000-0000-000000000003/grade', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  body: JSON.stringify({ score: 9 })
}).then(response => console.log('HTTP status:', response.status));
```

Kết quả mong đợi `HTTP status: 403`; nếu là `401`, hãy kiểm tra lại phiên đăng nhập sinh viên trước khi kết luận về phân quyền.

## 5. Đối chiếu database local

Chạy trong PowerShell tại thư mục gốc; các lệnh dưới đây chỉ đích danh database trong Compose thử nghiệm:

```powershell
docker compose -f compose.reporting-test.yml exec db psql -U postgres -d aives_reporting_local -c "SELECT version, success FROM flyway_schema_history ORDER BY installed_rank;"
docker compose -f compose.reporting-test.yml exec db psql -U postgres -d aives_reporting_local -c "SELECT id, status, final_score, lecturer_total_score, lecturer_total_pending FROM exam_schedules WHERE id IN ('40000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000004') ORDER BY id;"
docker compose -f compose.reporting-test.yml exec db psql -U postgres -d aives_reporting_local -c "SELECT question_id, ai_score, lecturer_score, lecturer_feedback FROM question_results WHERE exam_schedule_id='40000000-0000-0000-0000-000000000003' ORDER BY question_id;"
docker compose -f compose.reporting-test.yml exec db psql -U postgres -d aives_reporting_local -c "SELECT question_id, lecturer_name, old_score, new_score, changed_at FROM lecturer_grading_history WHERE exam_schedule_id='40000000-0000-0000-0000-000000000003' ORDER BY changed_at DESC;"
```

Flyway phải có V8–V12 thành công sau khi Java khởi động. `final_score` là điểm AI; `lecturer_total_score` là điểm tính sau đánh giá giảng viên. Nếu `lecturer_total_pending` là `true`, điểm tổng giảng viên cũ được giữ lại nhưng chưa hiển thị làm điểm cuối cùng. Nhật ký chỉ xuất hiện sau khi thực hiện lưu/xóa.

## 6. Dừng, tạo bộ dữ liệu mới và xử lý lỗi

- Dừng React, Python và Java bằng `Ctrl+C` ở từng cửa sổ. Dừng database bằng `docker compose -f compose.reporting-test.yml down`; volume và dữ liệu vẫn được giữ lại.
- Muốn một bộ dữ liệu mới mà **không xóa bộ cũ**, dừng stack rồi dùng một project name mới cho **mọi lệnh Compose**, ví dụ `docker compose -p aives-reporting-run2 -f compose.reporting-test.yml up -d`. Vì cùng dùng cổng 55432, stack cũ phải dừng trước. Seed chỉ chạy khi volume của project mới được tạo lần đầu.
- Cổng 55432 bị chiếm: dừng ứng dụng đang chiếm cổng hoặc đổi mapping trong Compose **và** hai URL Java/Python cho khớp.
- Python `/health` báo `DEGRADED`: kiểm tra container healthy và `DATABASE_URL` trong đúng cửa sổ Python. Nếu backend báo `localhost:5432`, kiểm tra lại bốn biến `$env:SPRING_...` ở cửa sổ Java.
- Đăng nhập sai: kiểm tra đã mở đúng frontend/backend local, và volume có phải dữ liệu khởi tạo mới không. Hệ thống không đặt lại mật khẩu tài khoản đã tồn tại.
- Thi thật báo lỗi Gemini: kiểm tra API key, quyền dùng model Live/JSON, kết nối và quota. Chức năng báo cáo mô phỏng TC-01–TC-08 không cần Gemini.
- Excel đang bám bố cục mẫu tham khảo; cần đối chiếu lại file xuất với mẫu chính thức của trường. Học kỳ và ngưỡng đậu `5/10` hiện được suy ra/cấu hình trong mã.
