package com.file.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;

import java.io.Serial;
import java.time.LocalDateTime;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 用户表
 * </p>
 *
 * @author jasper
 * @since 2025-02-24
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("user")
public class User implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 用户id
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 邮箱
     */
    private String email;

    /**
     * 盐
     */
    private String salt;

    /**
     * string加密后的base64编码
     */
    private String password;

    /**
     * 存储空间大小，单位为MB，默认为1024
     */
    private Integer storeSize;

    /**
     * 用户是否注销
     */
    private Boolean deleted;

    /**
     * 创建时间
     */
    private LocalDateTime createDate;

    /**
     * 注销时间
     */
    private LocalDateTime deleteDate;
}
