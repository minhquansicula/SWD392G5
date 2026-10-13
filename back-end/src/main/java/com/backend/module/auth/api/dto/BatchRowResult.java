package com.backend.module.auth.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Outcome of one submitted row of a batch import, echoing what the client sent. */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BatchRowResult {
    public enum Status { CREATED, SKIPPED }

    // 1-based position in the submitted list.
    private int row;
    private String username;
    private String email;
    private Status status;
    // Null when the row was created.
    private BatchSkipReason reason;
    // Null when the row was skipped.
    private UserDto user;
}
