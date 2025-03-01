package com.file.pojo;

import lombok.Data;

@Data
public class MinObjDTO {
    private Long fileId;

    private String bucketRealName;

    private String path;

    private String name;
}
