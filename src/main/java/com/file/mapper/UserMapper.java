package com.file.mapper;

import com.file.entity.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.file.pojo.StorageInfoVO;
import org.apache.ibatis.annotations.*;

/**
 * <p>
 * 用户表 Mapper 接口
 * </p>
 *
 * @author jasper
 * @since 2025-02-24
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {
    @Select("select used_size, max_store_size from user where id = #{userId}")
    @Results({
            @Result(property = "usedSize", column = "used_size", javaType = Long.class),
            @Result(property = "maxStoreSize", column = "max_store_size", javaType = Long.class)
    })
    StorageInfoVO queryUsedAndMaxById(@Param("userId") Long userId);

    @Update("update user set used_size = used_size + #{size} where id = #{userId}")
    void addStorageSize(@Param("userId") Long userId, @Param("size") Long size);
}
