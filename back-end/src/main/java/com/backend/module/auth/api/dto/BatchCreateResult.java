package com.backend.module.auth.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BatchCreateResult {
    private int total;
    private int created;
    private int skipped;
    private List<BatchRowResult> rows;
}
