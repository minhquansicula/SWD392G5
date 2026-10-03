# Spring Boot — Tài liệu luyện phỏng vấn

## Phạm vi

Dành cho sinh viên đã học Java, HTTP và SQL, ở mức cơ bản đến trung cấp. Bối cảnh là ứng dụng Spring Boot dùng Spring MVC, Spring Data JPA và cơ sở dữ liệu quan hệ. Không giả định ứng dụng dùng WebFlux hoặc microservices. Các ví dụ và tình huống dưới đây được biên soạn cho việc luyện tập; không phải đề thi chính thức.

Tài liệu tập trung vào cơ chế, cách giải thích và xử lý tình huống, không yêu cầu nhớ chính xác mọi import hay phiên bản thư viện. Khi hành vi phụ thuộc cấu hình, cần nêu giả định. Các mục tương ứng với sáu tiêu chí trong rubric đi kèm.

## 1. Spring Boot và cấu hình ứng dụng

### Kiến thức nền

Spring Framework cung cấp nền tảng như quản lý bean, dependency injection, web và transaction. Spring Boot hỗ trợ xây dựng ứng dụng Spring bằng cấu hình theo quy ước, dependency starters và auto-configuration.

Starter tập hợp dependency thường dùng cho một chức năng. Auto-configuration chọn cấu hình dựa trên điều kiện, chẳng hạn thư viện có trên classpath hoặc bean đã tồn tại. Đây không phải cơ chế tự đoán mọi yêu cầu nghiệp vụ. Nhiều cấu hình tự động có thể nhường chỗ cho bean do ứng dụng khai báo.

`@SpringBootApplication` kết hợp cấu hình ứng dụng, bật auto-configuration và component scanning. Vị trí package của lớp khởi động ảnh hưởng phạm vi component scan mặc định.

Cấu hình kết nối DB, cổng server hoặc timeout nên tách khỏi logic nghiệp vụ. Profile giúp chọn cấu hình theo môi trường; profile không tự bảo vệ bí mật. Mật khẩu và API key không nên đưa vào mã nguồn được chia sẻ.

### Tình huống phỏng vấn

Một service đặt ngoài cây package của lớp khởi động không được inject. Hướng phân tích là kiểm tra bean có được đăng ký và nằm trong phạm vi scan hay không, thay vì thêm ngẫu nhiên annotation.

Ứng dụng chạy được trên máy A nhưng lỗi trên máy B: cần so sánh cấu hình thực tế, biến môi trường, profile, DB và thông báo lỗi gốc.

Câu hỏi mở: Spring Boot giúp giảm những công việc gì khi xây dựng một REST API?

Câu hỏi đào sâu: Nếu đã có starter, vì sao ứng dụng vẫn có thể thiếu bean? Nếu tự khai báo bean, auto-configuration có còn tạo một bean giống hệt trong mọi trường hợp không?

## 2. IoC, dependency injection và bean

### Kiến thức nền

IoC chuyển việc quản lý đối tượng sang container. DI cung cấp dependency cho đối tượng thay vì để đối tượng tự tìm hoặc tự tạo mọi dependency. Bean là đối tượng do Spring container quản lý.

Constructor injection thể hiện rõ dependency bắt buộc và thuận tiện cho kiểm thử. Khi có nhiều bean cùng phù hợp, có thể cần `@Qualifier` hoặc `@Primary` để xác định lựa chọn.

Ví dụ tự biên soạn: `OrderService` nhận `PaymentGateway` qua constructor. Trong unit test, có thể truyền một gateway giả để mô phỏng thanh toán thất bại mà không gọi dịch vụ thật.

`new OrderService(...)` tạo đối tượng Java bình thường; đối tượng đó không tự có đầy đủ hành vi quản lý hoặc proxy của Spring.

Singleton mặc định của Spring được hiểu theo bean definition và container, không phải một đối tượng duy nhất trên toàn thế giới hoặc mọi JVM. Singleton cũng không đồng nghĩa với thread-safe.

### Tình huống phỏng vấn

Một service singleton lưu `currentUserId` trong field rồi dùng field đó khi xử lý request. Hai người dùng đồng thời có thể ghi đè dữ liệu của nhau. Dữ liệu riêng từng request nên đi qua tham số hoặc cơ chế có phạm vi phù hợp.

Câu hỏi mở: Vì sao constructor injection giúp kiểm thử dễ hơn?

Câu hỏi đào sâu: Nếu có hai implementation của `PaymentGateway`, Spring chọn thế nào? Nếu service chỉ có một instance, điều đó có bảo đảm các thao tác trên field an toàn khi chạy đồng thời không?

