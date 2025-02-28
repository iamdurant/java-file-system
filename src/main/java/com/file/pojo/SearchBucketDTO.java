package com.file.pojo;

import lombok.Data;

@Data
public class SearchBucketDTO {
    private Long bucketId;

    private String bucketRealName;

    private String bucketFakeName;
}
