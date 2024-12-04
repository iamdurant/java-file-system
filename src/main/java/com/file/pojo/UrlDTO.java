package com.file.pojo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel("获取url方法传参实体")
public class UrlDTO {
    @ApiModelProperty("存储桶")
    private String bucketName;

    @ApiModelProperty("前缀")
    private String prefix;

    @ApiModelProperty("文件名")
    private String name;
}
