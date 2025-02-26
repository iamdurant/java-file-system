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
 * 文件表
 * </p>
 *
 * @author jasper
 * @since 2025-02-26
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("file")
public class File implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 文件id
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 文件名称
     */
    private String name;

    /**
     * 文件大小(字节)
     */
    private Long size;

    /**
     * 文件哈希值
     */
    private String hashValue;

    /**
     * 指针，若是重复文件，则指向之前存在的file id
     */
    private Long pointer;

    /**
     * 所属bucket id
     */
    private Long bucketId;

    /**
     * 所属user id
     */
    private Long userId;

    /**
     * 所属文件夹_id
     */
    private Long directoryId;

    /**
     * 文件夹创建时间
     */
    private LocalDateTime createDate;

    /**
     * 文件夹更新时间
     */
    private LocalDateTime updateDate;
}
