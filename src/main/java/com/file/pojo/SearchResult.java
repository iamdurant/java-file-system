package com.file.pojo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel("搜索文件返回对象")
public class SearchResult {
    @ApiModelProperty("桶id")
    private String bucketName;

    @ApiModelProperty("桶真实名称")
    private String bucketRealName;

    @ApiModelProperty("前缀")
    private String prefix;

    @ApiModelProperty("文件名")
    private String fileName;

    @ApiModelProperty("文件最后修改日期")
    private String datetime;

    @ApiModelProperty("文件大小")
    private long size;
}
