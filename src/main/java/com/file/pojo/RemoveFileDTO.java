package com.file.pojo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.util.List;

@Data
@ApiModel("批量删除文件或者文件夹的传输对象")
public class RemoveFileDTO {
    @ApiModelProperty("存储桶名称")
    private String bucketName;

    @ApiModelProperty("前缀")
    private String prefix;

    @ApiModelProperty("文件、文件夹列表")
    private List<String> files;
}
