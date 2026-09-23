package com.teststt;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Ứng dụng TestSTT — thử nghiệm Speech-to-Text với Groq Cloud API.
 *
 * DataSource/JPA exclusion đặt trong application.yaml vì Boot 4.x
 * đổi package auto-config classes.
 *
 * Chạy trên port 8081 để không xung đột với project chính (8080).
 */
@SpringBootApplication(excludeName = {
        "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
        "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration",
        "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
        "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
})
public class TestSttApplication {

    public static void main(String[] args) {
        SpringApplication.run(TestSttApplication.class, args);
    }

}
