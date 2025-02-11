package com.file.pojo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel
public class FileChunkVO {
    @ApiModelProperty("存储桶")
    private String bucketName;

    @ApiModelProperty("前缀")
    private String prefix;

    @ApiModelProperty("文件名")
    private String fineName;

    @ApiModelProperty("chunkIndex")
    private Long chunkIndex;
}
