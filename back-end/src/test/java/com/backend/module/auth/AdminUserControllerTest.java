package com.backend.module.auth;

import com.backend.module.auth.api.dto.CreateUserRequest;
import com.backend.module.auth.api.dto.UserDto;
import com.backend.module.auth.api.service.AdminUserService;
import com.backend.module.auth.core.controller.AdminUserController;
import com.backend.module.auth.core.enums.Role;
import com.backend.shared.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AdminUserControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AdminUserService adminUserService;

    @InjectMocks
    private AdminUserController adminUserController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminUserController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getUsers_Returns200() throws Exception {
        UserDto userDto = UserDto.builder()
                .id(UUID.randomUUID())
                .username("lecturer1")
                .fullName("Lecturer A")
                .role("LECTURER")
                .build();

        when(adminUserService.getUsers(any(), any())).thenReturn(new PageImpl<>(List.of(userDto), org.springframework.data.domain.PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].username").value("lecturer1"));
    }

    @Test
    void createUser_Returns201Created() throws Exception {
        CreateUserRequest request = CreateUserRequest.builder()
                .username("SE170002")
                .password("password123")
                .fullName("Le Thi B")
                .role(Role.STUDENT)
                .build();

        UserDto createdDto = UserDto.builder()
                .id(UUID.randomUUID())
                .username("SE170002")
                .fullName("Le Thi B")
                .role("STUDENT")
                .build();

        when(adminUserService.createUser(any(CreateUserRequest.class))).thenReturn(createdDto);

        mockMvc.perform(post("/api/admin/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("SE170002"));
    }

    @Test
    void deleteUser_Returns200() throws Exception {
        UUID id = UUID.randomUUID();
        doNothing().when(adminUserService).deleteUser(id);

        mockMvc.perform(delete("/api/admin/users/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
