package com.file.common;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

@Data
@ApiModel("返回对象")
public class Result {
    @ApiModelProperty("请求是否成功")
    private Boolean success;

    @ApiModelProperty("请求结果描述")
    private String message;

    @ApiModelProperty("数据")
    private Object data;

    public static Result ok() {
        Result re = new Result();
        re.setSuccess(true);
        re.setMessage("请求成功");

        return re;
    }

    public static Result ok(Object data) {
        Result re = new Result();
        re.setSuccess(true);
        re.setMessage("请求成功");
        re.setData(data);

        return re;
    }

    public static Result fail(String mess) {
        Result re = new Result();
        re.setSuccess(false);
        re.setMessage(mess);

        return re;
    }
}
