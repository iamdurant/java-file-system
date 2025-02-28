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
 * 文件夹表
 * </p>
 *
 * @author jasper
 * @since 2025-02-26
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("directory")
public class Directory implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 文件夹id
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 所属bucket id
     */
    private Long bucketId;

    /**
     * 所属user id
     */
    private Long userId;

    /**
     * 文件夹路径
     */
    private String path;

    /**
     * 文件夹创建时间
     */
    private LocalDateTime createDate;

    /**
     * 文件夹更新时间
     */
    private LocalDateTime updateDate;

    /**
     * 目录大小，单位：字节
     */
    private Long size;
}
