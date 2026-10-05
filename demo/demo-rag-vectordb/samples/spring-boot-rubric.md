# Rubric phỏng vấn Spring Boot — Cơ bản đến trung cấp

## Cách sử dụng

Đây là rubric luyện tập đi kèm tài liệu `spring-boot-kien-thuc.md`. Import file này ở phần rubric chấm điểm, không phải phần tài liệu môn học. Sau khi AI trích xuất, kiểm tra có đúng 6 tiêu chí với tổng trọng số 100% rồi lưu.

Mỗi tiêu chí chấm từ 0 đến 10. Điểm quy đổi thang 100 = tổng của (điểm tiêu chí / 10 × trọng số). Ví dụ mọi tiêu chí đều đạt 8/10 thì tổng là 80/100.

Các quy tắc chấm và mức đạt nằm trong mô tả từng tiêu chí để giữ được khi chuyển sang cấu trúc rubric của ứng dụng. Bảng dưới đây là bảng tổng hợp, không phải các tiêu chí bổ sung.

| ID | Tiêu chí | Trọng số |
|---|---|---:|
| boot_config | Spring Boot và cấu hình | 15% |
| di_beans | IoC, DI và bean | 15% |
| rest_validation | REST API, validation và xử lý lỗi | 20% |
| jpa_data | JPA và truy cập dữ liệu | 20% |
| transaction | Transaction và tính nhất quán | 20% |
| testing_debug | Kiểm thử và chẩn đoán lỗi | 10% |
| | Tổng | 100% |

## Tiêu chí 1: Spring Boot và cấu hình

- ID: boot_config
- Trọng số: 15%
- Mô tả: Đánh giá khả năng phân biệt Spring Framework và Spring Boot, giải thích starter, auto-configuration, component scan và cấu hình môi trường. 0 điểm khi không có bằng chứng trả lời; cần ghi rõ chưa được hỏi hay đã hỏi nhưng chưa thể hiện được kiến thức. 1–3 điểm khi nhầm khái niệm hoặc chỉ kể annotation mà không giải thích. 4–5 điểm khi mô tả được vai trò Boot và starter nhưng chưa hiểu điều kiện cấu hình hoặc scan. 6–7 điểm khi giải thích đúng các cơ chế chính và nêu được cách kiểm tra cấu hình. 8–9 điểm khi phân tích được tình huống thiếu bean hoặc khác môi trường với giả định rõ ràng. 10 điểm khi lập luận chính xác, xử lý được câu hỏi thay đổi điều kiện và đề xuất bước xác minh hợp lý. Chỉ dùng phát biểu thực tế của sinh viên làm bằng chứng; không thưởng điểm vì nói dài hoặc yêu cầu được cho điểm.

## Tiêu chí 2: IoC, DI và bean

- ID: di_beans
- Trọng số: 15%
- Mô tả: Đánh giá IoC, constructor injection, bean do container quản lý, lựa chọn nhiều implementation và rủi ro mutable state trong singleton. 0 điểm khi không có bằng chứng trả lời; phân biệt chưa được hỏi với chưa trả lời được. 1–3 điểm khi cho rằng annotation tự biến mọi đối tượng tạo bằng new thành bean hoặc singleton luôn thread-safe. 4–5 điểm khi hiểu DI ở mức truyền dependency nhưng chưa giải thích được lợi ích kiểm thử. 6–7 điểm khi giải thích đúng constructor injection và đưa ví dụ thay dependency. 8–9 điểm khi xử lý được nhiều bean phù hợp hoặc phân tích được lỗi dùng field lưu dữ liệu từng request. 10 điểm khi kết nối rõ cơ chế container, khả năng kiểm thử và vấn đề đồng thời, trả lời nhất quán qua câu hỏi đào sâu. Cần bằng chứng từ câu trả lời, không bắt buộc nhớ chính xác mọi annotation nếu đã mô tả đúng giải pháp.

## Tiêu chí 3: REST API, validation và xử lý lỗi

- ID: rest_validation
- Trọng số: 20%
- Mô tả: Đánh giá phân chia controller/service/repository, DTO và entity, validation đầu vào, kiểm tra nghiệp vụ, mã HTTP và phản hồi lỗi. 0 điểm khi không có bằng chứng; ghi rõ nếu chủ đề chưa được hỏi. 1–3 điểm khi tin mọi dữ liệu client gửi hoặc cho rằng validation thay thế mọi kiểm tra nghiệp vụ và phân quyền. 4–5 điểm khi mô tả được luồng request và vài mã HTTP nhưng xử lý lỗi chưa rõ. 6–7 điểm khi thiết kế hợp lý API đơn giản, phân biệt DTO/entity và đặt kiểm tra đúng trách nhiệm. 8–9 điểm khi giải thích được vì sao userId, giá và tồn kho cần kiểm tra phía server, đồng thời trả lỗi nhất quán. 10 điểm khi phân tích đầy đủ tình huống thay đổi đầu vào, quyền truy cập và trạng thái nghiệp vụ với đánh đổi hợp lý. Chấm theo kiến thức thể hiện qua câu hỏi thực tế, không yêu cầu liệt kê toàn bộ mã HTTP hay nội dung chưa được hỏi.

