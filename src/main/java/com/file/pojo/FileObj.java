package com.file.pojo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel("通用对象")
public class FileObj {
    @ApiModelProperty("通用名称: 文件名称、桶名称、文件夹名称")
    private String name;

    @ApiModelProperty("是否为文件")
    private boolean file;

    @ApiModelProperty("是否为文件夹")
    private boolean archive;

    @ApiModelProperty("是否为桶")
    private boolean bucket;

    @ApiModelProperty("文件类型")
    private String contentType;

    @ApiModelProperty("文件链接")
    private String url;

    @ApiModelProperty("文件目录前缀")
    private String prefix;

    @ApiModelProperty("桶名称")
    private String bucketName;

    @ApiModelProperty("桶真实名称")
    private String bucketRealName;

    @ApiModelProperty("文件修改时间")
    private String datetime;

    @ApiModelProperty("文件大小")
    private Long size;
}