## 3. REST API, validation và xử lý lỗi

### Kiến thức nền

Controller tiếp nhận HTTP request và chuyển đổi dữ liệu vào/ra. Service tổ chức nghiệp vụ. Repository phụ trách truy cập dữ liệu. Đây là cách phân chia trách nhiệm; không phải mọi thao tác đơn giản đều bắt buộc có ba lớp chứa code giống nhau.

DTO định nghĩa dữ liệu của API. Entity biểu diễn dữ liệu được persistence quản lý. Tách DTO giúp kiểm soát trường được nhập/xuất và tránh gắn hợp đồng API quá chặt với mô hình lưu trữ.

Bean Validation có thể kiểm tra các ràng buộc như chuỗi không rỗng hoặc số dương. Với request body được cấu hình phù hợp, `@Valid` kích hoạt kiểm tra các constraint trên DTO. Không phải mọi quy tắc nghiệp vụ đều biểu diễn được bằng annotation validation.

Các mã HTTP thường gặp: 201 khi tạo tài nguyên thành công; 400 cho request không hợp lệ; 401 khi thiếu hoặc sai thông tin xác thực; 403 khi không được phép; 404 khi tài nguyên không tồn tại; 409 khi thao tác xung đột với trạng thái hiện tại.

Có thể dùng `@RestControllerAdvice` và `@ExceptionHandler` để thống nhất phản hồi lỗi. Không nên gửi stack trace hoặc bí mật kết nối DB cho client.

### Tình huống phỏng vấn

API tạo đơn nhận `quantity = -2`: kiểm tra cấu trúc đầu vào có thể chặn bằng constraint. Kiểm tra sản phẩm còn đủ hàng là nghiệp vụ và cần xử lý cạnh tranh ở DB, không chỉ kiểm tra DTO.

Nếu request gửi cả `userId` và giá sản phẩm, backend không nên mặc định tin đó là chủ đơn và giá thanh toán hợp lệ. Cần xác định người dùng từ ngữ cảnh xác thực và tính lại giá theo dữ liệu đáng tin cậy.

Câu hỏi mở: Một request tạo đơn đi qua controller, service và repository như thế nào?

Câu hỏi đào sâu: Vì sao không trả trực tiếp entity trong mọi API? Nếu tên trường hợp lệ nhưng người dùng sửa `userId` thành của người khác thì validation đã đủ chưa?

## 4. JPA và truy cập dữ liệu

### Kiến thức nền

JPA là đặc tả persistence; Hibernate là một implementation phổ biến; Spring Data JPA cung cấp abstraction repository trên nền JPA. Ba tên này không phải ba cách gọi của cùng một thành phần.

Spring Data JPA dùng `persist` hoặc `merge` trong `save`, tùy cách xác định entity mới. Với entity đang được quản lý trong persistence context, thay đổi có thể được phát hiện bằng dirty checking. `save` không đồng nghĩa SQL đã chạy ngay hoặc transaction đã commit. Flush đồng bộ thay đổi xuống DB nhưng cũng không đồng nghĩa commit.

Lazy loading trì hoãn việc lấy dữ liệu liên quan. Truy cập quan hệ chưa được nạp khi không còn persistence context phù hợp có thể gây lỗi. Cần chọn chiến lược truy vấn theo dữ liệu API thật sự cần.

N+1 là tình huống một truy vấn lấy danh sách rồi nhiều truy vấn tiếp theo lấy dữ liệu liên quan cho từng phần tử. Cần xem SQL thực tế để xác nhận. Fetch join, entity graph hoặc DTO projection có thể phù hợp tùy truy vấn; không có một lựa chọn tốt nhất cho mọi trường hợp.

### Tình huống phỏng vấn

Trang danh sách 20 đơn hàng hiển thị tên khách và sản phẩm. Nếu lặp qua từng đơn rồi truy cập các quan hệ lazy, số truy vấn có thể tăng mạnh. Cách xử lý nên bắt đầu bằng đo số truy vấn và xác định dữ liệu cần hiển thị.

Chuyển tất cả quan hệ sang eager không bảo đảm hết N+1 và có thể lấy thừa dữ liệu. Fetch collection cùng phân trang cũng cần xem xét kỹ hành vi truy vấn và kết quả.

Câu hỏi mở: Phân biệt JPA, Hibernate và Spring Data JPA.

Câu hỏi đào sâu: Vì sao gọi `save` rồi vẫn chưa thấy dữ liệu từ một kết nối khác? Tại sao trả entity có quan hệ lazy ra JSON có thể gây lỗi hoặc tạo nhiều SQL ngoài dự kiến?

