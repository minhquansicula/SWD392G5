package com.backend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import com.backend.support.PostgresSpringTest;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "EXAM_TEST_DATABASE_URL", matches = ".+")
class BackEndApplicationTests extends PostgresSpringTest {

    @Test
    void contextLoads() {
    }

}
