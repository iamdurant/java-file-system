package com.file.entity;

import com.baomidou.mybatisplus.annotation.TableField;
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
 * 存储桶表
 * </p>
 *
 * @author jasper
 * @since 2025-02-26
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("bucket")
public class Bucket implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 存储桶id
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * minio存储桶名称
     */
    @TableField("bucket_real_name")
    private String bucketRealName;

    /**
     * 用户定义存储桶名称
     */
    @TableField("bucket_fake_name")
    private String bucketFakeName;

    /**
     * 创建时间
     */
    @TableField("create_date")
    private LocalDateTime createDate;

    /**
     * 更新时间
     */
    @TableField("update_date")
    private LocalDateTime updateDate;

    /**
     * 是否删除
     */
    @TableField("deleted")
    private Boolean deleted;

    /**
     * 存储桶所属用户id
     */
    @TableField("user_id")
    private Long userId;
}
