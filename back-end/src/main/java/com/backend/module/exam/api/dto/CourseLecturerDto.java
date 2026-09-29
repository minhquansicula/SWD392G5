package com.backend.module.exam.api.dto;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CourseLecturerDto {
    private UUID lecturerId;
    private OffsetDateTime assignedAt;
    private UUID assignedById;
}