## 5. Transaction và tính nhất quán

### Kiến thức nền

Transaction giúp nhóm thao tác DB thành một đơn vị nhất quán. Trong cấu hình proxy thông thường, `@Transactional` được áp dụng khi lời gọi đi qua proxy. Một method gọi trực tiếp method khác trên chính đối tượng không tự kích hoạt cấu hình transaction mới của method được gọi.

Theo mặc định thông thường, rollback xảy ra với `RuntimeException` và `Error`, không tự xảy ra cho mọi checked exception. Quy tắc rollback có thể được thay đổi bằng cấu hình. Bắt exception rồi không báo lỗi ra ngoài có thể khiến transaction tiếp tục commit, trừ khi đã bị đánh dấu rollback-only hoặc có lỗi khác.

Transaction DB không tự rollback email đã gửi hoặc khoản tiền đã trừ ở hệ thống bên ngoài. Cần thiết kế phối hợp, retry, idempotency hoặc bù trừ phù hợp.

### Tình huống phỏng vấn

Tạo đơn và trừ tồn kho nên có ranh giới nhất quán rõ ràng. Tuy nhiên, chỉ thêm `@Transactional` chưa đủ chống bán vượt tồn: hai transaction có thể cùng đọc số lượng 1 rồi cùng quyết định mua.

Một hướng giải quyết là cập nhật có điều kiện, ví dụ chỉ trừ khi tồn kho còn đủ rồi kiểm tra số dòng bị ảnh hưởng. Optimistic locking với version hoặc pessimistic locking cũng có thể phù hợp, tùy mức cạnh tranh và thiết kế.

Nếu client gửi lại yêu cầu tạo đơn sau timeout, backend cần phân biệt retry của cùng thao tác với một lần mua mới. Idempotency key và ràng buộc duy nhất có thể hỗ trợ; transaction đơn thuần không nhận biết ý định của client.

Câu hỏi mở: Nếu tạo đơn thành công nhưng trừ tồn kho thất bại, bạn muốn DB có trạng thái nào?

Câu hỏi đào sâu: Nếu hai người mua sản phẩm cuối cùng cùng lúc thì sao? Nếu đã gửi email rồi DB rollback thì email có tự biến mất không? Nếu gọi method `@Transactional` bằng `this.method()` thì điều gì cần kiểm tra?

## 6. Kiểm thử và chẩn đoán lỗi

### Kiến thức nền

Unit test kiểm tra một đơn vị logic với dependency được kiểm soát; không nhất thiết khởi động Spring. Integration test kiểm tra nhiều thành phần phối hợp, chẳng hạn mapping JPA với DB thật.

`@SpringBootTest` dùng cấu hình ứng dụng Spring Boot để tạo context; không mặc định luôn khởi động một HTTP server thật. Web test có thể kiểm tra mapping, validation, mã trạng thái và response. Repository test giúp phát hiện sai query, mapping hoặc constraint.

Mock repository giúp kiểm tra nhánh nghiệp vụ nhưng không chứng minh câu SQL hợp lệ trên PostgreSQL. Chọn cách kiểm thử theo loại lỗi cần phát hiện.

### Tình huống phỏng vấn

Với chức năng tạo đơn, các trường hợp đáng kiểm thử gồm: đủ tồn kho, thiếu tồn kho, số lượng không hợp lệ, người dùng không có quyền, lỗi khi ghi DB và retry cùng yêu cầu.

Khi API trả 500, cần xem exception gốc và log liên quan đến request, xác định lỗi thuộc đầu vào, nghiệp vụ, SQL hay cấu hình. Sửa bằng cách bắt mọi exception rồi trả 200 có thể che giấu lỗi và làm client hiểu nhầm.

Câu hỏi mở: Bạn sẽ kiểm thử chức năng tạo đơn như thế nào?

Câu hỏi đào sâu: Unit test với repository giả có phát hiện được tên cột sai không? Muốn kiểm chứng tranh chấp tồn kho thì một test chỉ chạy tuần tự có đủ không?

## Nguồn tham khảo chính thức

Các liên kết dùng để đối chiếu khái niệm; tình huống và câu hỏi là nội dung tự biên soạn. Tài liệu trực tuyến có thể thay đổi theo phiên bản.

- Auto-configuration: https://docs.spring.io/spring-boot/reference/using/auto-configuration.html
- Dependency injection: https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html
- Validation: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html
- Persisting entities: https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html
- Transaction annotations: https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html
- Testing: https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html
