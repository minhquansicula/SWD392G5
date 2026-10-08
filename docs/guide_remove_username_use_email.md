# HƯỚNG DẪN MIGRATION: XÓA CỘT `username` & DÙNG `email` LÀM ĐỊNH DANH DUY NHẤT (PHƯƠNG ÁN 2)

> **Mục tiêu:** Loại bỏ hoàn toàn cột `username` khỏi Database, chuẩn hoá trường định danh người dùng trong hệ thống AIVES sang `email` FPT (`@fpt.edu.vn`).  
> **Người thực hiện:** Thành viên phụ trách Backend & Web Frontend.  
> **Trạng thái chuẩn bị (Phase 1):**  
> - Đã cập nhật dữ liệu trên Database: mọi tài khoản đều đã có `email` đầy đủ và đồng bộ `username = email`.
> - Ứng dụng Mobile đã chuyển đổi sang sử dụng `email` làm trường chính.

---

## 1. Các bước thực hiện trên Database (PostgreSQL)

Khi Backend đã sẵn sàng nhận code mới, chạy script SQL sau trên database:

```sql
-- 1. Xóa Trigger và Function đồng bộ tạm thời (được tạo ở Phase 1)
DROP TRIGGER IF EXISTS trg_sync_user_email_username ON users;
DROP FUNCTION IF EXISTS sync_user_email_username();

-- 2. Xóa ràng buộc UNIQUE cũ của username nếu còn
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;

-- 3. Xóa hoàn toàn cột username
ALTER TABLE users DROP COLUMN IF EXISTS username;

-- 4. Đảm bảo ràng buộc trên cột email
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
END $$;
```

> **Lưu ý cập nhật các file kịch bản SQL trong thư mục `database/`:**
> - `database/scriptDB.sql`: Xóa dòng `username VARCHAR(255)` trong bảng `users`.
> - `database/db_final.sql`: Xóa dòng `"username" varchar(255),` và index liên quan.
> - `database/db_schema_updated.sql`: Xóa dòng `username VARCHAR(255)`.

---

## 2. Các file Backend cần cập nhật (`back-end/`)

Do Spring Boot đang bật `hibernate.ddl-auto: validate`, Backend cần cập nhật đồng bộ các vị trí sau trước khi restart server:

### 2.1. Entity: `com.backend.module.auth.core.entity.User`
- **File:** `back-end/src/main/java/com/backend/module/auth/core/entity/User.java`
- **Thay đổi:**
  - Xóa trường `username`:
    ```java
    // XÓA ĐOẠN NÀY:
    // @Size(max = 255)
    // @NotNull
    // @Column(name = "username", nullable = false, unique = true)
    // private String username;
    ```
  - Cập nhật trường `email` thành `nullable = false, unique = true`:
    ```java
    @Size(max = 255)
    @NotNull
    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;
    ```

### 2.2. Repository: `com.backend.module.auth.core.repository.UserRepository`
- **File:** `back-end/src/main/java/com/backend/module/auth/core/repository/UserRepository.java`
- **Thay đổi:**
  - Đổi method `findByUsername` -> `findByEmail`:
    ```java
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    ```
  - Cập nhật query tìm kiếm trong `@Query`:
    Thay `LOWER(u.username) LIKE ...` bằng `LOWER(u.email) LIKE ...`.

### 2.3. DTOs: `LoginRequest`, `CreateUserRequest`, `UserDto`
- **`LoginRequest.java`:**
  - Đổi hoặc hỗ trợ trường `email`:
    ```java
    @NotBlank
    private String email;
    ```
- **`CreateUserRequest.java`:**
  - Đổi trường `username` thành `email` (với `@Email @NotBlank`).
- **`UserDto.java` & `UserDtoMapper.java`:**
  - Map `user.getEmail()` vào `UserDto`.

### 2.4. Services: `AuthService`, `CustomUserDetailsService`, `AdminUserService`
- **`CustomUserDetailsService.java`:**
  ```java
  @Override
  public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
      User user = userRepository.findByEmail(email)
              .orElseThrow(() -> new UsernameNotFoundException("Cannot find User with email: " + email));
      return CustomUserDetails.builder()
              .user(user)
              .username(user.getEmail()) // Spring Security principal name
              .password(user.getPasswordHash())
              .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
              .build();
  }
  ```
- **`AuthServiceImpl.java`:**
  - Logic đăng nhập: kiểm tra qua `userRepository.findByEmail(request.getEmail())`.
  - Logic lấy thông tin: `getCurrentUser(String email)`.
- **`AdminUserServiceImpl.java`:**
  - Kiểm tra tài khoản tồn tại: `userRepository.existsByEmail(email)`.
  - Cập nhật danh sách sắp xếp hợp lệ (`sortable`): đổi `"username"` thành `"email"`.
- **`JwtTokenProvider.java`:**
  - `generateToken(String email, ...)` và trích xuất `subject` là `email`.

---

## 3. Web Frontend (`front-end/`)

- **File:** `front-end/src/services/authService.ts`
  - Trong hàm `loginUser`: gửi payload `{ email, password }` (hoặc `{ username: email, email, password }`).
  - Trong `mapBackendUserToAccount`: gán `username = u.email`.
- Các màn hình quản trị tài khoản (User Management):
  - Form thêm / sửa người dùng: đổi trường nhập "Tên tài khoản (username)" thành "Email FPT".

---

## 4. Checklist kiểm thử sau khi hoàn tất
1. [ ] Chạy lệnh `mvn clean test-compile` không còn lỗi cú pháp liên quan đến `username`.
2. [ ] Khởi động Spring Boot Backend với `ddl-auto: validate` thành công, không bị lỗi schema validation.
3. [ ] Đăng nhập thành công trên Web Frontend bằng email FPT (ví dụ: `admin@fpt.edu.vn`, `studentuser2@fpt.edu.vn`).
4. [ ] Đăng nhập thành công trên Mobile Flutter app bằng email FPT.
5. [ ] Luồng tạo tài khoản mới từ trang Admin hoạt động bình thường, lưu trực tiếp vào trường `email`.
