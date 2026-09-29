package com.backend.module.exam.core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
@Embeddable
public class CourseLecturerId implements Serializable {
    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "lecturer_id", nullable = false)
    private UUID lecturerId;
}