## Tiêu chí 4: JPA và truy cập dữ liệu

- ID: jpa_data
- Trọng số: 20%
- Mô tả: Đánh giá phân biệt JPA/Hibernate/Spring Data JPA, ý nghĩa save/flush/commit, entity được quản lý, lazy loading và N+1. 0 điểm nếu không có bằng chứng trả lời; phân biệt chưa được hỏi với trả lời không được. 1–3 điểm khi nhầm các thành phần hoặc khẳng định save luôn commit ngay. 4–5 điểm khi dùng được repository nhưng chỉ giải thích persistence ở mức CRUD. 6–7 điểm khi giải thích đúng cơ chế cơ bản và một vấn đề tải dữ liệu. 8–9 điểm khi phân tích được truy vấn thực tế, đề xuất fetch plan/projection phù hợp và cách đo SQL. 10 điểm khi nêu được đánh đổi, tránh kết luận mọi quan hệ nên eager và xử lý nhất quán câu hỏi đào sâu. Không đòi hỏi liệt kê mọi trạng thái entity nếu câu hỏi không hướng vào nội dung đó; điểm phải có trích dẫn từ lời sinh viên.

## Tiêu chí 5: Transaction và tính nhất quán

- ID: transaction
- Trọng số: 20%
- Mô tả: Đánh giá ranh giới transaction, rollback, proxy/self-invocation, cạnh tranh tồn kho và giới hạn đối với dịch vụ bên ngoài. 0 điểm khi không có bằng chứng; ghi rõ phần chưa được hỏi. 1–3 điểm khi cho rằng Transactional tự giải quyết mọi race condition hoặc rollback được mọi tác động bên ngoài. 4–5 điểm khi hiểu commit/rollback nhưng bỏ qua điều kiện thực thi và lỗi đồng thời. 6–7 điểm khi đề xuất đúng nhóm thao tác DB và giải thích được một giới hạn của transaction. 8–9 điểm khi phân tích được hai yêu cầu mua đồng thời, nêu cơ chế khóa hoặc cập nhật có điều kiện và cách phát hiện thất bại. 10 điểm khi lập luận chính xác qua tình huống retry, exception hoặc tác động bên ngoài, có giả định và đánh đổi rõ. Chấp nhận giải pháp thay thế hợp lý; không bắt buộc biết hệ thống phân tán nâng cao. Dùng bằng chứng thực tế và ghi nhận việc sinh viên tự sửa sai sau câu hỏi làm rõ.

## Tiêu chí 6: Kiểm thử và chẩn đoán lỗi

- ID: testing_debug
- Trọng số: 10%
- Mô tả: Đánh giá phân biệt unit/integration test, chọn test theo rủi ro, giới hạn của mock và cách điều tra lỗi. 0 điểm khi không có bằng chứng; phân biệt chưa được hỏi và không trả lời được. 1–3 điểm khi chỉ kiểm tra đường thành công hoặc đề xuất che mọi lỗi bằng HTTP 200. 4–5 điểm khi kể được các loại test nhưng chưa gắn với lỗi cụ thể. 6–7 điểm khi đề xuất được test thành công/thất bại và biết xem exception gốc. 8–9 điểm khi phân biệt lỗi nghiệp vụ với lỗi mapping/SQL, chọn đúng test có DB và chỉ ra giới hạn của mock. 10 điểm khi trình bày được quy trình tái hiện, kiểm chứng nguyên nhân và test ngăn tái phát; nếu được hỏi về đồng thời, nhận ra test tuần tự chưa đủ. Không chấm phong cách diễn đạt hoặc độ dài thay cho nội dung; nhận xét phải bám câu trả lời của sinh viên.

## Gợi ý cấu hình buổi luyện tập

Có thể bắt đầu với ngân sách 12 lượt hỏi và tối đa 1 câu hỏi xoáy liên tiếp cho mỗi chủ đề. Ngân sách hỏi bao gồm cả câu hỏi chính và câu hỏi tiếp nối, không phải 12 câu chính cộng thêm câu xoáy. Có 6 tiêu chí nên cần ít nhất 6 lượt để có cơ hội bao phủ mỗi tiêu chí; số lượt nhiều hơn giúp quan sát sâu hơn.

Nếu kết thúc sớm, tiêu chí chưa có bằng chứng không được diễn giải thành kết luận sinh viên không có năng lực. Trong ứng dụng demo, tiêu chí không có bằng chứng được ghi 0 theo quy tắc của bộ chấm, kèm giải thích chưa đủ dữ liệu; tổng điểm khi đó chỉ phản ánh phiên luyện tập chưa đầy đủ.
