package com.backend.module.exam.core.entity;

import com.backend.module.auth.core.entity.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "courses")
public class Course {
    @Id
    @ColumnDefault("gen_random_uuid()")
    @Column(name = "id", nullable = false)
    private UUID id;

    @Size(max = 50)
    @NotNull
    @Column(name = "course_code", nullable = false, length = 50)
    private String courseCode;

    @Size(max = 255)
    @NotNull
    @Column(name = "course_name", nullable = false)
    private String courseName;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "course_lecturers",
        joinColumns = @JoinColumn(name = "course_id"),
        inverseJoinColumns = @JoinColumn(name = "lecturer_id")
    )
    private Set<User> lecturers = new HashSet<>();
}